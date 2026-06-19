export interface GrainBatch {
  id: string
  batchNo: string
  grainType: string
  warehouseNo: string
  quantity: number
  remainingQuantity: number
  unit: string
  inboundDate: string
  expiryDate: string
  warningDate: string
  status: 'normal' | 'warning' | 'expired' | 'locked'
  supplier: string
  moistureContent: number
  impurityRate: number
  grade: string
  remark: string
}

export interface OutboundRecord {
  id: string
  outboundNo: string
  batchNo: string
  grainType: string
  merchantId: string
  merchantName: string
  quantity: number
  unit: string
  outboundDate: string
  status: 'pending' | 'approved' | 'completed' | 'rejected'
  operator: string
  quotaId: string
  remark: string
}

export interface MerchantQuota {
  id: string
  merchantId: string
  merchantName: string
  quarter: string
  year: number
  totalQuota: number
  usedQuota: number
  remainingQuota: number
  unit: string
  status: 'active' | 'exhausted' | 'expired'
}

export interface InspectionRecord {
  id: string
  batchNo: string
  grainType: string
  inspectionType: 'moisture' | 'impurity' | 'full'
  moistureContent: number
  impurityRate: number
  result: 'pass' | 'fail'
  standard: string
  inspector: string
  inspectionDate: string
  remark: string
}

export interface WarningItem {
  id: string
  batchNo: string
  grainType: string
  warehouseNo: string
  remainingQuantity: number
  unit: string
  expiryDate: string
  warningDate: string
  daysLeft: number
  level: 'warning' | 'expired'
}

export interface QuotaApplication {
  id: string
  merchantId: string
  merchantName: string
  applyQuota: number
  unit: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  applyDate: string
  reviewDate: string
  reviewer: string
}
