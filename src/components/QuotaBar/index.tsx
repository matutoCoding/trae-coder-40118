import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface QuotaBarProps {
  used: number
  total: number
  showText?: boolean
}

const QuotaBar: React.FC<QuotaBarProps> = ({ used, total, showText = true }) => {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const isExhausted = percentage >= 100
  const isWarning = percentage >= 80 && percentage < 100

  return (
    <View className={styles.container}>
      {showText && (
        <View className={styles.header}>
          <Text className={styles.label}>已用额度</Text>
          <Text className={styles.value}>
            {used}/{total} 吨
          </Text>
        </View>
      )}
      <View className={styles.track}>
        <View
          className={`${styles.fill} ${isExhausted ? styles.exhausted : isWarning ? styles.warningStyle : styles.normal}`}
          style={{ width: `${percentage}%` }}
        />
      </View>
      {showText && (
        <Text className={`${styles.percentage} ${isExhausted ? styles.danger : isWarning ? styles.warn : ''}`}>
          {percentage.toFixed(1)}%
        </Text>
      )}
    </View>
  )
}

export default QuotaBar
