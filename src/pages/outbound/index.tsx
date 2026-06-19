import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import { getOutboundStatusText } from '@/utils/helpers'
import StatusTag from '@/components/StatusTag'
import EmptyState from '@/components/EmptyState'
import styles from './index.module.scss'

const TABS = [
  { label: '先进先出', value: 'fifo' },
  { label: '出库记录', value: 'records' }
]

const OutboundPage: React.FC = () => {
  const { batches, outboundRecords, getFifoBatches } = useGrainStore()
  const [activeTab, setActiveTab] = useState('fifo')

  const fifoBatches = useMemo(() => {
    return getFifoBatches().slice(0, 5)
  }, [getFifoBatches])

  const sortedRecords = useMemo(() => {
    return [...outboundRecords].sort(
      (a, b) => new Date(b.outboundDate).getTime() - new Date(a.outboundDate).getTime()
    )
  }, [outboundRecords])

  const handleOutbound = (batchNo: string, grainType: string) => {
    Taro.showModal({
      title: '确认出库',
      content: `确认为批次 ${batchNo}（${grainType}）办理出库？将按先进先出规则执行。`,
      success: (res) => {
        if (res.confirm) {
          console.info('[Outbound] 确认出库:', batchNo)
          Taro.showToast({ title: '出库申请已提交', icon: 'success' })
        }
      }
    })
  }

  const handleRecordDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/outboundDetail/index?id=${id}` })
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

      <ScrollView scrollY className={styles.content} style={{ height: 'calc(100vh - 120rpx)' }}>
        {activeTab === 'fifo' ? (
          <View className={styles.fifoSection}>
            <View className={styles.fifoHeader}>
              <Text className={styles.fifoIcon}>📋</Text>
              <Text className={styles.fifoTitle}>出库优先队列</Text>
              <Text className={styles.fifoDesc}>按入仓日期排列</Text>
            </View>
            {fifoBatches.length > 0 ? (
              fifoBatches.map((batch, index) => (
                <View key={batch.id} className={styles.fifoCard}>
                  <View className={styles.fifoCardTop}>
                    <Text className={styles.fifoBatchNo}>{batch.batchNo}</Text>
                    <Text className={styles.fifoOrder}>第{index + 1}优先</Text>
                  </View>
                  <View className={styles.fifoBody}>
                    <View className={styles.fifoInfoItem}>
                      <Text className={styles.fifoInfoLabel}>品种</Text>
                      <Text className={styles.fifoInfoValue}>{batch.grainType}</Text>
                    </View>
                    <View className={styles.fifoInfoItem}>
                      <Text className={styles.fifoInfoLabel}>仓号</Text>
                      <Text className={styles.fifoInfoValue}>{batch.warehouseNo}</Text>
                    </View>
                    <View className={styles.fifoInfoItem}>
                      <Text className={styles.fifoInfoLabel}>剩余</Text>
                      <Text className={styles.fifoInfoValue}>{batch.remainingQuantity}{batch.unit}</Text>
                    </View>
                    <View className={styles.fifoInfoItem}>
                      <Text className={styles.fifoInfoLabel}>入仓</Text>
                      <Text className={styles.fifoInfoValue}>{batch.inboundDate}</Text>
                    </View>
                  </View>
                  <View className={styles.fifoAction}>
                    <View
                      className={styles.outBtn}
                      onClick={() => handleOutbound(batch.batchNo, batch.grainType)}
                    >
                      <Text style={{ color: '#fff', fontSize: '24rpx', fontWeight: 500 }}>办理出库</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState message='暂无可出库批次' />
            )}
          </View>
        ) : (
          <View>
            {sortedRecords.length > 0 ? (
              sortedRecords.map((record) => (
                <View
                  key={record.id}
                  className={styles.recordCard}
                  onClick={() => handleRecordDetail(record.id)}
                >
                  <View className={styles.recordHeader}>
                    <Text className={styles.recordNo}>{record.outboundNo}</Text>
                    <StatusTag
                      status={record.status}
                      text={getOutboundStatusText(record.status)}
                      size='small'
                    />
                  </View>
                  <View className={styles.recordBody}>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>商户</Text>
                      <Text className={styles.recordInfoValue}>{record.merchantName}</Text>
                    </View>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>品种</Text>
                      <Text className={styles.recordInfoValue}>{record.grainType}</Text>
                    </View>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>数量</Text>
                      <Text className={styles.recordInfoValue}>{record.quantity}{record.unit}</Text>
                    </View>
                    <View className={styles.recordInfoItem}>
                      <Text className={styles.recordInfoLabel}>日期</Text>
                      <Text className={styles.recordInfoValue}>{record.outboundDate}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState message='暂无出库记录' />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default OutboundPage
