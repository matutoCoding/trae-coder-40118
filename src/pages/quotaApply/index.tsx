import React, { useState } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGrainStore } from '@/store'
import styles from './index.module.scss'

const QuotaApplyPage: React.FC = () => {
  const { quotas } = useGrainStore()
  const params = Taro.getCurrentInstance().router?.params
  const merchantId = params?.merchantId || ''
  const merchantName = params?.merchantName || ''

  const currentQuota = quotas.find((q) => q.merchantId === merchantId && (q.status === 'active' || q.status === 'exhausted'))

  const [applyQuota, setApplyQuota] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = () => {
    if (!applyQuota || Number(applyQuota) <= 0) {
      Taro.showToast({ title: '请输入有效申请额度', icon: 'none' })
      return
    }
    if (!reason.trim()) {
      Taro.showToast({ title: '请填写申请原因', icon: 'none' })
      return
    }
    console.info('[QuotaApply] 提交申请:', { merchantId, applyQuota, reason })
    Taro.showToast({ title: '额度申请已提交', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 1500)
  }

  return (
    <View className={styles.container}>
      <ScrollView scrollY style={{ height: 'calc(100vh - 140rpx)' }}>
        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>申请信息</Text>
          <View className={styles.merchantInfo}>
            <Text className={styles.merchantInfoText}>
              商户「{merchantName}」当前季度额度已用尽（总额{currentQuota?.totalQuota || 0}吨，已用{currentQuota?.usedQuota || 0}吨），需申请追加额度。
            </Text>
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}><Text className={styles.required}>*</Text>申请额度(吨)</Text>
            <Input
              className={styles.formInput}
              type='digit'
              placeholder='请输入申请额度'
              value={applyQuota}
              onInput={(e) => setApplyQuota(e.detail.value)}
            />
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}><Text className={styles.required}>*</Text>申请原因</Text>
            <Input
              className={styles.textArea}
              placeholder='请详细说明申请原因'
              value={reason}
              onInput={(e) => setReason(e.detail.value)}
            />
          </View>
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.submitBtn} onClick={handleSubmit}>
          <Text style={{ fontSize: '32rpx', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>提交申请</Text>
        </View>
      </View>
    </View>
  )
}

export default QuotaApplyPage
