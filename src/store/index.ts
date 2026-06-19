import { create } from 'zustand'
import { GrainBatch, OutboundRecord, MerchantQuota, InspectionRecord } from '@/types'
import { mockBatches } from '@/data/batch'
import { mockOutboundRecords } from '@/data/outbound'
import { mockQuotas } from '@/data/quota'
import { mockInspections } from '@/data/inspection'

interface GrainStore {
  batches: GrainBatch[]
  outboundRecords: OutboundRecord[]
  quotas: MerchantQuota[]
  inspections: InspectionRecord[]
  setBatches: (batches: GrainBatch[]) => void
  addBatch: (batch: GrainBatch) => void
  updateBatch: (id: string, batch: Partial<GrainBatch>) => void
  setOutboundRecords: (records: OutboundRecord[]) => void
  addOutboundRecord: (record: OutboundRecord) => void
  setQuotas: (quotas: MerchantQuota[]) => void
  updateQuota: (id: string, quota: Partial<MerchantQuota>) => void
  setInspections: (inspections: InspectionRecord[]) => void
  addInspection: (inspection: InspectionRecord) => void
  getFifoBatches: () => GrainBatch[]
  getWarningBatches: () => GrainBatch[]
  getActiveQuotas: () => MerchantQuota[]
}

export const useGrainStore = create<GrainStore>((set, get) => ({
  batches: mockBatches,
  outboundRecords: mockOutboundRecords,
  quotas: mockQuotas,
  inspections: mockInspections,
  setBatches: (batches) => set({ batches }),
  addBatch: (batch) => set((state) => ({ batches: [...state.batches, batch] })),
  updateBatch: (id, batch) =>
    set((state) => ({
      batches: state.batches.map((b) => (b.id === id ? { ...b, ...batch } : b))
    })),
  setOutboundRecords: (outboundRecords) => set({ outboundRecords }),
  addOutboundRecord: (record) =>
    set((state) => ({ outboundRecords: [...state.outboundRecords, record] })),
  setQuotas: (quotas) => set({ quotas }),
  updateQuota: (id, quota) =>
    set((state) => ({
      quotas: state.quotas.map((q) => (q.id === id ? { ...q, ...quota } : q))
    })),
  setInspections: (inspections) => set({ inspections }),
  addInspection: (inspection) =>
    set((state) => ({ inspections: [...state.inspections, inspection] })),
  getFifoBatches: () => {
    return get()
      .batches.filter((b) => b.status !== 'locked' && b.status !== 'expired' && b.remainingQuantity > 0)
      .sort((a, b) => new Date(a.inboundDate).getTime() - new Date(b.inboundDate).getTime())
  },
  getWarningBatches: () => {
    return get().batches.filter((b) => b.status === 'warning' || b.status === 'expired')
  },
  getActiveQuotas: () => {
    return get().quotas.filter((q) => q.status === 'active' || q.status === 'exhausted')
  }
}))
