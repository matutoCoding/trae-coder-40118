import { MerchantQuota } from '@/types'

export const mockQuotas: MerchantQuota[] = [
  {
    id: 'Q2026Q2_M001',
    merchantId: 'M001',
    merchantName: '华东面业集团',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 500,
    used: 70,
    pendingUsed: 0,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q2026Q2_M002',
    merchantId: 'M002',
    merchantName: '中粮饲料公司',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 800,
    used: 125,
    pendingUsed: 0,
    approved: 100,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q2026Q2_M003',
    merchantId: 'M003',
    merchantName: '湘米加工厂',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 300,
    used: 0,
    pendingUsed: 30,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q2026Q2_M004',
    merchantId: 'M004',
    merchantName: '北方粮贸公司',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 600,
    used: 0,
    pendingUsed: 60,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q2026Q2_M005',
    merchantId: 'M005',
    merchantName: '丰源米业有限公司',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 400,
    used: 35,
    pendingUsed: 0,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q2026Q1_M001',
    merchantId: 'M001',
    merchantName: '华东面业集团',
    quarter: 'Q1',
    year: 2026,
    baseQuota: 500,
    used: 500,
    pendingUsed: 0,
    unit: '吨',
    status: 'expired'
  },
  {
    id: 'Q2026Q1_M002',
    merchantId: 'M002',
    merchantName: '中粮饲料公司',
    quarter: 'Q1',
    year: 2026,
    baseQuota: 800,
    used: 780,
    pendingUsed: 0,
    unit: '吨',
    status: 'expired'
  },
  {
    id: 'Q2026Q2_M006',
    merchantId: 'M006',
    merchantName: '金龙粮油有限公司',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 350,
    used: 0,
    pendingUsed: 0,
    unit: '吨',
    status: 'exhausted'
  }
]
