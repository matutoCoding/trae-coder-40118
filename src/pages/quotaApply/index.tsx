import React, { useState } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGrainStore } from '@/store'
import styles from './index.module.scss'

const QuotaApplyPage: React.FC = () => {
  const { getActiveQuotas, applyQuota: submitApplyQuota } = useGrainStore()
  const params = Taro.getCurrentInstance().router?.params
  const merchantId = params?.merchantId || ''
  const merchantName = decodeURIComponent(params?.merchantName || '')

  const quotas = getActiveQuotas()
  const currentQuota = quotas.find((q) => q.merchantId === merchantId && (q.status === 'active' || q.status === 'exhausted'))

  const [applyQuota, setApplyQuota] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!applyQuota || Number(applyQuota) <= 0) {
      Taro.showToast({ title: '请输入有效申请额度', icon: 'none' })
      return
    }
    if (!reason.trim()) {
      Taro.showToast({ title: '请填写申请原因', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const success = await submitApplyQuota(merchantId, Number(applyQuota), reason)
      if (success) {
        console.info('[QuotaApply] 申请已批准:', { merchantId, applyQuota, reason })
        Taro.showToast({ title: '额度已追加成功', icon: 'success' })
        setTimeout(() => Taro.navigateBack(), 1200)
      } else {
        Taro.showToast({ title: '申请失败，请重试', icon: 'none' })
      }
    } catch (e) {
      console.error('[QuotaApply] 申请异常', e)
      Taro.showToast({ title: '系统异常', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const baseQuota = currentQuota?.baseQuota || 0
  const used = currentQuota?.used || 0
  const approved = currentQuota?.approved || 0
  const remaining = baseQuota + approved - used

  return (
    <View className={styles.container}>
      <ScrollView scrollY style={{ height: 'calc(100vh - 140rpx)' }}>
        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>申请信息</Text>
          <View className={styles.merchantInfo}>
            <Text className={styles.merchantInfoText}>
              商户「{merchantName}」当前季度：基额{baseQuota}吨
              {approved > 0 && ` + 已追加${approved}吨`}，
              已用{used}吨，剩余{remaining}吨。
              {remaining <= 0 && ' 额度已用尽，请申请追加额度。'}
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
        <View className={styles.submitBtn} onClick={!submitting ? handleSubmit : undefined}>
          <Text style={{ fontSize: '32rpx', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {submitting ? '提交中...' : '提交申请'}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default QuotaApplyPage
