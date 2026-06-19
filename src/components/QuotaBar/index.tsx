import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface QuotaBarProps {
  used: number
  base: number
  approved?: number
  showText?: boolean
}

const QuotaBar: React.FC<QuotaBarProps> = ({ used, base, approved = 0, showText = true }) => {
  const total = base + approved
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const basePercentage = total > 0 ? Math.min((base / total) * 100, 100) : 0
  const isExhausted = percentage >= 100
  const isWarning = percentage >= 80 && percentage < 100

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
          </View>
          <Text className={styles.value}>
            {used.toFixed(0)}/{total.toFixed(0)} 吨
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
          style={{ width: `${percentage}%` }}
        />
      </View>
      {showText && (
        <Text className={classnames(
          styles.percentage,
          isExhausted && styles.danger,
          isWarning && styles.warn
        )}>
          {percentage.toFixed(1)}%
        </Text>
      )}
    </View>
  )
}

export default QuotaBar
