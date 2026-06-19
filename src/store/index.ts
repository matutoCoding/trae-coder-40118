import { create } from 'zustand'
import dayjs from 'dayjs'
import { GrainBatch, OutboundRecord, MerchantQuota, InspectionRecord, QuotaApplication, PlannedDeduction } from '@/types'
import { mockBatches } from '@/data/batch'
import { mockOutboundRecords } from '@/data/outbound'
import { mockQuotas } from '@/data/quota'
import { mockInspections } from '@/data/inspection'
import { getCurrentQuarter } from '@/utils/helpers'

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
    pendingUsed: 0,
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
  return quotas.map((q) => ({ pendingUsed: 0, ...q }))
}

function computeFifoPlan(batches: GrainBatch[], pendingOutbounds: OutboundRecord[], totalQuantity: number, excludeRecordId?: string): { plan: PlannedDeduction[], usedStock: Record<string, number> } {
  const usedStock: Record<string, number> = {}
  for (const r of pendingOutbounds) {
    if (excludeRecordId && r.id === excludeRecordId) continue
    for (const pd of r.plannedDeductions) {
      usedStock[pd.batchId] = (usedStock[pd.batchId] || 0) + pd.deductQuantity
    }
  }

  const fifoList = batches
    .map((b) => {
      const computedStatus = calcBatchStatus(b)
      const pendingDeducted = usedStock[b.id] || 0
      const effectiveRemaining = b.remainingQuantity - pendingDeducted
      return {
        ...b,
        computedStatus,
        effectiveRemaining,
        pendingDeducted
      }
    })
    .filter((b) => ['normal', 'warning'].includes(b.computedStatus) && b.effectiveRemaining > 0)
    .sort((a, b) => dayjs(a.inboundDate).valueOf() - dayjs(b.inboundDate).valueOf())

  let remaining = totalQuantity
  const plan: PlannedDeduction[] = []
  for (const batch of fifoList) {
    if (remaining <= 0) break
    const deduct = Math.min(batch.effectiveRemaining, remaining)
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

  return { plan, usedStock }
}

function verifyPlanValidity(batches: GrainBatch[], pendingOutbounds: OutboundRecord[], plannedDeductions: PlannedDeduction[], excludeRecordId: string): { valid: boolean; message: string; effectiveRemainingByBatch: Record<string, number> } {
  const usedStock: Record<string, number> = {}
  for (const r of pendingOutbounds) {
    if (r.id === excludeRecordId) continue
    for (const pd of r.plannedDeductions) {
      usedStock[pd.batchId] = (usedStock[pd.batchId] || 0) + pd.deductQuantity
    }
  }

  const effectiveRemainingByBatch: Record<string, number> = {}
  for (const b of batches) {
    const pending = usedStock[b.id] || 0
    effectiveRemainingByBatch[b.id] = b.remainingQuantity - pending
  }

  for (const plan of plannedDeductions) {
    const batch = batches.find((b) => b.id === plan.batchId)
    if (!batch) {
      return { valid: false, message: `批次 ${plan.batchNo} 不存在`, effectiveRemainingByBatch }
    }
    const effective = effectiveRemainingByBatch[plan.batchId]
    if (effective < plan.deductQuantity) {
      return {
        valid: false,
        message: `批次 ${plan.batchNo} 库存不足：剩余 ${batch.remainingQuantity} 吨，其他待审单已占用 ${usedStock[plan.batchId] || 0} 吨，可用于本单的仅剩 ${effective} 吨，需扣 ${plan.deductQuantity} 吨`,
        effectiveRemainingByBatch
      }
    }
  }

  return { valid: true, message: '', effectiveRemainingByBatch }
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
    hints.push(`审批后该商户可用额度将仅剩${quotaRemaining - quantity}吨`)
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
  ) => Promise<{ success: boolean; message: string; needRegenerate?: boolean; newPlan?: PlannedDeduction[] }>
  regenerateOutboundPlan: (
    recordId: string
  ) => Promise<{ success: boolean; message: string; newPlan?: PlannedDeduction[] }>
  updateOutboundPlan: (
    recordId: string,
    newPlan: PlannedDeduction[]
  ) => Promise<{ success: boolean; message: string }>
  getFifoBatches: () => Array<GrainBatch & { effectiveRemaining: number; pendingDeducted: number }>
  getAvailableBatches: () => Array<GrainBatch & { effectiveRemaining: number; pendingDeducted: number }>
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
  getQuotaApplicationById: (id: string) => QuotaApplication | undefined
  getApprovalHistory: (filters?: { merchantId?: string; status?: string; startDate?: string; endDate?: string; type?: 'outbound' | 'quota' }) => Array<{ type: 'outbound' | 'quota'; record: OutboundRecord | QuotaApplication }>
}

export const useGrainStore = create<GrainStore>((set, get) => {
  return {
    batches: mockBatches,
    outboundRecords: mockOutboundRecords,
    quotas: ensureQuotasExist(mockQuotas),
    merchants: MERCHANT_TEMPLATE,
    inspections: mockInspections,
    quotaApplications: [
      {
        id: 'QA001',
        merchantId: 'M002',
        merchantName: '中粮饲料公司',
        applyQuota: 100,
        unit: '吨',
        reason: '季度采购计划增加，原额度不够使用',
        status: 'approved',
        applyDate: '2026-06-02',
        reviewDate: '2026-06-03',
        reviewer: '赵主管',
        reviewRemark: '情况属实，同意追加',
        quotaBefore: 800,
        quotaAfter: 900
      },
      {
        id: 'QA002',
        merchantId: 'M003',
        merchantName: '湘米加工厂',
        applyQuota: 50,
        unit: '吨',
        reason: '新签客户订单增加',
        status: 'pending',
        applyDate: '2026-06-18',
        reviewDate: '',
        reviewer: '',
        reviewRemark: ''
      },
      {
        id: 'QA003',
        merchantId: 'M006',
        merchantName: '金龙粮油有限公司',
        applyQuota: 200,
        unit: '吨',
        reason: '临期促销活动备货',
        status: 'rejected',
        applyDate: '2026-06-08',
        reviewDate: '2026-06-09',
        reviewer: '赵主管',
        reviewRemark: '近期提货量偏低，暂不同意追加额度',
        quotaBefore: 350,
        quotaAfter: 350
      }
    ],

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

        const totalAvailable = quota.baseQuota + (quota.approved || 0) - quota.used - quota.pendingUsed
        if (totalAvailable < totalQuantity) {
          resolve({
            success: false,
            message: `额度不足！本季可用${totalAvailable}吨（已用${quota.used}吨，待审占用${quota.pendingUsed}吨），请先申请追加额度`,
            needApply: true
          })
          return
        }

        const pendingList = state.outboundRecords.filter((r) => r.status === 'pending')
        const { plan: plannedDeductions, usedStock } = computeFifoPlan(state.batches, pendingList, totalQuantity)
        if (plannedDeductions.length === 0 || plannedDeductions.reduce((s, p) => s + p.deductQuantity, 0) < totalQuantity) {
          resolve({ success: false, message: '可用库存不足（含待审单占用），请减少数量或等待其他单处理' })
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
              const newPendingUsed = q.pendingUsed + totalQuantity
              const totalForQuota = q.baseQuota + (q.approved || 0)
              const totalOccupied = q.used + newPendingUsed
              return {
                ...q,
                pendingUsed: newPendingUsed,
                status: totalOccupied >= totalForQuota ? ('exhausted' as const) : ('active' as const)
              }
            }
            return q
          })
        }))

        console.info('[Store] createOutbound 待审核（占用pendingUsed）:', { outboundNo, merchantId, totalQuantity, usedStock })
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

        const pendingList = state.outboundRecords.filter((r) => r.status === 'pending')
        const { valid, message, effectiveRemainingByBatch } = verifyPlanValidity(
          state.batches,
          pendingList,
          record.plannedDeductions,
          record.id
        )

        if (!valid) {
          console.warn('[Store] reviewOutbound 审核校验失败:', { outboundNo: record.outboundNo, message })
          const { plan: newPlan } = computeFifoPlan(state.batches, pendingList, record.quantity, record.id)
          if (newPlan.reduce((s, p) => s + p.deductQuantity, 0) < record.quantity) {
            resolve({ success: false, message: `${message}，且已无法重新生成可用扣减方案`, needRegenerate: true })
          } else {
            resolve({ success: false, message: `${message}，请重新生成扣减方案`, needRegenerate: true, newPlan })
          }
          return
        }

        const newRecords = [...state.outboundRecords]
        const now = dayjs().format('YYYY-MM-DD')

        if (approved) {
          const newBatches = state.batches.map((b) => ({ ...b }))
          const actualDeductions: PlannedDeduction[] = []
          let shortfall = ''

          for (const plan of record.plannedDeductions) {
            const idx = newBatches.findIndex((b) => b.id === plan.batchId)
            if (idx === -1) {
              shortfall = `批次 ${plan.batchNo} 不存在`
              break
            }
            const b = newBatches[idx]
            if (b.remainingQuantity < plan.deductQuantity) {
              shortfall = `批次 ${plan.batchNo} 仅剩 ${b.remainingQuantity}${b.unit}，不足拟扣 ${plan.deductQuantity}${b.unit}`
              break
            }
            newBatches[idx] = { ...b, remainingQuantity: b.remainingQuantity - plan.deductQuantity }
            actualDeductions.push({ ...plan, deductQuantity: plan.deductQuantity })
          }

          if (shortfall) {
            console.warn('[Store] reviewOutbound 实际扣减失败:', { outboundNo: record.outboundNo, shortfall })
            const { plan: newPlan } = computeFifoPlan(state.batches, pendingList, record.quantity, record.id)
            if (newPlan.reduce((s, p) => s + p.deductQuantity, 0) < record.quantity) {
              resolve({ success: false, message: `${shortfall}，且已无法重新生成可用扣减方案`, needRegenerate: true })
            } else {
              resolve({ success: false, message: `${shortfall}，请重新生成扣减方案`, needRegenerate: true, newPlan })
            }
            return
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
          const ensuredQuotas = ensureQuotasExist(state.quotas)
          const newQuotas = ensuredQuotas.map((q) => {
            if (q.id === record.quotaId) {
              const newUsed = q.used + record.quantity
              const newPendingUsed = q.pendingUsed - record.quotaOccupied
              const totalForQuota = q.baseQuota + (q.approved || 0)
              const totalOccupied = newUsed + newPendingUsed
              return {
                ...q,
                used: newUsed,
                pendingUsed: Math.max(newPendingUsed, 0),
                status: totalOccupied >= totalForQuota ? ('exhausted' as const) : ('active' as const)
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

          console.info('[Store] reviewOutbound 通过:', { outboundNo: record.outboundNo, actualDeductions, effectiveRemainingByBatch })
          resolve({ success: true, message: '审核通过，已扣库存和额度' })
        } else {
          const { year, quarter } = getCurrentQuarter()
          const ensuredQuotas = ensureQuotasExist(state.quotas)
          const newQuotas = ensuredQuotas.map((q) => {
            if (q.id === record.quotaId) {
              const newPendingUsed = q.pendingUsed - record.quotaOccupied
              const totalForQuota = q.baseQuota + (q.approved || 0)
              const totalOccupied = q.used + Math.max(newPendingUsed, 0)
              return {
                ...q,
                pendingUsed: Math.max(newPendingUsed, 0),
                status: totalOccupied >= totalForQuota ? ('exhausted' as const) : ('active' as const)
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

          console.info('[Store] reviewOutbound 驳回（释放pendingUsed）:', { outboundNo: record.outboundNo })
          resolve({ success: true, message: '已驳回，已释放额度占用' })
        }
      })
    },

    regenerateOutboundPlan: (recordId) => {
      return new Promise((resolve) => {
        const state = get()
        const record = state.outboundRecords.find((r) => r.id === recordId)
        if (!record || record.status !== 'pending') {
          resolve({ success: false, message: '待审单不存在或已处理' })
          return
        }

        const pendingList = state.outboundRecords.filter((r) => r.status === 'pending')
        const { plan } = computeFifoPlan(state.batches, pendingList, record.quantity, record.id)
        if (plan.reduce((s, p) => s + p.deductQuantity, 0) < record.quantity) {
          resolve({ success: false, message: '库存不足，无法重新生成扣减方案' })
          return
        }

        resolve({ success: true, message: '重新生成方案成功', newPlan: plan })
      })
    },

    updateOutboundPlan: (recordId, newPlan) => {
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

        const pendingList = state.outboundRecords.filter((r) => r.status === 'pending')
        const { valid, message } = verifyPlanValidity(state.batches, pendingList, newPlan, record.id)
        if (!valid) {
          resolve({ success: false, message })
          return
        }

        const newRecords = [...state.outboundRecords]
        const grainTypes = [...new Set(newPlan.map((p) => p.grainType))]
        const ensuredQuotas = ensureQuotasExist(state.quotas)
        const quota = ensuredQuotas.find((q) => q.id === record.quotaId)
        const totalAvailable = quota ? quota.baseQuota + (quota.approved || 0) - quota.used - quota.pendingUsed + record.quotaOccupied : 0
        const riskHints = buildRiskHints(newPlan, record.quantity, totalAvailable)

        newRecords[recordIdx] = {
          ...record,
          plannedDeductions: newPlan,
          batchNo: newPlan[0].batchNo,
          grainType: grainTypes.length === 1 ? grainTypes[0] : '多品种',
          riskHints
        }

        set({ outboundRecords: newRecords })
        resolve({ success: true, message: '扣减方案已更新' })
      })
    },

    getFifoBatches: () => {
      const state = get()
      const pendingList = state.outboundRecords.filter((r) => r.status === 'pending')
      const usedStock: Record<string, number> = {}
      for (const r of pendingList) {
        for (const pd of r.plannedDeductions) {
          usedStock[pd.batchId] = (usedStock[pd.batchId] || 0) + pd.deductQuantity
        }
      }

      return state.batches
        .map((b) => {
          const computedStatus = calcBatchStatus(b)
          const pendingDeducted = usedStock[b.id] || 0
          return {
            ...b,
            status: computedStatus,
            effectiveRemaining: b.remainingQuantity - pendingDeducted,
            pendingDeducted
          }
        })
        .filter((b) => ['normal', 'warning'].includes(b.status) && b.effectiveRemaining > 0)
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

        if (approved) {
          const { year, quarter } = getCurrentQuarter()
          const ensuredQuotas = ensureQuotasExist(state.quotas)
          const quotaIdx = ensuredQuotas.findIndex(
            (q) => q.merchantId === app.merchantId && q.year === year && q.quarter === quarter && q.status !== 'expired'
          )
          if (quotaIdx !== -1) {
            const newQuotas = [...ensuredQuotas]
            const quota = { ...newQuotas[quotaIdx] }
            const beforeTotal = quota.baseQuota + (quota.approved || 0)
            quota.approved = (quota.approved || 0) + app.applyQuota
            const afterTotal = quota.baseQuota + (quota.approved || 0)
            const totalForQuota = afterTotal
            const totalOccupied = quota.used + quota.pendingUsed
            if (totalOccupied < totalForQuota && quota.status === 'exhausted') {
              quota.status = 'active'
            }
            newQuotas[quotaIdx] = quota

            newApps[appIdx] = {
              ...app,
              status: 'approved',
              reviewDate: now,
              reviewer,
              reviewRemark,
              quotaBefore: beforeTotal,
              quotaAfter: afterTotal
            }

            const otherQuotas = state.quotas.filter(
              (q) => !(q.year === year && q.quarter === quarter && q.status !== 'expired')
            )
            set({
              quotaApplications: newApps,
              quotas: [...otherQuotas, ...newQuotas]
            })
          } else {
            newApps[appIdx] = {
              ...app,
              status: 'approved',
              reviewDate: now,
              reviewer,
              reviewRemark
            }
            set({ quotaApplications: newApps })
          }
          console.info('[Store] reviewQuotaApplication 通过:', { appId, applyQuota: app.applyQuota })
        } else {
          const { year, quarter } = getCurrentQuarter()
          const ensuredQuotas = ensureQuotasExist(state.quotas)
          const quota = ensuredQuotas.find(
            (q) => q.merchantId === app.merchantId && q.year === year && q.quarter === quarter && q.status !== 'expired'
          )
          const currentTotal = quota ? quota.baseQuota + (quota.approved || 0) : 0
          newApps[appIdx] = {
            ...app,
            status: 'rejected',
            reviewDate: now,
            reviewer,
            reviewRemark,
            quotaBefore: currentTotal,
            quotaAfter: currentTotal
          }
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
    },

    getQuotaApplicationById: (id) => {
      const state = get()
      return state.quotaApplications.find((a) => a.id === id)
    },

    getApprovalHistory: (filters = {}) => {
      const state = get()
      const result: Array<{ type: 'outbound' | 'quota'; record: OutboundRecord | QuotaApplication }> = []

      const { merchantId, status, startDate, endDate, type } = filters

      if (type !== 'quota') {
        for (const r of state.outboundRecords) {
          if (merchantId && r.merchantId !== merchantId) continue
          if (status && r.status !== status) continue
          if (startDate && r.outboundDate < startDate) continue
          if (endDate && r.outboundDate > endDate) continue
          result.push({ type: 'outbound', record: r })
        }
      }

      if (type !== 'outbound') {
        for (const a of state.quotaApplications) {
          if (merchantId && a.merchantId !== merchantId) continue
          if (status && a.status !== status) continue
          if (startDate && a.applyDate < startDate) continue
          if (endDate && a.applyDate > endDate) continue
          result.push({ type: 'quota', record: a })
        }
      }

      result.sort((a, b) => {
        const dateA = a.type === 'outbound'
          ? (a.record as OutboundRecord).reviewDate || (a.record as OutboundRecord).outboundDate
          : (a.record as QuotaApplication).reviewDate || (a.record as QuotaApplication).applyDate
        const dateB = b.type === 'outbound'
          ? (b.record as OutboundRecord).reviewDate || (b.record as OutboundRecord).outboundDate
          : (b.record as QuotaApplication).reviewDate || (b.record as QuotaApplication).applyDate
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })

      return result
    }
  }
})
