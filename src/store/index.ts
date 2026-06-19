import { create } from 'zustand'
import dayjs from 'dayjs'
import { GrainBatch, OutboundRecord, MerchantQuota, InspectionRecord, QuotaApplication, PlannedDeduction } from '@/types'
import { mockBatches } from '@/data/batch'
import { mockOutboundRecords } from '@/data/outbound'
import { mockQuotas } from '@/data/quota'
import { mockInspections } from '@/data/inspection'
import { getCurrentQuarter, getDaysLeft } from '@/utils/helpers'

const WARNING_DAYS = 30
const LARGE_OUTBOUND_THRESHOLD = 50

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

function computeFifoPlan(batches: GrainBatch[], totalQuantity: number): PlannedDeduction[] {
  const fifoList = batches
    .map((b) => ({ ...b, computedStatus: calcBatchStatus(b) }))
    .filter((b) => ['normal', 'warning'].includes(b.computedStatus) && b.remainingQuantity > 0)
    .sort((a, b) => dayjs(a.inboundDate).valueOf() - dayjs(b.inboundDate).valueOf())

  let remaining = totalQuantity
  const plan: PlannedDeduction[] = []
  for (const batch of fifoList) {
    if (remaining <= 0) break
    const deduct = Math.min(batch.remainingQuantity, remaining)
    plan.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      grainType: batch.grainType,
      warehouseNo: batch.warehouseNo,
      inboundDate: batch.inboundDate,
      expiryDate: batch.expiryDate,
      deductQuantity: deduct,
      unit: batch.unit
    })
    remaining -= deduct
  }
  return plan
}

function buildRiskHints(plan: PlannedDeduction[], quantity: number, quotaRemaining: number): string[] {
  const hints: string[] = []
  if (quantity >= LARGE_OUTBOUND_THRESHOLD) {
    hints.push(`大额出库（≥${LARGE_OUTBOUND_THRESHOLD}吨），请重点关注`)
  }
  const now = dayjs()
  for (const p of plan) {
    const daysLeft = dayjs(p.expiryDate).diff(now, 'day')
    if (daysLeft <= 30 && daysLeft > 0) {
      hints.push(`涉及临期批次${p.batchNo}，距到期仅剩约${daysLeft}天`)
    }
    if (daysLeft <= 0) {
      hints.push(`批次${p.batchNo}已超期，审核时请注意`)
    }
  }
  if (quotaRemaining - quantity < 50 && quotaRemaining - quantity > 0) {
    hints.push(`审批后该商户额度将仅剩${quotaRemaining - quantity}吨`)
  }
  return hints
}

interface GrainStore {
  batches: GrainBatch[]
  outboundRecords: OutboundRecord[]
  quotas: MerchantQuota[]
  merchants: Array<{ merchantId: string; merchantName: string; baseQuota: number }>
  inspections: InspectionRecord[]
  quotaApplications: QuotaApplication[]
  ensureCurrentQuarter: () => void
  addBatch: (batch: GrainBatch) => GrainBatch
  createOutbound: (
    merchantId: string,
    merchantName: string,
    totalQuantity: number
  ) => Promise<{ success: boolean; message: string; record?: OutboundRecord; needApply?: boolean }>
  reviewOutbound: (
    recordId: string,
    approved: boolean,
    reviewer: string,
    reviewRemark: string
  ) => Promise<{ success: boolean; message: string }>
  getFifoBatches: () => GrainBatch[]
  getAvailableBatches: () => GrainBatch[]
  getBatchWithStatus: (batch: GrainBatch) => GrainBatch
  getBatchesWithComputedStatus: () => GrainBatch[]
  addInspection: (inspection: InspectionRecord) => void
  getMerchantQuota: (merchantId: string) => MerchantQuota | undefined
  getActiveQuotas: () => MerchantQuota[]
  getWarningBatches: () => GrainBatch[]
  getConsumptionByMerchant: (merchantId: string) => OutboundRecord[]
  applyQuota: (merchantId: string, merchantName: string, applyAmount: number, reason: string) => Promise<boolean>
  reviewQuotaApplication: (appId: string, approved: boolean, reviewer: string, reviewRemark: string) => Promise<boolean>
  getPendingOutbound: () => OutboundRecord[]
  getPendingQuotaApplications: () => QuotaApplication[]
  getCompletedOutbound: () => OutboundRecord[]
}

export const useGrainStore = create<GrainStore>((set, get) => {
  return {
    batches: mockBatches,
    outboundRecords: mockOutboundRecords,
    quotas: ensureQuotasExist(mockQuotas),
    merchants: MERCHANT_TEMPLATE,
    inspections: mockInspections,
    quotaApplications: [],

    ensureCurrentQuarter: () => {
      set((state) => ({
        quotas: ensureQuotasExist(state.quotas)
      }))
    },

    addBatch: (batch) => {
      const now = dayjs()
      const expiry = dayjs(batch.expiryDate)
      let computedStatus = calcBatchStatus(batch)
      if (now.isAfter(expiry) || now.isSame(expiry, 'day')) {
        computedStatus = 'locked'
      }
      const computedBatch = { ...batch, status: computedStatus }
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

        const plannedDeductions = computeFifoPlan(state.batches, totalQuantity)
        if (plannedDeductions.length === 0 || plannedDeductions.reduce((s, p) => s + p.deductQuantity, 0) < totalQuantity) {
          resolve({ success: false, message: 'FIFO计划计算异常，可用库存不足' })
          return
        }

        const riskHints = buildRiskHints(plannedDeductions, totalQuantity, totalAvailable)
        const outboundDate = dayjs().format('YYYY-MM-DD')
        const existingLen = state.outboundRecords.length
        const outboundNo = `CK${dayjs().format('YYYYMMDD')}${String(existingLen + 1).padStart(3, '0')}A`

        const grainTypes = [...new Set(plannedDeductions.map((p) => p.grainType))]

        const newRecord: OutboundRecord = {
          id: `OB${Date.now()}`,
          outboundNo,
          batchNo: plannedDeductions[0].batchNo,
          grainType: grainTypes.length === 1 ? grainTypes[0] : '多品种',
          merchantId,
          merchantName,
          quantity: totalQuantity,
          unit: '吨',
          outboundDate,
          status: 'pending',
          operator: '当前用户',
          quotaId: quota.id,
          remark: '',
          plannedDeductions,
          actualDeductions: [],
          reviewDate: '',
          reviewer: '',
          reviewRemark: '',
          quotaOccupied: totalQuantity,
          riskHints
        }

        set((state) => ({
          outboundRecords: [...state.outboundRecords, newRecord],
          quotas: ensuredQuotas.map((q) => {
            if (q.id === quota.id) {
              const newUsed = q.used + totalQuantity
              return { ...q, used: newUsed }
            }
            return q
          })
        }))

        console.info('[Store] createOutbound 待审核:', { outboundNo, merchantId, totalQuantity })
        resolve({ success: true, message: '出库申请已提交，等待审核', record: newRecord })
      })
    },

    reviewOutbound: (recordId, approved, reviewer, reviewRemark) => {
      return new Promise((resolve) => {
        const state = get()
        const recordIdx = state.outboundRecords.findIndex((r) => r.id === recordId)
        if (recordIdx === -1) {
          resolve({ success: false, message: '出库单不存在' })
          return
        }
        const record = state.outboundRecords[recordIdx]
        if (record.status !== 'pending') {
          resolve({ success: false, message: '该出库单已审核' })
          return
        }

        const newRecords = [...state.outboundRecords]
        const now = dayjs().format('YYYY-MM-DD')

        if (approved) {
          let remainingToDeduct = record.quantity
          const newBatches = state.batches.map((b) => ({ ...b }))
          const actualDeductions: PlannedDeduction[] = []

          for (const plan of record.plannedDeductions) {
            if (remainingToDeduct <= 0) break
            const idx = newBatches.findIndex((b) => b.id === plan.batchId)
            if (idx === -1) continue
            const b = newBatches[idx]
            const deduct = Math.min(b.remainingQuantity, remainingToDeduct)
            newBatches[idx] = { ...b, remainingQuantity: b.remainingQuantity - deduct }
            actualDeductions.push({ ...plan, deductQuantity: deduct })
            remainingToDeduct -= deduct
          }

          newRecords[recordIdx] = {
            ...record,
            status: 'completed',
            actualDeductions,
            reviewDate: now,
            reviewer,
            reviewRemark,
            remark: `审核通过并出库：${actualDeductions.map((d) => `${d.batchNo}扣${d.deductQuantity}吨`).join('；')}`
          }

          const { year, quarter } = getCurrentQuarter()
          const newQuotas = ensureQuotasExist(state.quotas).map((q) => {
            if (q.id === record.quotaId) {
              const totalForQuota = q.baseQuota + (q.approved || 0)
              const usedAfterReview = q.used
              return {
                ...q,
                status: usedAfterReview >= totalForQuota ? ('exhausted' as const) : ('active' as const)
              }
            }
            return q
          })

          const otherQuotas = state.quotas.filter(
            (q) => !(q.year === year && q.quarter === quarter && q.status !== 'expired')
          )

          set({
            batches: newBatches,
            outboundRecords: newRecords,
            quotas: [...otherQuotas, ...newQuotas]
          })

          console.info('[Store] reviewOutbound 通过:', { outboundNo: record.outboundNo, actualDeductions })
          resolve({ success: true, message: '审核通过，已扣库存和额度' })
        } else {
          const ensuredQuotas = ensureQuotasExist(state.quotas)
          const { year, quarter } = getCurrentQuarter()
          const newQuotas = ensuredQuotas.map((q) => {
            if (q.id === record.quotaId) {
              const restoredUsed = q.used - record.quotaOccupied
              return {
                ...q,
                used: Math.max(restoredUsed, 0),
                status: restoredUsed < q.baseQuota + (q.approved || 0) ? ('active' as const) : q.status
              }
            }
            return q
          })

          const otherQuotas = state.quotas.filter(
            (q) => !(q.year === year && q.quarter === quarter && q.status !== 'expired')
          )

          newRecords[recordIdx] = {
            ...record,
            status: 'rejected',
            reviewDate: now,
            reviewer,
            reviewRemark,
            quotaOccupied: 0
          }

          set({
            outboundRecords: newRecords,
            quotas: [...otherQuotas, ...newQuotas]
          })

          console.info('[Store] reviewOutbound 驳回:', { outboundNo: record.outboundNo })
          resolve({ success: true, message: '已驳回，已释放额度占用' })
        }
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

    getCompletedOutbound: () => {
      const state = get()
      return state.outboundRecords.filter((r) => r.status === 'completed')
    },

    getPendingOutbound: () => {
      const state = get()
      return state.outboundRecords
        .filter((r) => r.status === 'pending')
        .sort((a, b) => new Date(b.outboundDate).getTime() - new Date(a.outboundDate).getTime())
    },

    applyQuota: (merchantId, merchantName, applyAmount, reason) => {
      return new Promise((resolve) => {
        const now = dayjs().format('YYYY-MM-DD')
        const newApp: QuotaApplication = {
          id: `QA${Date.now()}`,
          merchantId,
          merchantName,
          applyQuota: applyAmount,
          unit: '吨',
          reason,
          status: 'pending',
          applyDate: now,
          reviewDate: '',
          reviewer: '',
          reviewRemark: ''
        }
        set((state) => ({
          quotaApplications: [...state.quotaApplications, newApp]
        }))
        console.info('[Store] applyQuota 提交申请:', { merchantId, applyAmount })
        resolve(true)
      })
    },

    reviewQuotaApplication: (appId, approved, reviewer, reviewRemark) => {
      return new Promise((resolve) => {
        const state = get()
        const appIdx = state.quotaApplications.findIndex((a) => a.id === appId)
        if (appIdx === -1) {
          resolve(false)
          return
        }
        const app = state.quotaApplications[appIdx]
        if (app.status !== 'pending') {
          resolve(false)
          return
        }

        const now = dayjs().format('YYYY-MM-DD')
        const newApps = [...state.quotaApplications]
        newApps[appIdx] = {
          ...app,
          status: approved ? 'approved' : 'rejected',
          reviewDate: now,
          reviewer,
          reviewRemark
        }

        if (approved) {
          const { year, quarter } = getCurrentQuarter()
          const ensuredQuotas = ensureQuotasExist(state.quotas)
          const quotaIdx = ensuredQuotas.findIndex(
            (q) => q.merchantId === app.merchantId && q.year === year && q.quarter === quarter && q.status !== 'expired'
          )
          if (quotaIdx !== -1) {
            const newQuotas = [...ensuredQuotas]
            const quota = { ...newQuotas[quotaIdx] }
            quota.approved = (quota.approved || 0) + app.applyQuota
            if (quota.baseQuota + quota.approved > quota.used && quota.status === 'exhausted') {
              quota.status = 'active'
            }
            newQuotas[quotaIdx] = quota

            const otherQuotas = state.quotas.filter(
              (q) => !(q.year === year && q.quarter === quarter && q.status !== 'expired')
            )
            set({
              quotaApplications: newApps,
              quotas: [...otherQuotas, ...newQuotas]
            })
          } else {
            set({ quotaApplications: newApps })
          }
          console.info('[Store] reviewQuotaApplication 通过:', { appId, applyQuota: app.applyQuota })
        } else {
          set({ quotaApplications: newApps })
          console.info('[Store] reviewQuotaApplication 驳回:', { appId })
        }

        resolve(true)
      })
    },

    getPendingQuotaApplications: () => {
      const state = get()
      return state.quotaApplications
        .filter((a) => a.status === 'pending')
        .sort((a, b) => new Date(b.applyDate).getTime() - new Date(a.applyDate).getTime())
    }
  }
})
