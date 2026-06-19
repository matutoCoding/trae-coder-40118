import { MerchantQuota } from '@/types'

export const mockQuotas: MerchantQuota[] = [
  {
    id: 'Q001',
    merchantId: 'M001',
    merchantName: '华东面业集团',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 500,
    used: 380,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q002',
    merchantId: 'M002',
    merchantName: '中粮饲料公司',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 800,
    used: 625,
    approved: 100,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q003',
    merchantId: 'M003',
    merchantName: '湘米加工厂',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 300,
    used: 300,
    unit: '吨',
    status: 'exhausted'
  },
  {
    id: 'Q004',
    merchantId: 'M004',
    merchantName: '北方粮贸公司',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 600,
    used: 210,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q005',
    merchantId: 'M005',
    merchantName: '丰源米业有限公司',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 400,
    used: 145,
    unit: '吨',
    status: 'active'
  },
  {
    id: 'Q006',
    merchantId: 'M001',
    merchantName: '华东面业集团',
    quarter: 'Q1',
    year: 2026,
    baseQuota: 500,
    used: 500,
    unit: '吨',
    status: 'expired'
  },
  {
    id: 'Q007',
    merchantId: 'M002',
    merchantName: '中粮饲料公司',
    quarter: 'Q1',
    year: 2026,
    baseQuota: 800,
    used: 780,
    unit: '吨',
    status: 'expired'
  },
  {
    id: 'Q008',
    merchantId: 'M006',
    merchantName: '金龙粮油有限公司',
    quarter: 'Q2',
    year: 2026,
    baseQuota: 350,
    used: 350,
    unit: '吨',
    status: 'exhausted'
  }
]
