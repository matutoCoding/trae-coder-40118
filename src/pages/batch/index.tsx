import React, { useState, useMemo } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import BatchCard from '@/components/BatchCard'
import EmptyState from '@/components/EmptyState'
import styles from './index.module.scss'

const FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 'normal' },
  { label: '临期', value: 'warning' },
  { label: '超期', value: 'expired' },
  { label: '锁定', value: 'locked' }
]

const BatchPage: React.FC = () => {
  const { batches } = useGrainStore()
  const [keyword, setKeyword] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredBatches = useMemo(() => {
    let result = batches
    if (activeFilter !== 'all') {
      result = result.filter((b) => b.status === activeFilter)
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      result = result.filter(
        (b) =>
          b.batchNo.toLowerCase().includes(kw) ||
          b.grainType.includes(kw) ||
          b.warehouseNo.toLowerCase().includes(kw) ||
          b.supplier.includes(kw)
      )
    }
    return result
  }, [batches, activeFilter, keyword])

  const handleAddBatch = () => {
    Taro.navigateTo({ url: '/pages/inbound/index' })
  }

  return (
    <View className={styles.container}>
      <View className={styles.searchBar}>
        <Input
          className={styles.searchInput}
          placeholder='搜索批号/品种/仓号/供应商'
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
        />
      </View>

      <View className={styles.filterBar}>
        {FILTER_OPTIONS.map((opt) => (
          <View
            key={opt.value}
            className={classnames(styles.filterItem, activeFilter === opt.value && styles.filterItemActive)}
            onClick={() => setActiveFilter(opt.value)}
          >
            <Text className={styles.filterText}>{opt.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.listContainer} style={{ height: 'calc(100vh - 240rpx)' }}>
        {filteredBatches.length > 0 ? (
          filteredBatches.map((batch) => <BatchCard key={batch.id} batch={batch} />)
        ) : (
          <EmptyState message='未找到匹配的批次' />
        )}
      </ScrollView>

      <View className={styles.fabButton} onClick={handleAddBatch}>
        <Text className={styles.fabText}>+</Text>
      </View>
    </View>
  )
}

export default BatchPage
