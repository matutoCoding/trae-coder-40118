import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, Input, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import { getOutboundStatusText, getQuotaAppStatusText } from '@/utils/helpers'
import StatusTag from '@/components/StatusTag'
import EmptyState from '@/components/EmptyState'
import styles from './index.module.scss'
import { OutboundRecord, QuotaApplication } from '@/types'

const TABS = [
  { label: '全部', value: 'all' },
  { label: '出库审批', value: 'outbound' },
  { label: '额度审批', value: 'quota' }
]

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已完成', value: 'completed' },
  { label: '已驳回', value: 'rejected' }
]

interface ApprovalHistoryItem {
  type: 'outbound' | 'quota'
  record: OutboundRecord | QuotaApplication
}

const ApprovalHistoryPage: React.FC = () => {
  const { merchants, getApprovalHistory } = useGrainStore()
  const [activeTab, setActiveTab] = useState('all')
  const [merchantIdx, setMerchantIdx] = useState<string>('')
  const [statusIdx, setStatusIdx] = useState<number>(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const merchantNames = useMemo(() => merchants.map((m) => m.merchantName), [merchants])
  const statusLabels = useMemo(() => STATUS_OPTIONS.map((s) => s.label), [])

  const selectedMerchant = useMemo(
    () => (merchantIdx ? merchants[Number(merchantIdx)] : null),
    [merchantIdx, merchants]
  )

  const selectedStatus = useMemo(
    () => STATUS_OPTIONS[statusIdx]?.value || '',
    [statusIdx]
  )

  const historyList = useMemo(() => {
    const filters = {
      merchantId: selectedMerchant?.merchantId,
      status: selectedStatus,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      type: activeTab === 'all' ? undefined : (activeTab as 'outbound' | 'quota')
    }
    return getApprovalHistory(filters)
  }, [selectedMerchant, selectedStatus, startDate, endDate, activeTab, getApprovalHistory])

  const handleItemClick = (item: ApprovalHistoryItem) => {
    if (item.type === 'outbound') {
      const record = item.record as OutboundRecord
      Taro.navigateTo({ url: `/pages/outboundDetail/index?id=${record.id}` })
    } else {
      const record = item.record as QuotaApplication
      Taro.navigateTo({ url: `/pages/quotaApplicationDetail/index?id=${record.id}` })
    }
  }

  const renderOutboundItem = (record: OutboundRecord) => (
    <View className={styles.itemCard} onClick={() => handleItemClick({ type: 'outbound', record })}>
      <View className={styles.itemHeader}>
        <Text className={styles.itemNo}>{record.outboundNo}</Text>
        <StatusTag status={record.status} text={getOutboundStatusText(record.status)} size='small' />
      </View>
      <View className={styles.itemBody}>
        <View className={styles.itemInfoRow}>
          <Text className={styles.itemInfoLabel}>商户</Text>
          <Text className={styles.itemInfoValue}>{record.merchantName}</Text>
        </View>
        <View className={styles.itemInfoRow}>
          <Text className={styles.itemInfoLabel}>数量</Text>
          <Text className={styles.itemInfoValue}>{record.quantity}{record.unit}</Text>
        </View>
        <View className={styles.itemInfoRow}>
          <Text className={styles.itemInfoLabel}>出库日期</Text>
          <Text className={styles.itemInfoValue}>{record.outboundDate}</Text>
        </View>
        {record.reviewDate && (
          <View className={styles.itemInfoRow}>
            <Text className={styles.itemInfoLabel}>审批日期</Text>
            <Text className={styles.itemInfoValue}>{record.reviewDate}</Text>
          </View>
        )}
      </View>
    </View>
  )

  const renderQuotaItem = (record: QuotaApplication) => (
    <View className={styles.itemCard} onClick={() => handleItemClick({ type: 'quota', record })}>
      <View className={styles.itemHeader}>
        <Text className={styles.itemNo}>额度申请</Text>
        <StatusTag status={record.status} text={getQuotaAppStatusText(record.status)} size='small' />
      </View>
      <View className={styles.itemBody}>
        <View className={styles.itemInfoRow}>
          <Text className={styles.itemInfoLabel}>商户</Text>
          <Text className={styles.itemInfoValue}>{record.merchantName}</Text>
        </View>
        <View className={styles.itemInfoRow}>
          <Text className={styles.itemInfoLabel}>申请额度</Text>
          <Text className={styles.itemInfoValue}>{record.applyQuota}{record.unit}</Text>
        </View>
        <View className={styles.itemInfoRow}>
          <Text className={styles.itemInfoLabel}>申请日期</Text>
          <Text className={styles.itemInfoValue}>{record.applyDate}</Text>
        </View>
        {record.reviewDate && (
          <View className={styles.itemInfoRow}>
            <Text className={styles.itemInfoLabel}>审批日期</Text>
            <Text className={styles.itemInfoValue}>{record.reviewDate}</Text>
          </View>
        )}
      </View>
    </View>
  )

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

      <View className={styles.filterBar}>
        <View className={styles.filterRow}>
          <Text className={styles.filterLabel}>商户</Text>
          <Picker
            mode='selector'
            range={merchantNames}
            value={merchantIdx ? Number(merchantIdx) : undefined}
            onChange={(e) => setMerchantIdx(String(e.detail.value))}
          >
            <View className={styles.pickerValue}>
              <Text className={!selectedMerchant ? styles.pickerPlaceholder : ''}>
                {selectedMerchant ? selectedMerchant.merchantName : '全部商户'}
              </Text>
            </View>
          </Picker>
        </View>

        <View className={styles.filterRow}>
          <Text className={styles.filterLabel}>状态</Text>
          <Picker
            mode='selector'
            range={statusLabels}
            value={statusIdx}
            onChange={(e) => setStatusIdx(e.detail.value)}
          >
            <View className={styles.pickerValue}>
              <Text>{STATUS_OPTIONS[statusIdx]?.label || '全部'}</Text>
            </View>
          </Picker>
        </View>

        <View className={styles.filterRow}>
          <Text className={styles.filterLabel}>开始日期</Text>
          <Input
            className={styles.filterInput}
            placeholder='YYYY-MM-DD'
            value={startDate}
            onInput={(e) => setStartDate(e.detail.value)}
          />
        </View>

        <View className={styles.filterRow}>
          <Text className={styles.filterLabel}>结束日期</Text>
          <Input
            className={styles.filterInput}
            placeholder='YYYY-MM-DD'
            value={endDate}
            onInput={(e) => setEndDate(e.detail.value)}
          />
        </View>
      </View>

      <ScrollView scrollY className={styles.results}>
        {historyList.length > 0 ? (
          historyList.map((item) => (
            <View key={`${item.type}-${item.record.id}`}>
              {item.type === 'outbound'
                ? renderOutboundItem(item.record as OutboundRecord)
                : renderQuotaItem(item.record as QuotaApplication)}
            </View>
          ))
        ) : (
          <EmptyState message='暂无审批记录' />
        )}
      </ScrollView>
    </View>
  )
}

export default ApprovalHistoryPage
