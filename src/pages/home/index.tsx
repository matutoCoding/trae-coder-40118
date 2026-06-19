import React, { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGrainStore } from '@/store'
import { getDaysLeft } from '@/utils/helpers'
import StatCard from '@/components/StatCard'
import classnames from 'classnames'
import styles from './index.module.scss'

const HomePage: React.FC = () => {
  const { getBatchesWithComputedStatus, getActiveQuotas, outboundRecords } = useGrainStore()

  const allBatches = useMemo(() => getBatchesWithComputedStatus(), [getBatchesWithComputedStatus])
  const quotas = useMemo(() => getActiveQuotas(), [getActiveQuotas])

  const totalQuantity = useMemo(
    () => allBatches.reduce((sum, b) => sum + b.remainingQuantity, 0),
    [allBatches]
  )
  const totalValue = totalQuantity * 3.5

  const warningCount = useMemo(
    () => allBatches.filter((b) => b.status === 'warning').length,
    [allBatches]
  )
  const expiredCount = useMemo(
    () => allBatches.filter((b) => b.status === 'expired' || b.status === 'locked').length,
    [allBatches]
  )

  const urgentBatches = useMemo(
    () =>
      allBatches
        .filter((b) => b.status === 'warning' || b.status === 'expired' || b.status === 'locked')
        .map((b) => ({ ...b, daysLeft: getDaysLeft(b.expiryDate) }))
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5),
    [allBatches]
  )

  const recentOutbound = useMemo(
    () => [...outboundRecords].sort((a, b) => new Date(b.outboundDate).getTime() - new Date(a.outboundDate).getTime()).slice(0, 5),
    [outboundRecords]
  )

  const totalQuotaUsed = useMemo(() => quotas.reduce((sum, q) => sum + q.used, 0), [quotas])
  const totalQuotaBase = useMemo(() => quotas.reduce((sum, q) => sum + q.baseQuota + (q.approved || 0), 0), [quotas])
  const quotaUsagePercent = totalQuotaBase > 0 ? Math.min((totalQuotaUsed / totalQuotaBase) * 100, 100) : 0

  return (
    <ScrollView scrollY style={{ height: '100vh' }}>
      <View className={styles.container}>
        <View className={styles.header}>
          <Text className={styles.headerTitle}>粮库出入库溯源系统</Text>
          <Text className={styles.headerDate}>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </Text>
        </View>

        <View className={styles.statsGrid}>
          <StatCard
            title='总库存'
            value={`${totalQuantity.toFixed(0)}吨`}
            trend={`价值 ¥${totalValue.toFixed(0)}万`}
            theme='primary'
          />
          <StatCard
            title='批次总数'
            value={allBatches.length.toString()}
            trend={`正常 ${allBatches.length - warningCount - expiredCount} 批`}
            theme='default'
          />
          <StatCard
            title='临期预警'
            value={warningCount.toString()}
            trend={warningCount > 0 ? '需优先出库' : '状态良好'}
            theme='warning'
            onClick={() => Taro.switchTab({ url: '/pages/outbound/index' })}
          />
          <StatCard
            title='超期锁定'
            value={expiredCount.toString()}
            trend={expiredCount > 0 ? '禁止出库' : '无异常'}
            theme='danger'
            onClick={() => Taro.navigateTo({ url: '/pages/warning/index' })}
          />
        </View>

        <View className={styles.quotaOverview}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>当季额度总览</Text>
            <Text
              className={styles.sectionAction}
              onClick={() => Taro.switchTab({ url: '/pages/quota/index' })}
            >
              查看详情 →
            </Text>
          </View>
          <View className={styles.quotaStats}>
            <View className={styles.statRow}>
              <Text className={styles.quotaStatValue}>
                {totalQuotaUsed.toFixed(0)}
                <Text style={{ fontSize: '24rpx', color: '#8A8A8A' }}>/{totalQuotaBase.toFixed(0)}吨</Text>
              </Text>
              <Text className={styles.quotaStatLabel}>全粮商已使用</Text>
            </View>
            <View className={styles.quotaProgressWrap}>
              <View className={styles.quotaProgress}>
                <View
                  className={classnames(
                    styles.quotaProgressBar,
                    quotaUsagePercent > 80 && styles.quotaProgressBarDanger,
                    quotaUsagePercent >= 50 && quotaUsagePercent <= 80 && styles.quotaProgressBarWarn
                  )}
                  style={{ width: `${quotaUsagePercent}%` }}
                />
              </View>
              <Text className={styles.quotaPercent}>{quotaUsagePercent.toFixed(0)}%</Text>
            </View>
          </View>
        </View>

        <View className={styles.urgentSection}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>效期紧急提醒</Text>
          </View>
          {urgentBatches.length > 0 ? (
            urgentBatches.map((batch) => (
              <View
                key={batch.id}
                className={classnames(
                  styles.urgentCard,
                  batch.status === 'warning' && styles.urgentCardWarning,
                  batch.status === 'expired' && styles.urgentCardDanger,
                  batch.status === 'locked' && styles.urgentCardDanger
                )}
                onClick={() => Taro.navigateTo({ url: `/pages/batchDetail/index?id=${batch.id}` })}
              >
                <View className={styles.urgentLeft}>
                  <Text className={styles.urgentBatchNo}>{batch.batchNo}</Text>
                  <Text className={styles.urgentBatchInfo}>
                    {batch.grainType} · {batch.warehouseNo} · {batch.remainingQuantity}{batch.unit}
                  </Text>
                </View>
                <View className={styles.urgentRight}>
                  <Text
                    className={classnames(
                      styles.urgentDays,
                      batch.status === 'warning' && styles.urgentDaysWarn,
                      (batch.status === 'expired' || batch.status === 'locked') && styles.urgentDaysDanger
                    )}
                  >
                    {batch.daysLeft > 0 ? `剩${batch.daysLeft}天` : '已超期'}
                  </Text>
                  <Text className={styles.urgentDate}>到期 {batch.expiryDate}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className={styles.emptyTip}>
              <Text className={styles.emptyTipText}>所有批次状态良好 👍</Text>
            </View>
          )}
        </View>

        <View className={styles.recentSection}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>最近出库</Text>
            <Text
              className={styles.sectionAction}
              onClick={() => Taro.switchTab({ url: '/pages/outbound/index' })}
            >
              出库记录 →
            </Text>
          </View>
          {recentOutbound.length > 0 ? (
            recentOutbound.map((record) => (
              <View key={record.id} className={styles.recentItem}>
                <View className={styles.recentLeft}>
                  <Text className={styles.recentMerchant}>{record.merchantName}</Text>
                  <Text className={styles.recentNo}>{record.outboundNo}</Text>
                </View>
                <View className={styles.recentRight}>
                  <Text className={styles.recentQuantity}>-{record.quantity}{record.unit}</Text>
                  <Text className={styles.recentDate}>{record.outboundDate}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className={styles.emptyTip}>
              <Text className={styles.emptyTipText}>暂无出库记录</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}

export default HomePage
