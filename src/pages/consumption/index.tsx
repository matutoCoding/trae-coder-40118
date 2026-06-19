import React, { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGrainStore } from '@/store'
import { getOutboundStatusText } from '@/utils/helpers'
import StatusTag from '@/components/StatusTag'
import EmptyState from '@/components/EmptyState'
import styles from './index.module.scss'

const ConsumptionPage: React.FC = () => {
  const { outboundRecords, quotas } = useGrainStore()
  const params = Taro.getCurrentInstance().router?.params
  const merchantId = params?.merchantId || ''

  const merchantQuota = useMemo(() => {
    return quotas.find((q) => q.merchantId === merchantId && (q.status === 'active' || q.status === 'exhausted'))
  }, [quotas, merchantId])

  const merchantRecords = useMemo(() => {
    return outboundRecords
      .filter((r) => r.merchantId === merchantId)
      .sort((a, b) => new Date(b.outboundDate).getTime() - new Date(a.outboundDate).getTime())
  }, [outboundRecords, merchantId])

  return (
    <View className={styles.container}>
      {merchantQuota && (
        <View className={styles.merchantCard}>
          <Text className={styles.merchantName}>{merchantQuota.merchantName}</Text>
          <View className={styles.merchantStats}>
            <View className={styles.merchantStatItem}>
              <Text className={styles.merchantStatValue}>{merchantQuota.totalQuota}</Text>
              <Text className={styles.merchantStatLabel}>总额度(吨)</Text>
            </View>
            <View className={styles.merchantStatItem}>
              <Text className={styles.merchantStatValue}>{merchantQuota.usedQuota}</Text>
              <Text className={styles.merchantStatLabel}>已用(吨)</Text>
            </View>
            <View className={styles.merchantStatItem}>
              <Text className={styles.merchantStatValue}>{merchantQuota.remainingQuota}</Text>
              <Text className={styles.merchantStatLabel}>剩余(吨)</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView scrollY className={styles.list} style={{ height: merchantQuota ? 'calc(100vh - 340rpx)' : '100vh' }}>
        {merchantRecords.length > 0 ? (
          merchantRecords.map((record) => (
            <View key={record.id} className={styles.consumptionCard}>
              <View className={styles.consumptionHeader}>
                <Text className={styles.consumptionNo}>{record.outboundNo}</Text>
                <StatusTag status={record.status} text={getOutboundStatusText(record.status)} size='small' />
              </View>
              <View className={styles.consumptionBody}>
                <View className={styles.consumptionInfo}>
                  <Text className={styles.consumptionLabel}>品种</Text>
                  <Text className={styles.consumptionValue}>{record.grainType}</Text>
                </View>
                <View className={styles.consumptionInfo}>
                  <Text className={styles.consumptionLabel}>数量</Text>
                  <Text className={styles.consumptionValue}>{record.quantity}{record.unit}</Text>
                </View>
                <View className={styles.consumptionInfo}>
                  <Text className={styles.consumptionLabel}>批号</Text>
                  <Text className={styles.consumptionValue}>{record.batchNo}</Text>
                </View>
                <View className={styles.consumptionInfo}>
                  <Text className={styles.consumptionLabel}>日期</Text>
                  <Text className={styles.consumptionValue}>{record.outboundDate}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <EmptyState message='暂无消费记录' />
        )}
      </ScrollView>
    </View>
  )
}

export default ConsumptionPage
