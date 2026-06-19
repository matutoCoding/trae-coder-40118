import { create } from 'zustand'
import dayjs from 'dayjs'
import { GrainBatch, OutboundRecord, MerchantQuota, InspectionRecord } from '@/types'
import { mockBatches } from '@/data/batch'
import { mockOutboundRecords } from '@/data/outbound'
import { mockQuotas } from '@/data/quota'
import { mockInspections } from '@/data/inspection'
import { getCurrentQuarter } from '@/utils/helpers'

const WARNING_DAYS = 30

function calcBatchStatus(batch: GrainBatch): GrainBatch['status'] {
  const now = dayjs()
  const expiry = dayjs(batch.expiryDate)
  const warningDate = batch.warningDate ? dayjs(batch.warningDate) : expiry.subtract(WARNING_DAYS, 'day')
  if (batch.status === 'locked') return 'locked'
  if (now.isAfter(expiry) || now.isSame(expiry, 'day')) return 'expired'
  if (now.isAfter(warningDate) || now.isSame(warningDate, 'day')) return 'warning'
  return 'normal'
}

const MERCHANT_TEMPLATE = [
  { merchantId: 'M001', merchantName: '华东面业集团', baseQuota: 500 },
  { merchantId: 'M002', merchantName: '中粮饲料公司', baseQuota: 800 },
  { merchantId: 'M003', merchantName: '湘米加工厂', baseQuota: 300 },
  { merchantId: 'M004', merchantName: '北方粮贸公司', baseQuota: 600 },
  { merchantId: 'M005', merchantName: '丰源米业有限公司', baseQuota: 400 },
  { merchantId: 'M006', merchantName: '金龙粮油有限公司', baseQuota: 350 }
]

function buildQuotasForQuarter(year: number, quarter: string): MerchantQuota[] {
  return MERCHANT_TEMPLATE.map((m) => ({
    id: `Q${year}${quarter}_${m.merchantId}`,
    merchantId: m.merchantId,
    merchantName: m.merchantName,
    quarter,
    year,
    baseQuota: m.baseQuota,
    used: 0,
    approved: 0,
    unit: '吨',
    status: 'active' as const
  }))
}

function ensureQuotasExist(quotas: MerchantQuota[]): MerchantQuota[] {
  const { year, quarter } = getCurrentQuarter()
  const hasCurrentQuarter = quotas.some(
    (q) => q.year === year && q.quarter === quarter && q.status !== 'expired'
  )
  if (!hasCurrentQuarter) {
    const markedAsExpired = quotas.map((q) => {
      if (q.year === year && q.quarter === quarter && q.status !== 'expired') {
        return q
      }
      return { ...q, status: 'expired' as const }
    })
    const newQuotas = buildQuotasForQuarter(year, quarter)
    return [...markedAsExpired, ...newQuotas]
  }
  return quotas
}

interface GrainStore {
  batches: GrainBatch[]
  outboundRecords: OutboundRecord[]
  quotas: MerchantQuota[]
  merchants: Array<{ merchantId: string; merchantName: string; baseQuota: number }>
  inspections: InspectionRecord[]
  ensureCurrentQuarter: () => void
  addBatch: (batch: GrainBatch) => GrainBatch
  createOutbound: (
    merchantId: string,
    merchantName: string,
    totalQuantity: number
  ) => Promise<{ success: boolean; message: string; record?: OutboundRecord; needApply?: boolean }>
  getFifoBatches: () => GrainBatch[]
  getAvailableBatches: () => GrainBatch[]
  getBatchWithStatus: (batch: GrainBatch) => GrainBatch
  getBatchesWithComputedStatus: () => GrainBatch[]
  addInspection: (inspection: InspectionRecord) => void
  getMerchantQuota: (merchantId: string) => MerchantQuota | undefined
  getActiveQuotas: () => MerchantQuota[]
  getWarningBatches: () => GrainBatch[]
  getConsumptionByMerchant: (merchantId: string) => OutboundRecord[]
  applyQuota: (merchantId: string, applyAmount: number, reason: string) => Promise<boolean>
}

export const useGrainStore = create<GrainStore>((set, get) => {
  return {
    batches: mockBatches,
    outboundRecords: mockOutboundRecords,
    quotas: ensureQuotasExist(mockQuotas),
    merchants: MERCHANT_TEMPLATE,
    inspections: mockInspections,

    ensureCurrentQuarter: () => {
      set((state) => ({
        quotas: ensureQuotasExist(state.quotas)
      }))
    },

    addBatch: (batch) => {
      const computedBatch = { ...batch, status: calcBatchStatus(batch) }
      set((state) => ({ batches: [...state.batches, computedBatch] }))
      return computedBatch
    },

    createOutbound: (merchantId, merchantName, totalQuantity) => {
      return new Promise((resolve) => {
        const state = get()
        const ensuredQuotas = ensureQuotasExist(state.quotas)
        const { year, quarter } = getCurrentQuarter()
        const quota = ensuredQuotas.find(
          (q) => q.merchantId === merchantId && q.year === year && q.quarter === quarter && q.status !== 'expired'
        )

        if (!quota) {
          resolve({ success: false, message: '未找到该商户当前季度额度' })
          return
        }

        const totalAvailable = quota.baseQuota + (quota.approved || 0) - quota.used
        if (totalAvailable < totalQuantity) {
          resolve({
            success: false,
            message: `额度不足！本季剩余${totalAvailable}吨，请先申请追加额度`,
            needApply: true
          })
          return
        }

        const fifoList = state.getFifoBatches()
        const available = fifoList.reduce((sum, b) => sum + b.remainingQuantity, 0)
        if (available < totalQuantity) {
          resolve({ success: false, message: `库存不足！可用库存仅${available}吨` })
          return
        }

        const outboundDate = dayjs().format('YYYY-MM-DD')
        const existingLen = state.outboundRecords.length
        const outboundNo = `CK${dayjs().format('YYYYMMDD')}${String(existingLen + 1).padStart(3, '0')}`

        let remainingToDeduct = totalQuantity
        const newBatches = state.batches.map((b) => ({ ...b }))
        const affectedBatchInfos: Array<{ batchNo: string; deduct: number; grainType: string }> = []

        for (const batch of fifoList) {
          if (remainingToDeduct <= 0) break
          const idx = newBatches.findIndex((b) => b.id === batch.id)
          if (idx === -1) continue
          const b = newBatches[idx]
          const deduct = Math.min(b.remainingQuantity, remainingToDeduct)
          newBatches[idx] = {
            ...b,
            remainingQuantity: b.remainingQuantity - deduct
          }
          affectedBatchInfos.push({ batchNo: b.batchNo, deduct, grainType: b.grainType })
          remainingToDeduct -= deduct
        }

        const mainBatch = affectedBatchInfos[0]
        const grainTypes = [...new Set(affectedBatchInfos.map((i) => i.grainType))]

        const newRecord: OutboundRecord = {
          id: `OB${Date.now()}`,
          outboundNo,
          batchNo: mainBatch.batchNo,
          grainType: grainTypes.length === 1 ? grainTypes[0] : '多品种',
          merchantId,
          merchantName,
          quantity: totalQuantity,
          unit: '吨',
          outboundDate,
          status: 'completed',
          operator: '系统',
          quotaId: quota.id,
          remark: `FIFO出库：${affectedBatchInfos.map((i) => `${i.batchNo}扣${i.deduct}吨`).join('；')}`
        }

        const newQuotas = ensuredQuotas.map((q) => {
          if (q.id === quota.id) {
            const newUsed = q.used + totalQuantity
            const totalForQuota = q.baseQuota + (q.approved || 0)
            return {
              ...q,
              used: newUsed,
              status: newUsed >= totalForQuota ? ('exhausted' as const) : ('active' as const)
            }
          }
          return q
        })

        const otherQuotas = state.quotas.filter(
          (q) => !(q.year === year && q.quarter === quarter && q.status !== 'expired')
        )

        set({
          batches: newBatches,
          outboundRecords: [...state.outboundRecords, newRecord],
          quotas: [...otherQuotas, ...newQuotas]
        })

        console.info('[Store] createOutbound 成功:', { outboundNo, merchantId, totalQuantity, affectedBatchInfos })
        resolve({ success: true, message: '出库成功', record: newRecord })
      })
    },

    getFifoBatches: () => {
      const state = get()
      return state.batches
        .map((b) => state.getBatchWithStatus(b))
        .filter((b) => ['normal', 'warning'].includes(b.status) && b.remainingQuantity > 0)
        .sort((a, b) => dayjs(a.inboundDate).valueOf() - dayjs(b.inboundDate).valueOf())
    },

    getAvailableBatches: () => {
      return get().getFifoBatches()
    },

    getBatchWithStatus: (batch) => {
      const status = calcBatchStatus(batch)
      return { ...batch, status }
    },

    getBatchesWithComputedStatus: () => {
      const state = get()
      return state.batches.map((b) => state.getBatchWithStatus(b))
    },

    addInspection: (inspection) => {
      set((state) => ({ inspections: [...state.inspections, inspection] }))
    },

    getMerchantQuota: (merchantId) => {
      const state = get()
      const { year, quarter } = getCurrentQuarter()
      const quotas = ensureQuotasExist(state.quotas)
      return quotas.find(
        (q) => q.merchantId === merchantId && q.year === year && q.quarter === quarter && q.status !== 'expired'
      )
    },

    getActiveQuotas: () => {
      const state = get()
      const { year, quarter } = getCurrentQuarter()
      const quotas = ensureQuotasExist(state.quotas)
      return quotas.filter((q) => q.year === year && q.quarter === quarter)
    },

    getWarningBatches: () => {
      const state = get()
      return state.getBatchesWithComputedStatus().filter((b) => ['warning', 'expired', 'locked'].includes(b.status))
    },

    getConsumptionByMerchant: (merchantId) => {
      const state = get()
      return state.outboundRecords
        .filter((r) => r.merchantId === merchantId && r.status === 'completed')
        .sort((a, b) => dayjs(b.outboundDate).valueOf() - dayjs(a.outboundDate).valueOf())
    },

    applyQuota: (merchantId, applyAmount, reason) => {
      return new Promise((resolve) => {
        const state = get()
        const ensuredQuotas = ensureQuotasExist(state.quotas)
        const { year, quarter } = getCurrentQuarter()
        const quotaIdx = ensuredQuotas.findIndex(
          (q) => q.merchantId === merchantId && q.year === year && q.quarter === quarter && q.status !== 'expired'
        )
        if (quotaIdx === -1) {
          resolve(false)
          return
        }

        const newQuotas = [...ensuredQuotas]
        const quota = { ...newQuotas[quotaIdx] }
        quota.approved = (quota.approved || 0) + applyAmount
        if (quota.baseQuota + quota.approved > quota.used && quota.status === 'exhausted') {
          quota.status = 'active'
        }
        newQuotas[quotaIdx] = quota

        const otherQuotas = state.quotas.filter(
          (q) => !(q.year === year && q.quarter === quarter && q.status !== 'expired')
        )
        set({ quotas: [...otherQuotas, ...newQuotas] })
        resolve(true)
      })
    }
  }
})
