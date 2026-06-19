import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import { getQuarterLabel, getCurrentQuarter } from '@/utils/helpers'
import QuotaBar from '@/components/QuotaBar'
import EmptyState from '@/components/EmptyState'
import styles from './index.module.scss'

const TABS = [
  { label: '额度总览', value: 'overview' },
  { label: '消费明细', value: 'consumption' }
]

const QuotaPage: React.FC = () => {
  const { getActiveQuotas, outboundRecords, applyQuota } = useGrainStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)

  const quotas = useMemo(() => getActiveQuotas(), [getActiveQuotas])
  const { year, quarter } = getCurrentQuarter()
  const quarterLabel = `${year}年${getQuarterLabel(quarter)}额度`

  const totalBase = useMemo(() => quotas.reduce((sum, q) => sum + q.baseQuota, 0), [quotas])
  const totalUsed = useMemo(() => quotas.reduce((sum, q) => sum + q.used, 0), [quotas])
  const totalApply = useMemo(() => quotas.reduce((sum, q) => sum + (q.approved || 0), 0), [quotas])
  const totalRemaining = totalBase + totalApply - totalUsed

  const filteredConsumption = useMemo(() => {
    const sorted = [...outboundRecords].sort(
      (a, b) => new Date(b.outboundDate).getTime() - new Date(a.outboundDate).getTime()
    )
    if (selectedMerchantId) {
      return sorted.filter((r) => r.merchantId === selectedMerchantId)
    }
    return sorted
  }, [outboundRecords, selectedMerchantId])

  const handleApply = (quota) => {
    Taro.navigateTo({
      url: `/pages/quotaApply/index?merchantId=${quota.merchantId}&merchantName=${encodeURIComponent(quota.merchantName)}`
    })
  }

  const handleViewConsumption = (quota) => {
    setSelectedMerchantId(quota.merchantId)
    setActiveTab('consumption')
  }

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>{quarterLabel}</Text>
        <View className={styles.quotaHeaderStats}>
          <View className={styles.headerStatItem}>
            <Text className={styles.headerStatValue}>{totalBase.toFixed(0)}<Text style={{ fontSize: '22rpx', color: '#8A8A8A' }}>吨</Text></Text>
            <Text className={styles.headerStatLabel}>当季总额度</Text>
          </View>
          <View className={styles.headerStatItem}>
            <Text className={styles.headerStatValue}>{totalUsed.toFixed(0)}<Text style={{ fontSize: '22rpx', color: '#8A8A8A' }}>吨</Text></Text>
            <Text className={styles.headerStatLabel}>已使用</Text>
          </View>
          <View className={styles.headerStatItem}>
            <Text className={classnames(styles.headerStatValue, totalRemaining < 0 && styles.headerStatValueDanger)}>
              {totalRemaining.toFixed(0)}<Text style={{ fontSize: '22rpx', color: '#8A8A8A' }}>吨</Text>
            </Text>
            <Text className={styles.headerStatLabel}>剩余可用</Text>
          </View>
          {totalApply > 0 && (
            <View className={styles.headerStatItem}>
              <Text className={styles.headerStatValue} style={{ color: '#2D7D46' }}>+{totalApply.toFixed(0)}<Text style={{ fontSize: '22rpx', color: '#8A8A8A' }}>吨</Text></Text>
              <Text className={styles.headerStatLabel}>已批追加</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.tabs}>
        {TABS.map((tab) => (
          <View
            key={tab.value}
            className={classnames(styles.tab, activeTab === tab.value && styles.tabActive)}
            onClick={() => {
              setActiveTab(tab.value)
              if (tab.value === 'overview') setSelectedMerchantId(null)
            }}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
            {activeTab === tab.value && <View className={styles.tabLine} />}
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.list} style={{ height: 'calc(100vh - 380rpx)' }}>
        {activeTab === 'overview' ? (
          <View>
            {quotas.length > 0 ? (
              quotas.map((quota) => (
                <View key={quota.id} className={styles.quotaCard}>
                  <View className={styles.quotaCardHeader}>
                    <View className={styles.quotaMerchantInfo}>
                      <Text className={styles.quotaMerchantName}>{quota.merchantName}</Text>
                      <Text className={styles.quotaMerchantId}>{quota.merchantId}</Text>
                    </View>
                    <View
                      className={classnames(
                        styles.quotaStatus,
                        quota.used / (quota.baseQuota + (quota.approved || 0)) >= 1 && styles.quotaStatusExhausted,
                        quota.used / (quota.baseQuota + (quota.approved || 0)) >= 0.8 &&
                          quota.used / (quota.baseQuota + (quota.approved || 0)) < 1 &&
                          styles.quotaStatusWarning
                      )}
                    >
                      <Text className={styles.quotaStatusText}>
                        {quota.used / (quota.baseQuota + (quota.approved || 0)) >= 1
                          ? '额度用尽'
                          : quota.used / (quota.baseQuota + (quota.approved || 0)) >= 0.8
                          ? '即将用尽'
                          : '正常'}
                      </Text>
                    </View>
                  </View>
                  <QuotaBar
                    used={quota.used}
                    base={quota.baseQuota}
                    approved={quota.approved}
                  />
                  <View className={styles.quotaActions}>
                    <View
                      className={classnames(
                        styles.quotaActionBtn,
                        styles.quotaActionBtnPrimary
                      )}
                      onClick={() => handleApply(quota)}
                    >
                      <Text className={styles.quotaActionBtnText}>申请额度</Text>
                    </View>
                    <View
                      className={classnames(
                        styles.quotaActionBtn,
                        styles.quotaActionBtnDefault
                      )}
                      onClick={() => handleViewConsumption(quota)}
                    >
                      <Text className={styles.quotaActionBtnTextSecondary}>消费明细</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState message='暂无额度数据，季度重置时将自动生成' />
            )}
          </View>
        ) : (
          <View>
            {selectedMerchantId && (
              <View className={styles.merchantFilter}>
                <Text className={styles.merchantFilterLabel}>当前筛选：</Text>
                <Text className={styles.merchantFilterValue}>
                  {quotas.find((q) => q.merchantId === selectedMerchantId)?.merchantName || selectedMerchantId}
                </Text>
                <View
                  className={styles.merchantFilterClear}
                  onClick={() => setSelectedMerchantId(null)}
                >
                  <Text className={styles.merchantFilterClearText}>清除</Text>
                </View>
              </View>
            )}
            {filteredConsumption.length > 0 ? (
              filteredConsumption.map((record) => (
                <View
                  key={record.id}
                  className={styles.consumptionItem}
                  onClick={() => Taro.navigateTo({ url: `/pages/outboundDetail/index?id=${record.id}` })}
                >
                  <View className={styles.consumptionLeft}>
                    <Text className={styles.consumptionMerchant}>{record.merchantName}</Text>
                    <Text className={styles.consumptionNo}>{record.outboundNo} · {record.outboundDate}</Text>
                  </View>
                  <View className={styles.consumptionRight}>
                    <Text className={styles.consumptionQuantity}>-{record.quantity}{record.unit}</Text>
                    <Text className={styles.consumptionAmount}>扣减额度 {record.quantity}{record.unit}</Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState message='暂无消费记录' />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default QuotaPage
