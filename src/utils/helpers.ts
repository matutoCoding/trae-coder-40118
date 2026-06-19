import dayjs from 'dayjs'

export const formatDate = (date: string, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format)
}

export const getDaysLeft = (expiryDate: string): number => {
  return dayjs(expiryDate).diff(dayjs(), 'day')
}

export const getBatchStatusText = (status: string): string => {
  const map: Record<string, string> = {
    normal: '正常',
    warning: '临期',
    expired: '超期',
    locked: '已锁定'
  }
  return map[status] || status
}

export const getOutboundStatusText = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待审批',
    approved: '已审批',
    completed: '已完成',
    rejected: '已驳回'
  }
  return map[status] || status
}

export const getQuotaStatusText = (status: string): string => {
  const map: Record<string, string> = {
    active: '正常',
    exhausted: '已用尽',
    expired: '已过期'
  }
  return map[status] || status
}

export const getQuarterLabel = (quarter: string): string => {
  const map: Record<string, string> = {
    Q1: '第一季度',
    Q2: '第二季度',
    Q3: '第三季度',
    Q4: '第四季度'
  }
  return map[quarter] || quarter
}

export const getCurrentQuarter = (): { quarter: string; year: number } => {
  const now = dayjs()
  const month = now.month() + 1
  const quarter = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4'
  return { quarter, year: now.year() }
}

export const getInspectionResultText = (result: string): string => {
  return result === 'pass' ? '合格' : '不合格'
}

export const getInspectionTypeText = (type: string): string => {
  const map: Record<string, string> = {
    moisture: '水分检测',
    impurity: '杂质检测',
    full: '综合检验'
  }
  return map[type] || type
}
