import { MerchantQuota } from '@/types'

export const mockQuotas: MerchantQuota[] = [
  {
    id: 'Q001',
    merchantId: 'M001',
    merchantName: '华东面业集团',
    quarter: 'Q2',
    year: 2026,
    totalQuota: 500,
    usedQuota: 380,
    remainingQuota: 120,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q002',
    merchantId: 'M002',
    merchantName: '中粮饲料公司',
    quarter: 'Q2',
    year: 2026,
    totalQuota: 800,
    usedQuota: 625,
    remainingQuota: 175,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q003',
    merchantId: 'M003',
    merchantName: '湘米加工厂',
    quarter: 'Q2',
    year: 2026,
    totalQuota: 300,
    usedQuota: 300,
    remainingQuota: 0,
    unit: '吨',
    status: 'exhausted'
  },
  {
    id: 'Q004',
    merchantId: 'M004',
    merchantName: '北方粮贸公司',
    quarter: 'Q2',
    year: 2026,
    totalQuota: 600,
    usedQuota: 210,
    remainingQuota: 390,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q005',
    merchantId: 'M005',
    merchantName: '丰源米业有限公司',
    quarter: 'Q2',
    year: 2026,
    totalQuota: 400,
    usedQuota: 145,
    remainingQuota: 255,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q006',
    merchantId: 'M001',
    merchantName: '华东面业集团',
    quarter: 'Q1',
    year: 2026,
    totalQuota: 500,
    usedQuota: 500,
    remainingQuota: 0,
    unit: '吨',
    status: 'expired'
  },
  {
    id: 'Q007',
    merchantId: 'M002',
    merchantName: '中粮饲料公司',
    quarter: 'Q1',
    year: 2026,
    totalQuota: 800,
    usedQuota: 780,
    remainingQuota: 20,
    unit: '吨',
    status: 'expired'
  },
  {
    id: 'Q008',
    merchantId: 'M006',
    merchantName: '金龙粮油有限公司',
    quarter: 'Q2',
    year: 2026,
    totalQuota: 350,
    usedQuota: 350,
    remainingQuota: 0,
    unit: '吨',
    status: 'exhausted'
  }
]
