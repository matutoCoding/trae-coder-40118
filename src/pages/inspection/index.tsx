import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import { getInspectionResultText, getInspectionTypeText } from '@/utils/helpers'
import StatusTag from '@/components/StatusTag'
import EmptyState from '@/components/EmptyState'
import styles from './index.module.scss'

const FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '合格', value: 'pass' },
  { label: '不合格', value: 'fail' }
]

const InspectionPage: React.FC = () => {
  const { inspections } = useGrainStore()
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredInspections = useMemo(() => {
    let result = [...inspections].sort(
      (a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime()
    )
    if (activeFilter !== 'all') {
      result = result.filter((i) => i.result === activeFilter)
    }
    return result
  }, [inspections, activeFilter])

  return (
    <View className={styles.container}>
      <View className={styles.filterBar}>
        {FILTER_OPTIONS.map((opt) => (
          <View
            key={opt.value}
            className={classnames(styles.filterItem, activeFilter === opt.value && styles.filterItemActive)}
            onClick={() => setActiveFilter(opt.value)}
          >
            <Text className={classnames(styles.filterText, activeFilter === opt.value && styles.filterTextActive)}>
              {opt.label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.list} style={{ height: 'calc(100vh - 100rpx)' }}>
        {filteredInspections.length > 0 ? (
          filteredInspections.map((insp) => (
            <View
              key={insp.id}
              className={classnames(styles.inspectionCard, insp.result === 'fail' && styles.inspectionCardFail)}
            >
              <View className={styles.inspectionHeader}>
                <Text className={styles.inspectionBatchNo}>{insp.batchNo}</Text>
                <StatusTag status={insp.result} text={getInspectionResultText(insp.result)} size='small' />
              </View>
              <View className={styles.inspectionBody}>
                <View className={styles.inspectionInfoItem}>
                  <Text className={styles.inspectionInfoLabel}>品种</Text>
                  <Text className={styles.inspectionInfoValue}>{insp.grainType}</Text>
                </View>
                <View className={styles.inspectionInfoItem}>
                  <Text className={styles.inspectionInfoLabel}>类型</Text>
                  <Text className={styles.inspectionInfoValue}>{getInspectionTypeText(insp.inspectionType)}</Text>
                </View>
                <View className={styles.inspectionInfoItem}>
                  <Text className={styles.inspectionInfoLabel}>水分</Text>
                  <Text className={styles.inspectionInfoValue}>{insp.moistureContent}%</Text>
                </View>
                <View className={styles.inspectionInfoItem}>
                  <Text className={styles.inspectionInfoLabel}>杂质</Text>
                  <Text className={styles.inspectionInfoValue}>{insp.impurityRate}%</Text>
                </View>
                <View className={styles.inspectionInfoItem}>
                  <Text className={styles.inspectionInfoLabel}>检验员</Text>
                  <Text className={styles.inspectionInfoValue}>{insp.inspector}</Text>
                </View>
                <View className={styles.inspectionInfoItem}>
                  <Text className={styles.inspectionInfoLabel}>日期</Text>
                  <Text className={styles.inspectionInfoValue}>{insp.inspectionDate}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <EmptyState message='暂无检验记录' />
        )}
      </ScrollView>
    </View>
  )
}

export default InspectionPage
