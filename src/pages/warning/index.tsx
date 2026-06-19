import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import { getDaysLeft } from '@/utils/helpers'
import EmptyState from '@/components/EmptyState'
import styles from './index.module.scss'

const TABS = [
  { label: '临期预警', value: 'warning' },
  { label: '超期/锁定', value: 'expired' }
]

const WarningPage: React.FC = () => {
  const { getBatchesWithComputedStatus } = useGrainStore()
  const [activeTab, setActiveTab] = useState('warning')

  const allBatches = useMemo(() => getBatchesWithComputedStatus(), [getBatchesWithComputedStatus])

  const warningList = useMemo(() => {
    const filtered = allBatches.filter((b) => {
      if (activeTab === 'warning') return b.status === 'warning'
      return b.status === 'expired' || b.status === 'locked'
    })
    return filtered
      .map((b) => ({ ...b, daysLeft: getDaysLeft(b.expiryDate) }))
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [allBatches, activeTab])

  return (
    <View className={styles.container}>
      <View className={styles.tabs}>
        {TABS.map((tab) => (
          <View
            key={tab.value}
            className={classnames(styles.tab, activeTab === tab.value && styles.tabActive)}
            onClick={() => setActiveTab(tab.value)}
          >
            <Text className={styles.tabText}>{tab.label} ({warningList.length})</Text>
            {activeTab === tab.value && <View className={styles.tabLine} />}
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.list} style={{ height: 'calc(100vh - 120rpx)' }}>
        {warningList.length > 0 ? (
          warningList.map((item) => (
            <View
              key={item.id}
              className={classnames(
                styles.warningCard,
                item.status === 'warning' && styles.warningCardBorder,
                item.status === 'expired' && styles.dangerCardBorder,
                item.status === 'locked' && styles.lockedCardBorder
              )}
              onClick={() => Taro.navigateTo({ url: `/pages/batchDetail/index?id=${item.id}` })}
            >
              <View className={styles.warningHeader}>
                <Text className={styles.warningBatchNo}>{item.batchNo}</Text>
                <Text
                  className={classnames(
                    styles.warningDays,
                    item.status === 'warning' && styles.warningDaysWarning,
                    item.status === 'expired' && styles.warningDaysDanger,
                    item.status === 'locked' && styles.warningDaysLocked
                  )}
                >
                  {item.daysLeft > 0 ? `剩${item.daysLeft}天` : '已超期'}
                </Text>
              </View>
              <View className={styles.warningBody}>
                <View className={styles.warningInfoItem}>
                  <Text className={styles.warningInfoLabel}>品种</Text>
                  <Text className={styles.warningInfoValue}>{item.grainType}</Text>
                </View>
                <View className={styles.warningInfoItem}>
                  <Text className={styles.warningInfoLabel}>仓号</Text>
                  <Text className={styles.warningInfoValue}>{item.warehouseNo}</Text>
                </View>
                <View className={styles.warningInfoItem}>
                  <Text className={styles.warningInfoLabel}>剩余</Text>
                  <Text className={styles.warningInfoValue}>{item.remainingQuantity}{item.unit}</Text>
                </View>
                <View className={styles.warningInfoItem}>
                  <Text className={styles.warningInfoLabel}>到期日</Text>
                  <Text className={styles.warningInfoValue}>{item.expiryDate}</Text>
                </View>
              </View>
              {item.status === 'locked' && (
                <View className={styles.lockedTag}>
                  <Text className={styles.lockedTagText}>🔒 超期锁定 · 不可出库</Text>
                </View>
              )}
              {item.status === 'expired' && (
                <View className={styles.lockedTag}>
                  <Text className={styles.lockedTagText}>⚠️ 已超期 · 自动排除出库队列</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <EmptyState message={activeTab === 'warning' ? '暂无临期批次，状态良好' : '暂无超期/锁定批次'} />
        )}
      </ScrollView>
    </View>
  )
}

export default WarningPage
