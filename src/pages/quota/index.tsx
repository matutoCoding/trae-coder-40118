import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import { getQuotaStatusText, getQuarterLabel, getCurrentQuarter } from '@/utils/helpers'
import QuotaBar from '@/components/QuotaBar'
import StatusTag from '@/components/StatusTag'
import styles from './index.module.scss'

const TABS = [
  { label: '额度总览', value: 'overview' },
  { label: '消费明细', value: 'consumption' }
]

const QuotaPage: React.FC = () => {
  const { quotas, outboundRecords } = useGrainStore()
  const [activeTab, setActiveTab] = useState('overview')

  const { quarter, year } = getCurrentQuarter()

  const currentQuotas = useMemo(() => {
    return quotas.filter((q) => q.quarter === quarter && q.year === year)
  }, [quotas, quarter, year])

  const totalQuota = useMemo(() => currentQuotas.reduce((s, q) => s + q.totalQuota, 0), [currentQuotas])
  const totalUsed = useMemo(() => currentQuotas.reduce((s, q) => s + q.usedQuota, 0), [currentQuotas])
  const totalRemaining = useMemo(() => currentQuotas.reduce((s, q) => s + q.remainingQuota, 0), [currentQuotas])

  const consumptionRecords = useMemo(() => {
    return outboundRecords
      .filter((r) => r.status === 'completed')
      .sort((a, b) => new Date(b.outboundDate).getTime() - new Date(a.outboundDate).getTime())
      .slice(0, 10)
  }, [outboundRecords])

  const handleApply = (merchantId: string, merchantName: string) => {
    Taro.navigateTo({ url: `/pages/quotaApply/index?merchantId=${merchantId}&merchantName=${merchantName}` })
  }

  const handleViewConsumption = (merchantId: string) => {
    Taro.navigateTo({ url: `/pages/consumption/index?merchantId=${merchantId}` })
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
        <View className={styles.summaryCard}>
          <View className={styles.summaryRow}>
            <View className={styles.summaryItem}>
              <View style={{ display: 'flex', alignItems: 'baseline' }}>
                <Text className={styles.summaryValue}>{totalQuota}</Text>
                <Text className={styles.summaryUnit}>吨</Text>
              </View>
              <Text className={styles.summaryLabel}>本季总额度</Text>
            </View>
            <View className={styles.summaryItem}>
              <View style={{ display: 'flex', alignItems: 'baseline' }}>
                <Text className={styles.summaryValue}>{totalUsed}</Text>
                <Text className={styles.summaryUnit}>吨</Text>
              </View>
              <Text className={styles.summaryLabel}>已使用</Text>
            </View>
            <View className={styles.summaryItem}>
              <View style={{ display: 'flex', alignItems: 'baseline' }}>
                <Text className={styles.summaryValue}>{totalRemaining}</Text>
                <Text className={styles.summaryUnit}>吨</Text>
              </View>
              <Text className={styles.summaryLabel}>剩余额度</Text>
            </View>
          </View>
        </View>

        {activeTab === 'overview' ? (
          <View className={styles.content}>
            {currentQuotas.map((quota) => (
              <View key={quota.id} className={styles.quotaCard}>
                <View className={styles.quotaHeader}>
                  <View>
                    <Text className={styles.merchantName}>{quota.merchantName}</Text>
                    <Text className={styles.quotaQuarter}>
                      {quota.year}年{getQuarterLabel(quota.quarter)}
                    </Text>
                  </View>
                  <StatusTag status={quota.status} text={getQuotaStatusText(quota.status)} size='small' />
                </View>
                <QuotaBar used={quota.usedQuota} total={quota.totalQuota} />
                <View style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24rpx', gap: '16rpx' }}>
                  {quota.status === 'exhausted' && (
                    <View
                      className={classnames(styles.quotaAction, styles.quotaActionApply)}
                      onClick={() => handleApply(quota.merchantId, quota.merchantName)}
                    >
                      <Text style={{ color: '#fff', fontSize: '24rpx', fontWeight: 500, whiteSpace: 'nowrap' }}>申请额度</Text>
                    </View>
                  )}
                  <View
                    className={classnames(styles.quotaAction, styles.quotaActionView)}
                    onClick={() => handleViewConsumption(quota.merchantId)}
                  >
                    <Text style={{ color: '#2D7D46', fontSize: '24rpx', fontWeight: 500, whiteSpace: 'nowrap' }}>查看明细</Text>
                  </View>
                </View>
              </View>
            ))}

            <View className={styles.resetNotice}>
              <Text className={styles.resetText}>
                💡 额度规则说明：每季度初额度按规则重置，不累加上季未用额度。额度用尽后需重新申请，审批通过后方可继续出库。
              </Text>
            </View>
          </View>
        ) : (
          <View className={styles.content}>
            {consumptionRecords.map((record) => (
              <View key={record.id} className={styles.consumptionCard}>
                <View className={styles.consumptionHeader}>
                  <Text className={styles.consumptionMerchant}>{record.merchantName}</Text>
                  <Text className={styles.consumptionDate}>{record.outboundDate}</Text>
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
                    <Text className={styles.consumptionLabel}>单号</Text>
                    <Text className={styles.consumptionValue}>{record.outboundNo}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default QuotaPage
