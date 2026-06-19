import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { GrainBatch } from '@/types'
import StatusTag from '@/components/StatusTag'
import { getBatchStatusText, getDaysLeft } from '@/utils/helpers'
import styles from './index.module.scss'

interface BatchCardProps {
  batch: GrainBatch
}

const BatchCard: React.FC<BatchCardProps> = ({ batch }) => {
  const daysLeft = getDaysLeft(batch.expiryDate)

  const handleClick = () => {
    Taro.navigateTo({ url: `/pages/batchDetail/index?id=${batch.id}` })
  }

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.titleRow}>
          <Text className={styles.batchNo}>{batch.batchNo}</Text>
          <StatusTag status={batch.status} text={getBatchStatusText(batch.status)} size='small' />
        </View>
        <Text className={styles.grainType}>{batch.grainType} · {batch.grade}</Text>
      </View>
      <View className={styles.body}>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>仓号</Text>
          <Text className={styles.infoValue}>{batch.warehouseNo}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>剩余</Text>
          <Text className={styles.infoValue}>{batch.remainingQuantity} {batch.unit}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>入仓</Text>
          <Text className={styles.infoValue}>{batch.inboundDate}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={classnames(styles.infoLabel, batch.status === 'warning' || batch.status === 'expired' ? styles.expiryLabel : '')}>
            效期
          </Text>
          <Text className={classnames(styles.infoValue, batch.status === 'warning' || batch.status === 'expired' ? styles.expiryValue : '')}>
            {batch.expiryDate}
            {daysLeft > 0 && daysLeft <= 90 && (
              <Text className={styles.daysLeft}> (剩{daysLeft}天)</Text>
            )}
            {daysLeft <= 0 && (
              <Text className={styles.daysLeft}> (已超期)</Text>
            )}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default BatchCard
