import React, { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import { getOutboundStatusText } from '@/utils/helpers'
import StatusTag from '@/components/StatusTag'
import { PlannedDeduction } from '@/types'
import styles from './index.module.scss'

const OutboundDetailPage: React.FC = () => {
  const { outboundRecords } = useGrainStore()
  const params = Taro.getCurrentInstance().router?.params
  const recordId = params?.id || ''

  const record = useMemo(() => outboundRecords.find((r) => r.id === recordId), [outboundRecords, recordId])

  if (!record) {
    return (
      <View className={styles.container}>
        <Text>出库记录不存在</Text>
      </View>
    )
  }

  const isCompleted = record.status === 'completed'
  const isRejected = record.status === 'rejected'
  const isReviewed = record.status !== 'pending'
  const hasRiskHints = record.riskHints && record.riskHints.length > 0

  const handleBatchClick = (batchId: string) => {
    Taro.navigateTo({ url: `/pages/batchDetail/index?id=${batchId}` })
  }

  const renderPlannedDeductionItem = (deduction: PlannedDeduction) => (
    <View className={styles.deductionItem} key={deduction.batchId}>
      <Text className={styles.deductionBatchNo}>
        {deduction.batchNo}
      </Text>
      <View className={styles.deductionDetail}>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>粮食品种</Text>
          <Text className={styles.infoValue}>{deduction.grainType}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>仓号</Text>
          <Text className={styles.infoValue}>{deduction.warehouseNo}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>入库日期</Text>
          <Text className={styles.infoValue}>{deduction.inboundDate}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>到期日期</Text>
          <Text className={styles.infoValue}>{deduction.expiryDate}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>扣减数量</Text>
          <Text className={styles.infoValue}>{deduction.deductQuantity} {deduction.unit}</Text>
        </View>
      </View>
    </View>
  )

  const renderActualDeductionItem = (deduction: PlannedDeduction) => (
    <View className={styles.deductionItem} key={deduction.batchId}>
      <Text
        className={classnames(styles.deductionBatchNo, styles.deductionBatchNoClickable)}
        onClick={() => handleBatchClick(deduction.batchId)}
      >
        {deduction.batchNo}
      </Text>
      <View className={styles.deductionDetail}>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>粮食品种</Text>
          <Text className={styles.infoValue}>{deduction.grainType}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>仓号</Text>
          <Text className={styles.infoValue}>{deduction.warehouseNo}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>扣减数量</Text>
          <Text className={styles.infoValue}>{deduction.deductQuantity} {deduction.unit}</Text>
        </View>
      </View>
    </View>
  )

  return (
    <ScrollView scrollY style={{ height: '100vh' }}>
      <View className={styles.container}>
        {isRejected && (
          <View className={styles.rejectBanner}>
            <Text className={styles.rejectBannerText}>{record.reviewRemark || '该出库申请已驳回'}</Text>
          </View>
        )}

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>出库信息</Text>
          <View className={styles.statusRow}>
            <Text className={styles.infoLabel}>状态</Text>
            <StatusTag status={record.status} text={getOutboundStatusText(record.status)} />
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>出库单号</Text>
            <Text className={styles.infoValue}>{record.outboundNo}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>商户名称</Text>
            <Text className={styles.infoValue}>{record.merchantName}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>出库数量</Text>
            <Text className={styles.infoValue}>{record.quantity} {record.unit}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>粮食品种</Text>
            <Text className={styles.infoValue}>{record.grainType}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>出库日期</Text>
            <Text className={styles.infoValue}>{record.outboundDate}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>操作人</Text>
            <Text className={styles.infoValue}>{record.operator}</Text>
          </View>
        </View>

        {isReviewed && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>审批信息</Text>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>审批人</Text>
              <Text className={styles.infoValue}>{record.reviewer}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>审批日期</Text>
              <Text className={styles.infoValue}>{record.reviewDate}</Text>
            </View>
            {record.reviewRemark && (
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>审批备注</Text>
                <Text className={styles.infoValue}>{record.reviewRemark}</Text>
              </View>
            )}
          </View>
        )}

        {record.plannedDeductions.length > 0 && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>计划扣减</Text>
            <View className={styles.deductionList}>
              {record.plannedDeductions.map((d) => renderPlannedDeductionItem(d))}
            </View>
          </View>
        )}

        {isCompleted && record.actualDeductions.length > 0 && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>实际扣减</Text>
            <View className={styles.deductionList}>
              {record.actualDeductions.map((d) => renderActualDeductionItem(d))}
            </View>
          </View>
        )}

        {hasRiskHints && (
          <View className={classnames(styles.section, styles.riskSection)}>
            <Text className={styles.sectionTitle}>风险提示</Text>
            {record.riskHints.map((hint, idx) => (
              <View className={styles.riskItem} key={idx}>
                <Text>{hint}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default OutboundDetailPage
