import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, Input, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import { getOutboundStatusText, getDaysLeft } from '@/utils/helpers'
import StatusTag from '@/components/StatusTag'
import EmptyState from '@/components/EmptyState'
import styles from './index.module.scss'

const TABS = [
  { label: '办理出库', value: 'fifo' },
  { label: '待审核', value: 'pending' },
  { label: '出库记录', value: 'records' }
]

const OutboundPage: React.FC = () => {
  const { merchants, getFifoBatches, outboundRecords, createOutbound, reviewOutbound, getMerchantQuota } = useGrainStore()
  const [activeTab, setActiveTab] = useState('fifo')
  const [merchantIdx, setMerchantIdx] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({})
  const [reviewing, setReviewing] = useState<Record<string, boolean>>({})

  const fifoBatches = useMemo(() => getFifoBatches().slice(0, 10), [getFifoBatches])
  const totalAvailable = useMemo(() => {
    return getFifoBatches().reduce((sum, b) => sum + b.remainingQuantity, 0)
  }, [getFifoBatches])

  const selectedMerchant = useMemo(
    () => (merchantIdx ? merchants[Number(merchantIdx)] : null),
    [merchantIdx, merchants]
  )
  const merchantQuota = useMemo(
    () => (selectedMerchant ? getMerchantQuota(selectedMerchant.merchantId) : undefined),
    [selectedMerchant, getMerchantQuota]
  )

  const pendingRecords = useMemo(() => {
    return outboundRecords
      .filter((r) => r.status === 'pending')
      .sort((a, b) => new Date(b.outboundDate).getTime() - new Date(a.outboundDate).getTime())
  }, [outboundRecords])

  const sortedRecords = useMemo(() => {
    return [...outboundRecords].sort(
      (a, b) => new Date(b.outboundDate).getTime() - new Date(a.outboundDate).getTime()
    )
  }, [outboundRecords])

  const merchantNames = useMemo(() => merchants.map((m) => m.merchantName), [merchants])

  const handleCreateOutbound = async () => {
    if (!selectedMerchant) {
      Taro.showToast({ title: '请选择提货商户', icon: 'none' })
      return
    }
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      Taro.showToast({ title: '请输入有效的出库数量', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const result = await createOutbound(
        selectedMerchant.merchantId,
        selectedMerchant.merchantName,
        qty
      )
      if (result.success) {
        Taro.showToast({ title: result.message, icon: 'success' })
        setQuantity('')
        setMerchantIdx('')
        setTimeout(() => setActiveTab('pending'), 800)
      } else {
        Taro.showModal({
          title: result.needApply ? '额度不足' : '出库失败',
          content: result.message,
          confirmText: result.needApply ? '申请追加' : '知道了',
          success: (res) => {
            if (res.confirm && result.needApply && selectedMerchant) {
              Taro.navigateTo({
                url: `/pages/quotaApply/index?merchantId=${selectedMerchant.merchantId}&merchantName=${selectedMerchant.merchantName}`
              })
            }
          }
        })
      }
    } catch (e) {
      Taro.showToast({ title: '系统异常，请重试', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReview = async (recordId: string, approved: boolean) => {
    const remark = reviewRemarks[recordId] || ''
    setReviewing((prev) => ({ ...prev, [recordId]: true }))
    try {
      const result = await reviewOutbound(recordId, approved, '当前审批人', remark)
      Taro.showToast({ title: result.message, icon: result.success ? 'success' : 'none' })
    } catch {
      Taro.showToast({ title: '审核异常，请重试', icon: 'none' })
    } finally {
      setReviewing((prev) => ({ ...prev, [recordId]: false }))
    }
  }

  const handleRecordDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/outboundDetail/index?id=${id}` })
  }

  return (
    <View className={styles.container}>
      <View className={styles.tabs}>
        {TABS.map((tab) => (
          <View
            key={tab.value}
            className={classnames(styles.tab, activeTab === tab.value && styles.tabActive)}
            onClick={() => setActiveTab(tab.value)}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
            {activeTab === tab.value && <View className={styles.tabLine} />}
          </View>
        ))}
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 120rpx)' }}>
        {activeTab === 'fifo' && (
          <View className={styles.content}>
            <View className={styles.outboundForm}>
              <Text className={styles.sectionTitle}>出库办理</Text>

              <View className={styles.formItem}>
                <Text className={styles.formLabel}>
                  <Text style={{ color: '#D93025', marginRight: '4rpx' }}>*</Text>
                  提货商户
                </Text>
                <Picker
                  mode='selector'
                  range={merchantNames}
                  value={merchantIdx ? Number(merchantIdx) : undefined}
                  onChange={(e) => setMerchantIdx(String(e.detail.value))}
                >
                  <View className={styles.pickerValue}>
                    <Text className={!selectedMerchant ? styles.pickerPlaceholder : ''}>
                      {selectedMerchant ? selectedMerchant.merchantName : '请选择提货商户'}
                    </Text>
                  </View>
                </Picker>
                {merchantQuota && (
                  <View className={styles.quotaBadge}>
                    <Text className={styles.quotaBadgeText}>
                      本季额度：{merchantQuota.used}/{merchantQuota.baseQuota}{merchantQuota.approved ? `(+${merchantQuota.approved})` : ''}吨（剩余
                      {merchantQuota.baseQuota + (merchantQuota.approved || 0) - merchantQuota.used}吨）
                    </Text>
                    {merchantQuota.status === 'exhausted' && (
                      <StatusTag status='exhausted' text='已用尽' size='small' />
                    )}
                  </View>
                )}
              </View>

              <View className={styles.formItem}>
                <Text className={styles.formLabel}>
                  <Text style={{ color: '#D93025', marginRight: '4rpx' }}>*</Text>
                  出库数量(吨)
                </Text>
                <Input
                  className={styles.formInput}
                  type='digit'
                  placeholder={`请输入出库数量，当前可用库存${totalAvailable}吨`}
                  value={quantity}
                  onInput={(e) => setQuantity(e.detail.value)}
                />
              </View>

              <View className={styles.submitBtn} onClick={!submitting ? handleCreateOutbound : undefined}>
                <Text className={styles.submitBtnText}>
                  {submitting ? '处理中...' : '确认办理出库'}
                </Text>
              </View>

              <View className={styles.ruleHint}>
                <Text className={styles.ruleHintText}>
                  💡 严格按「先进先出」规则扣减最早入仓的可出批次库存；超期/锁定批次不可出库；额度不足需先申请。
                </Text>
              </View>
            </View>

            <View className={styles.fifoSection}>
              <View className={styles.fifoHeader}>
                <Text className={styles.fifoIcon}>📋</Text>
                <Text className={styles.fifoTitle}>出库优先队列（按入仓日期排序）</Text>
              </View>
              {fifoBatches.length > 0 ? (
                fifoBatches.map((batch, index) => (
                  <View key={batch.id} className={styles.fifoCard}>
                    <View className={styles.fifoCardTop}>
                      <Text className={styles.fifoBatchNo}>{batch.batchNo}</Text>
                      <Text className={styles.fifoOrder}>第{index + 1}优先</Text>
                    </View>
                    <View className={styles.fifoBody}>
                      <View className={styles.fifoInfoItem}>
                        <Text className={styles.fifoInfoLabel}>品种</Text>
                        <Text className={styles.fifoInfoValue}>{batch.grainType}</Text>
                      </View>
                      <View className={styles.fifoInfoItem}>
                        <Text className={styles.fifoInfoLabel}>仓号</Text>
                        <Text className={styles.fifoInfoValue}>{batch.warehouseNo}</Text>
                      </View>
                      <View className={styles.fifoInfoItem}>
                        <Text className={styles.fifoInfoLabel}>剩余</Text>
                        <Text className={styles.fifoInfoValue}>{batch.remainingQuantity}{batch.unit}</Text>
                      </View>
                      <View className={styles.fifoInfoItem}>
                        <Text className={styles.fifoInfoLabel}>入仓</Text>
                        <Text className={styles.fifoInfoValue}>{batch.inboundDate}</Text>
                      </View>
                      {getDaysLeft(batch.expiryDate) <= 90 && (
                        <View className={styles.fifoInfoItem}>
                          <Text className={styles.fifoInfoLabel}>状态</Text>
                          <Text className={classnames(
                            styles.fifoInfoValue,
                            batch.status === 'warning' && styles.warningText
                          )}>
                            <StatusTag status={batch.status} text={
                              batch.status === 'warning' ? '临期' : batch.status
                            } size='small' />
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState message='暂无可出库批次' />
              )}
            </View>
          </View>
        )}

        {activeTab === 'pending' && (
          <View className={styles.content}>
            {pendingRecords.length > 0 ? (
              pendingRecords.map((record) => (
                <View key={record.id} className={styles.pendingCard}>
                  <View className={styles.pendingCardHeader}>
                    <Text className={styles.recordNo}>{record.outboundNo}</Text>
                    <StatusTag status={record.status} text={getOutboundStatusText(record.status)} size='small' />
                  </View>

                  <View className={styles.recordBody}>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>商户</Text>
                      <Text className={classnames(styles.recordInfoValue, styles.pendingMerchantName)}>{record.merchantName}</Text>
                    </View>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>数量</Text>
                      <Text className={classnames(styles.recordInfoValue, styles.pendingQuantity)}>{record.quantity}{record.unit}</Text>
                    </View>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>占用额度</Text>
                      <Text className={styles.recordInfoValue}>{record.quotaOccupied}{record.unit}</Text>
                    </View>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>日期</Text>
                      <Text className={styles.recordInfoValue}>{record.outboundDate}</Text>
                    </View>
                  </View>

                  {record.plannedDeductions.length > 0 && (
                    <View className={styles.pendingPlanList}>
                      {record.plannedDeductions.map((plan) => (
                        <View key={plan.batchId} className={styles.pendingPlanItem}>
                          <Text className={styles.pendingBatchNo}>{plan.batchNo}</Text>
                          <Text className={styles.pendingDeduct}>扣减 {plan.deductQuantity}{plan.unit}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {record.riskHints.length > 0 && (
                    <View className={styles.riskHintList}>
                      {record.riskHints.map((hint, idx) => (
                        <View key={idx} className={styles.riskHintItem}>
                          <Text className={styles.riskHintText}>⚠️ {hint}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View className={styles.reviewRow}>
                    <Input
                      className={styles.reviewInput}
                      placeholder='审批备注（选填）'
                      value={reviewRemarks[record.id] || ''}
                      onInput={(e) => setReviewRemarks((prev) => ({ ...prev, [record.id]: e.detail.value }))}
                    />
                  </View>
                  <View className={styles.reviewRow}>
                    <View
                      className={styles.approveBtn}
                      onClick={reviewing[record.id] ? undefined : () => handleReview(record.id, true)}
                    >
                      <Text className={styles.approveBtnText}>{reviewing[record.id] ? '处理中...' : '通过'}</Text>
                    </View>
                    <View
                      className={styles.rejectBtn}
                      onClick={reviewing[record.id] ? undefined : () => handleReview(record.id, false)}
                    >
                      <Text className={styles.rejectBtnText}>驳回</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState message='暂无待审核记录' />
            )}
          </View>
        )}

        {activeTab === 'records' && (
          <View className={styles.content}>
            {sortedRecords.length > 0 ? (
              sortedRecords.map((record) => (
                <View
                  key={record.id}
                  className={styles.recordCard}
                  onClick={() => handleRecordDetail(record.id)}
                >
                  <View className={styles.recordHeader}>
                    <Text className={styles.recordNo}>{record.outboundNo}</Text>
                    <StatusTag
                      status={record.status}
                      text={getOutboundStatusText(record.status)}
                      size='small'
                    />
                  </View>
                  <View className={styles.recordBody}>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>商户</Text>
                      <Text className={styles.recordInfoValue}>{record.merchantName}</Text>
                    </View>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>数量</Text>
                      <Text className={styles.recordInfoValue}>{record.quantity}{record.unit}</Text>
                    </View>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>日期</Text>
                      <Text className={styles.recordInfoValue}>{record.outboundDate}</Text>
                    </View>
                  </View>

                  {record.status === 'completed' && record.actualDeductions.length > 0 && (
                    <View className={styles.actualDeductList}>
                      {record.actualDeductions.map((d) => (
                        <View key={d.batchId} className={styles.actualDeductItem}>
                          <Text>{d.batchNo} 扣减 {d.deductQuantity}{d.unit}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {record.status === 'rejected' && record.reviewRemark && (
                    <View className={styles.rejectRemark}>
                      <Text>驳回原因：{record.reviewRemark}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <EmptyState message='暂无出库记录' />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default OutboundPage
