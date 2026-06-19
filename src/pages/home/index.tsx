import React, { useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGrainStore } from '@/store'
import { getDaysLeft, getOutboundStatusText } from '@/utils/helpers'
import StatusTag from '@/components/StatusTag'
import styles from './index.module.scss'

const HomePage: React.FC = () => {
  const { batches, outboundRecords, quotas } = useGrainStore()

  const stats = useMemo(() => {
    const totalStock = batches.reduce((sum, b) => sum + b.remainingQuantity, 0)
    const warningCount = batches.filter((b) => b.status === 'warning').length
    const expiredCount = batches.filter((b) => b.status === 'expired' || b.status === 'locked').length
    const activeMerchants = quotas.filter((q) => q.status === 'active').length
    return { totalStock, warningCount, expiredCount, activeMerchants }
  }, [batches, quotas])

  const warningBatches = useMemo(() => {
    return batches
      .filter((b) => b.status === 'warning' || b.status === 'expired' || b.status === 'locked')
      .map((b) => ({ ...b, daysLeft: getDaysLeft(b.expiryDate) }))
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3)
  }, [batches])

  const recentOutbound = useMemo(() => {
    return outboundRecords
      .filter((r) => r.status === 'completed' || r.status === 'approved')
      .sort((a, b) => new Date(b.outboundDate).getTime() - new Date(a.outboundDate).getTime())
      .slice(0, 4)
  }, [outboundRecords])

  const handleNavigate = (url: string) => {
    Taro.navigateTo({ url })
  }

  const handleSwitchTab = (url: string) => {
    Taro.switchTab({ url })
  }

  return (
    <View className={styles.container}>
      <View className={styles.heroSection}>
        <Text className={styles.heroTitle}>粮库溯源管理</Text>
        <Text className={styles.heroSubtitle}>智能仓储 · 安全溯源 · 高效管控</Text>
      </View>

      <View className={styles.statsGrid}>
        <View className={styles.statItem}>
          <View className={styles.statRow}>
            <Text className={styles.statValue}>{stats.totalStock}</Text>
            <Text className={styles.statUnit}>吨</Text>
          </View>
          <Text className={styles.statLabel}>库存总量</Text>
        </View>
        <View className={styles.statItem}>
          <View className={styles.statRow}>
            <Text className={styles.statValue}>{stats.warningCount}</Text>
          </View>
          <Text className={styles.statLabel}>临期批次</Text>
        </View>
        <View className={styles.statItem}>
          <View className={styles.statRow}>
            <Text className={styles.statValue}>{stats.expiredCount}</Text>
          </View>
          <Text className={styles.statLabel}>超期/锁定</Text>
        </View>
        <View className={styles.statItem}>
          <View className={styles.statRow}>
            <Text className={styles.statValue}>{stats.activeMerchants}</Text>
          </View>
          <Text className={styles.statLabel}>活跃商户</Text>
        </View>
      </View>

      <View className={styles.quickActions}>
        <View className={styles.actionItem} onClick={() => handleNavigate('/pages/inbound/index')}>
          <Text className={styles.actionIcon}>📥</Text>
          <Text className={styles.actionText}>入库登记</Text>
        </View>
        <View className={styles.actionItem} onClick={() => handleSwitchTab('/pages/outbound/index')}>
          <Text className={styles.actionIcon}>📤</Text>
          <Text className={styles.actionText}>出库操作</Text>
        </View>
        <View className={styles.actionItem} onClick={() => handleNavigate('/pages/warning/index')}>
          <Text className={styles.actionIcon}>⚠️</Text>
          <Text className={styles.actionText}>临期预警</Text>
        </View>
        <View className={styles.actionItem} onClick={() => handleNavigate('/pages/inspection/index')}>
          <Text className={styles.actionIcon}>🔬</Text>
          <Text className={styles.actionText}>检验记录</Text>
        </View>
      </View>

      {(stats.warningCount > 0 || stats.expiredCount > 0) && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>效期预警</Text>
            <Text className={styles.sectionMore} onClick={() => handleNavigate('/pages/warning/index')}>
              查看全部 ›
            </Text>
          </View>
          <View className={styles.warningCard}>
            <View className={styles.warningHeader}>
              <View className={`${styles.warningDot} ${stats.expiredCount > 0 ? styles.dangerDot : ''}`} />
              <Text className={styles.warningTitle}>
                {stats.expiredCount > 0 ? '超期锁定' : '临期提醒'}
              </Text>
              <Text className={styles.warningCount}>
                {stats.warningCount + stats.expiredCount} 批次需关注
              </Text>
            </View>
            {warningBatches.map((item) => (
              <View key={item.id} className={styles.warningItem}>
                <View>
                  <Text className={styles.warningBatchNo}>{item.batchNo}</Text>
                  <Text className={styles.warningInfo}>
                    {item.grainType} · {item.warehouseNo} · 剩余{item.remainingQuantity}{item.unit}
                  </Text>
                </View>
                <Text
                  className={`${styles.warningDays} ${item.daysLeft <= 0 ? styles.warningDaysDanger : styles.warningDaysWarning}`}
                >
                  {item.daysLeft > 0 ? `剩${item.daysLeft}天` : '已超期'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>最近出库</Text>
          <Text className={styles.sectionMore} onClick={() => handleSwitchTab('/pages/outbound/index')}>
            查看全部 ›
          </Text>
        </View>
        <View className={styles.recentCard}>
          {recentOutbound.map((item) => (
            <View key={item.id} className={styles.recentItem}>
              <View className={`${styles.recentIcon} ${styles.recentIconOut}`}>📤</View>
              <View className={styles.recentContent}>
                <Text className={styles.recentTitle}>
                  {item.merchantName} · {item.grainType}{item.quantity}{item.unit}
                </Text>
                <Text className={styles.recentDesc}>{item.outboundNo}</Text>
              </View>
              <View>
                <StatusTag status={item.status} text={getOutboundStatusText(item.status)} size='small' />
                <Text className={styles.recentTime}>{item.outboundDate}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

export default HomePage
