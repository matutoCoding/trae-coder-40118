import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface StatCardProps {
  value: string | number
  label: string
  unit?: string
  type?: 'default' | 'primary' | 'warning' | 'danger'
}

const StatCard: React.FC<StatCardProps> = ({ value, label, unit, type = 'default' }) => {
  return (
    <View className={`${styles.card} ${styles[type]}`}>
      <Text className={styles.value}>{value}</Text>
      {unit && <Text className={styles.unit}>{unit}</Text>}
      <Text className={styles.label}>{label}</Text>
    </View>
  )
}

export default StatCard
