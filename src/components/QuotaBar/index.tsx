import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface QuotaBarProps {
  used: number
  base: number
  approved?: number
  pendingUsed?: number
  showText?: boolean
}

const QuotaBar: React.FC<QuotaBarProps> = ({ used, base, approved = 0, pendingUsed = 0, showText = true }) => {
  const total = base + approved
  const usedPercentage = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const pendingPercentage = total > 0 ? Math.min((pendingUsed / total) * 100, 100) : 0
  const combinedPercentage = Math.min(usedPercentage + pendingPercentage, 100)
  const basePercentage = total > 0 ? Math.min((base / total) * 100, 100) : 0
  const isExhausted = combinedPercentage >= 100
  const isWarning = combinedPercentage >= 80 && combinedPercentage < 100

  return (
    <View className={styles.container}>
      {showText && (
        <View className={styles.header}>
          <View className={styles.labelRow}>
            <Text className={styles.label}>已用额度</Text>
            {approved > 0 && (
              <View className={styles.approvedTag}>
                <Text className={styles.approvedText}>含追加 +{approved}吨</Text>
              </View>
            )}
            {pendingUsed > 0 && (
              <View className={styles.pendingTag}>
                <Text className={styles.pendingText}>待使用 {pendingUsed.toFixed(0)}吨</Text>
              </View>
            )}
          </View>
          <Text className={styles.value}>
            {used.toFixed(0)} + {pendingUsed.toFixed(0)} / {total.toFixed(0)} 吨
          </Text>
        </View>
      )}
      <View className={styles.track}>
        {approved > 0 && (
          <View className={styles.approvedSegment} style={{ width: `${basePercentage}%` }} />
        )}
        <View
          className={classnames(
            styles.fill,
            isExhausted && styles.exhausted,
            isWarning && styles.warningStyle,
            !isExhausted && !isWarning && styles.normal
          )}
          style={{ width: `${usedPercentage}%` }}
        />
        {pendingPercentage > 0 && (
          <View
            className={classnames(
              styles.pendingFill,
              isExhausted && styles.exhausted,
              isWarning && styles.warningStyle,
              !isExhausted && !isWarning && styles.pendingNormal
            )}
            style={{
              width: `${pendingPercentage}%`,
              left: `${usedPercentage}%`
            }}
          />
        )}
      </View>
      {showText && (
        <Text className={classnames(
          styles.percentage,
          isExhausted && styles.danger,
          isWarning && styles.warn
        )}>
          {combinedPercentage.toFixed(1)}%
        </Text>
      )}
    </View>
  )
}

export default QuotaBar
