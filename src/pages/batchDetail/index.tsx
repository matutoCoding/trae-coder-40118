import React, { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGrainStore } from '@/store'
import { getBatchStatusText, getDaysLeft } from '@/utils/helpers'
import classnames from 'classnames'
import styles from './index.module.scss'

const BatchDetailPage: React.FC = () => {
  const { batches, outboundRecords, inspections } = useGrainStore()

  const params = Taro.getCurrentInstance().router?.params
  const batchId = params?.id || ''

  const batch = useMemo(() => batches.find((b) => b.id === batchId), [batches, batchId])

  const relatedOutbound = useMemo(() => {
    if (!batch) return []
    return outboundRecords.filter((r) => r.batchNo === batch.batchNo)
  }, [outboundRecords, batch])

  const relatedInspections = useMemo(() => {
    if (!batch) return []
    return inspections.filter((i) => i.batchNo === batch.batchNo)
  }, [inspections, batch])

  if (!batch) {
    return (
      <View className={styles.container}>
        <Text>批次不存在</Text>
      </View>
    )
  }

  const daysLeft = getDaysLeft(batch.expiryDate)
  const statusBannerClass = classnames(
    styles.statusBanner,
    batch.status === 'normal' && styles.statusBannerNormal,
    batch.status === 'warning' && styles.statusBannerWarning,
    batch.status === 'expired' && styles.statusBannerExpired,
    batch.status === 'locked' && styles.statusBannerLocked
  )

  return (
    <ScrollView scrollY style={{ height: '100vh' }}>
      <View className={styles.container}>
        <View className={statusBannerClass}>
          <View className={styles.statusHeader}>
            <Text className={styles.statusTitle}>{batch.batchNo}</Text>
            <View className={styles.statusTag}>
              <Text className={styles.statusTagText}>{getBatchStatusText(batch.status)}</Text>
            </View>
          </View>
          <Text className={styles.statusDesc}>
            {batch.grainType} · {batch.grade} · {batch.warehouseNo}
          </Text>
          {daysLeft <= 90 && daysLeft > 0 && (
            <Text className={styles.statusDesc}>距保质到期剩余 {daysLeft} 天</Text>
          )}
          {daysLeft <= 0 && (
            <Text className={styles.statusDesc}>已超过保质到期日，批次已锁定不可出库</Text>
          )}
        </View>

        <View className={styles.infoSection}>
          <Text className={styles.infoSectionTitle}>批次信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>粮食品种</Text>
            <Text className={styles.infoValue}>{batch.grainType}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>等级</Text>
            <Text className={styles.infoValue}>{batch.grade}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>仓号</Text>
            <Text className={styles.infoValue}>{batch.warehouseNo}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>入库数量</Text>
            <Text className={styles.infoValue}>{batch.quantity} {batch.unit}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>剩余数量</Text>
            <Text className={styles.infoValue}>{batch.remainingQuantity} {batch.unit}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>供应商</Text>
            <Text className={styles.infoValue}>{batch.supplier}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>入仓日期</Text>
            <Text className={styles.infoValue}>{batch.inboundDate}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={classnames(styles.infoLabel, batch.status === 'warning' || batch.status === 'expired' ? styles.expiryHighlight : '')}>保质到期</Text>
            <Text className={classnames(styles.infoValue, batch.status === 'warning' || batch.status === 'expired' ? styles.expiryHighlight : '')}>{batch.expiryDate}</Text>
          </View>
        </View>

        <View className={styles.infoSection}>
          <Text className={styles.infoSectionTitle}>检验信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>水分含量</Text>
            <Text className={styles.infoValue}>{batch.moistureContent}%</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>杂质率</Text>
            <Text className={styles.infoValue}>{batch.impurityRate}%</Text>
          </View>
          {batch.remark && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>备注</Text>
              <Text className={styles.infoValue}>{batch.remark}</Text>
            </View>
          )}
        </View>

        {relatedOutbound.length > 0 && (
          <View className={styles.timelineSection}>
            <Text className={styles.timelineTitle}>出库记录</Text>
            {relatedOutbound.map((record) => (
              <View key={record.id} className={styles.timelineItem}>
                <View className={styles.timelineDot} />
                {relatedOutbound.indexOf(record) < relatedOutbound.length - 1 && <View className={styles.timelineLine} />}
                <View className={styles.timelineContent}>
                  <Text className={styles.timelineEvent}>
                    出库 {record.quantity}{record.unit} → {record.merchantName}
                  </Text>
                  <Text className={styles.timelineDate}>{record.outboundDate}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {relatedInspections.length > 0 && (
          <View className={styles.timelineSection}>
            <Text className={styles.timelineTitle}>检验记录</Text>
            {relatedInspections.map((insp) => (
              <View key={insp.id} className={styles.timelineItem}>
                <View className={styles.timelineDot} />
                {relatedInspections.indexOf(insp) < relatedInspections.length - 1 && <View className={styles.timelineLine} />}
                <View className={styles.timelineContent}>
                  <Text className={styles.timelineEvent}>
                    {insp.inspectionType === 'full' ? '综合检验' : insp.inspectionType === 'moisture' ? '水分检测' : '杂质检测'}
                    {' - '}{insp.result === 'pass' ? '合格' : '不合格'}
                  </Text>
                  <Text className={styles.timelineDate}>
                    {insp.inspector} · {insp.inspectionDate}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default BatchDetailPage
