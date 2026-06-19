import React, { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGrainStore } from '@/store'
import { getOutboundStatusText } from '@/utils/helpers'
import styles from './index.module.scss'

const OutboundDetailPage: React.FC = () => {
  const { outboundRecords } = useGrainStore()
  const params = Taro.getCurrentInstance().router?.params
  const recordId = params?.id || ''

  const record = useMemo(() => outboundRecords.find((r) => r.id === recordId), [outboundRecords, recordId])

  if (!record) {
    return (
      <View className={styles.container}>
        <Text>出库记录不存在</Text>
      </View>
    )
  }

  return (
    <ScrollView scrollY style={{ height: '100vh' }}>
      <View className={styles.container}>
        <View className={styles.headerCard}>
          <View className={styles.headerTop}>
            <Text className={styles.headerNo}>{record.outboundNo}</Text>
            <View className={styles.headerTag}>
              <Text className={styles.headerTagText}>{getOutboundStatusText(record.status)}</Text>
            </View>
          </View>
          <Text className={styles.headerDesc}>
            {record.grainType} · {record.quantity}{record.unit} · {record.merchantName}
          </Text>
        </View>

        <View className={styles.infoSection}>
          <Text className={styles.infoSectionTitle}>出库信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>出库单号</Text>
            <Text className={styles.infoValue}>{record.outboundNo}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>关联批号</Text>
            <Text className={styles.infoValue}>{record.batchNo}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>粮食品种</Text>
            <Text className={styles.infoValue}>{record.grainType}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>出库数量</Text>
            <Text className={styles.infoValue}>{record.quantity} {record.unit}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>出库日期</Text>
            <Text className={styles.infoValue}>{record.outboundDate}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>操作人</Text>
            <Text className={styles.infoValue}>{record.operator}</Text>
          </View>
          {record.remark && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>备注</Text>
              <Text className={styles.infoValue}>{record.remark}</Text>
            </View>
          )}
        </View>

        <View className={styles.infoSection}>
          <Text className={styles.infoSectionTitle}>商户信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>商户名称</Text>
            <Text className={styles.infoValue}>{record.merchantName}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>额度编号</Text>
            <Text className={styles.infoValue}>{record.quotaId}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

export default OutboundDetailPage
