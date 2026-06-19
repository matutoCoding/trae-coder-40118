import React, { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { useGrainStore } from '@/store'
import { getQuotaAppStatusText } from '@/utils/helpers'
import StatusTag from '@/components/StatusTag'
import styles from './index.module.scss'

const QuotaApplicationDetailPage: React.FC = () => {
  const { getQuotaApplicationById, getMerchantQuota } = useGrainStore()

  const params = Taro.getCurrentInstance().router?.params
  const appId = params?.id || ''

  const app = useMemo(() => getQuotaApplicationById(appId), [appId, getQuotaApplicationById])

  const currentQuota = useMemo(() => {
    if (!app) return undefined
    return getMerchantQuota(app.merchantId)
  }, [app, getMerchantQuota])

  if (!app) {
    return (
      <View className={styles.container}>
        <Text style={{ padding: '40rpx' }}>申请记录不存在</Text>
      </View>
    )
  }

  const bannerClass = classnames(
    styles.statusBanner,
    app.status === 'approved' && styles.statusBannerApproved,
    app.status === 'pending' && styles.statusBannerPending,
    app.status === 'rejected' && styles.statusBannerRejected
  )

  const displayBefore = app.quotaBefore ?? (currentQuota ? (currentQuota.baseQuota + (currentQuota.approved || 0) - app.applyQuota) : 0)
  const displayAfter = app.quotaAfter ?? (currentQuota ? (currentQuota.baseQuota + (currentQuota.approved || 0)) : 0)

  return (
    <ScrollView scrollY style={{ height: '100vh' }}>
      <View className={styles.container}>
        <View className={bannerClass}>
          <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text className={styles.bannerTitle}>额度申请详情</Text>
            <StatusTag status={app.status} text={getQuotaAppStatusText(app.status)} size='small' />
          </View>
          <Text className={styles.bannerSubtitle}>申请单号：{app.id}</Text>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>申请信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>申请商户</Text>
            <Text className={styles.infoValue}>{app.merchantName}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>申请额度</Text>
            <Text className={styles.infoValue} style={{ color: '#2D7D46', fontWeight: 600 }}>
              +{app.applyQuota} {app.unit}
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>申请原因</Text>
            <Text className={styles.infoValue}>{app.reason || '-'}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>申请日期</Text>
            <Text className={styles.infoValue}>{app.applyDate}</Text>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>审批信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>审批状态</Text>
            <Text className={styles.infoValue}>
              <StatusTag status={app.status} text={getQuotaAppStatusText(app.status)} size='small' />
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>审批人</Text>
            <Text className={styles.infoValue}>{app.reviewer || '待审批'}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>审批时间</Text>
            <Text className={styles.infoValue}>{app.reviewDate || '待审批'}</Text>
          </View>
          {app.reviewRemark && (
            <View className={app.status === 'rejected' ? styles.reviewRemark : ''} style={{
              padding: app.status !== 'rejected' ? '24rpx' : undefined,
              backgroundColor: app.status !== 'rejected' ? 'rgba(45, 125, 70, 0.06)' : undefined,
              borderRadius: app.status !== 'rejected' ? '16rpx' : undefined,
              marginTop: app.status !== 'rejected' ? '16rpx' : undefined,
              color: app.status !== 'rejected' ? '#2D7D46' : undefined
            }}>
              <Text style={{ fontSize: '28rpx' }}>{app.reviewRemark}</Text>
            </View>
          )}
        </View>

        {(app.status === 'approved' || app.status === 'rejected') && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>额度变化</Text>
            <View className={styles.quotaChangeRow}>
              <View>
                <Text className={styles.quotaChangeBefore}>审批前总额度</Text>
                <Text style={{ fontSize: '32rpx', fontWeight: 600, color: '#1A1A1A', marginTop: '8rpx' }}>
                  {displayBefore} 吨
                </Text>
              </View>
              <Text className={styles.quotaChangeArrow}>→</Text>
              <View style={{ textAlign: 'right' }}>
                <Text className={styles.quotaChangeBefore}>审批后总额度</Text>
                <Text className={styles.quantaChangeAfter}>
                  {displayAfter} 吨
                </Text>
              </View>
            </View>
            <View style={{ marginTop: '20rpx', fontSize: '26rpx', color: '#888' }}>
              {app.status === 'approved'
                ? `实际追加：+${app.applyQuota} ${app.unit}`
                : '申请被驳回，额度未变化'}
            </View>
          </View>
        )}

        {currentQuota && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>当前额度情况</Text>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>基础额度</Text>
              <Text className={styles.infoValue}>{currentQuota.baseQuota} {currentQuota.unit}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>已追加额度</Text>
              <Text className={styles.infoValue}>{currentQuota.approved || 0} {currentQuota.unit}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>已使用</Text>
              <Text className={styles.infoValue}>{currentQuota.used} {currentQuota.unit}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>待审占用</Text>
              <Text className={styles.infoValue}>{currentQuota.pendingUsed} {currentQuota.unit}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>剩余可用</Text>
              <Text className={styles.infoValue} style={{ color: '#2D7D46', fontWeight: 600 }}>
                {currentQuota.baseQuota + (currentQuota.approved || 0) - currentQuota.used - currentQuota.pendingUsed} {currentQuota.unit}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default QuotaApplicationDetailPage
