import React, { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGrainStore } from '@/store'
import { getBatchStatusText, getDaysLeft, getInspectionTypeText, getOutboundStatusText } from '@/utils/helpers'
import classnames from 'classnames'
import styles from './index.module.scss'

type EventType = 'inbound' | 'inspection' | 'warning' | 'outbound_apply' | 'outbound_review' | 'outbound_actual'

const EVENT_ORDER: Record<EventType, number> = {
  inbound: 0,
  inspection: 1,
  warning: 2,
  outbound_apply: 3,
  outbound_review: 4,
  outbound_actual: 5
}

interface TimelineEntry {
  id: string
  date: string
  timestamp: number
  eventType: EventType
  dotClass: string
  content: React.ReactNode
  outboundId?: string
}

const BatchDetailPage: React.FC = () => {
  const { batches, outboundRecords, inspections, getBatchWithStatus } = useGrainStore()

  const params = Taro.getCurrentInstance().router?.params
  const batchId = params?.id || ''

  const rawBatch = useMemo(() => batches.find((b) => b.id === batchId), [batches, batchId])
  const batch = useMemo(
    () => (rawBatch ? getBatchWithStatus(rawBatch) : undefined),
    [rawBatch, getBatchWithStatus]
  )

  const timeline = useMemo(() => {
    if (!batch) return []

    const events: TimelineEntry[] = []

    events.push({
      id: 'inbound',
      date: batch.inboundDate,
      timestamp: new Date(batch.inboundDate).getTime(),
      eventType: 'inbound',
      dotClass: styles.timelineDot,
      content: (
        <View>
          <Text className={styles.timelineEvent}>入库验收</Text>
          <Text className={styles.timelineDate}>
            {batch.supplier} · {batch.warehouseNo} · {batch.quantity}{batch.unit}
          </Text>
        </View>
      )
    })

    const relatedInspections = inspections.filter((i) => i.batchNo === batch.batchNo)
    for (const insp of relatedInspections) {
      events.push({
        id: insp.id,
        date: insp.inspectionDate,
        timestamp: new Date(insp.inspectionDate).getTime(),
        eventType: 'inspection',
        dotClass: classnames(
          styles.timelineDot,
          insp.result === 'fail' && styles.timelineDotFail
        ),
        content: (
          <View>
            <Text className={styles.timelineEvent}>
              {getInspectionTypeText(insp.inspectionType)}
              {' - '}
              <Text style={{ color: insp.result === 'pass' ? '#2D7D46' : '#D93025' }}>
                {insp.result === 'pass' ? '合格' : '不合格'}
              </Text>
            </Text>
            <Text className={styles.timelineDate}>
              {insp.standard} · {insp.inspector} · {insp.inspectionDate}
            </Text>
          </View>
        )
      })
    }

    if (['warning', 'expired', 'locked'].includes(batch.status)) {
      const warningDate = batch.warningDate || batch.expiryDate
      const warningText = batch.status === 'locked'
        ? '批次已锁定，禁止出库'
        : batch.status === 'expired'
          ? '批次已超过保质到期日'
          : '批次即将到期，请关注'
      events.push({
        id: 'warning',
        date: warningDate,
        timestamp: new Date(warningDate).getTime(),
        eventType: 'warning',
        dotClass: classnames(styles.timelineDot, styles.timelineDotWarning),
        content: (
          <View>
            <Text className={styles.timelineEvent} style={{ color: '#C88600' }}>
              ⚠ {warningText}
            </Text>
            <Text className={styles.timelineDate}>
              保质到期日 {batch.expiryDate}
            </Text>
          </View>
        )
      })
    }

    const relatedOutbound = outboundRecords.filter((r) =>
      r.plannedDeductions.some((d) => d.batchNo === batch.batchNo)
    )

    for (const record of relatedOutbound) {
      const plan = record.plannedDeductions.find((d) => d.batchNo === batch.batchNo)
      const planQty = plan ? plan.deductQuantity : 0

      events.push({
        id: `${record.id}_apply`,
        date: record.outboundDate,
        timestamp: new Date(record.outboundDate).getTime(),
        eventType: 'outbound_apply',
        dotClass: classnames(
          styles.timelineDot,
          record.status === 'pending' && styles.timelineDotPending
        ),
        outboundId: record.id,
        content: (
          <View>
            <Text className={styles.timelineEvent}>
              出库申请 · {getOutboundStatusText(record.status)}
            </Text>
            <Text className={styles.timelineDate}>
              {record.merchantName} · 计划{planQty}{record.unit} · {record.outboundDate}
            </Text>
          </View>
        )
      })

      if ((record.status === 'completed' || record.status === 'rejected') && record.reviewDate) {
        events.push({
          id: `${record.id}_review`,
          date: record.reviewDate,
          timestamp: new Date(record.reviewDate).getTime(),
          eventType: 'outbound_review',
          dotClass: classnames(styles.timelineDot, styles.timelineDotReview),
          outboundId: record.id,
          content: (
            <View>
              <Text className={styles.timelineEvent}>
                审核结果 · {record.status === 'completed' ? '通过' : '驳回'}
              </Text>
              <Text className={styles.timelineDate}>
                {record.reviewer} · {record.reviewDate}
              </Text>
              {record.reviewRemark && (
                <Text style={{ fontSize: '24rpx', color: '#5A5A5A', marginTop: '4rpx' }}>
                  {record.reviewRemark}
                </Text>
              )}
            </View>
          )
        })
      }

      if (record.status === 'completed') {
        const actual = record.actualDeductions.find((d) => d.batchNo === batch.batchNo)
        if (actual) {
          events.push({
            id: `${record.id}_actual`,
            date: record.reviewDate || record.outboundDate,
            timestamp: new Date(record.reviewDate || record.outboundDate).getTime(),
            eventType: 'outbound_actual',
            dotClass: styles.timelineDot,
            outboundId: record.id,
            content: (
              <View>
                <Text className={styles.timelineEvent}>实际出库</Text>
                <Text className={styles.timelineDate}>
                  {actual.deductQuantity}{actual.unit} → {record.merchantName} · {record.outboundNo} · {record.reviewDate || record.outboundDate}
                </Text>
              </View>
            )
          })
        }
      }
    }

    events.sort((a, b) => {
      const diff = a.timestamp - b.timestamp
      if (diff !== 0) return diff
      return EVENT_ORDER[a.eventType] - EVENT_ORDER[b.eventType]
    })

    return events
  }, [batch, inspections, outboundRecords])

  if (!batch) {
    return (
      <View className={styles.container}>
        <Text>批次不存在</Text>
      </View>
    )
  }

  const daysLeft = getDaysLeft(batch.expiryDate)
  const statusBannerClass = classnames(
    styles.statusBanner,
    batch.status === 'normal' && styles.statusBannerNormal,
    batch.status === 'warning' && styles.statusBannerWarning,
    batch.status === 'expired' && styles.statusBannerExpired,
    batch.status === 'locked' && styles.statusBannerLocked
  )

  const handleTimelineClick = (entry: TimelineEntry) => {
    if (entry.outboundId) {
      Taro.navigateTo({ url: `/pages/outboundDetail/index?id=${entry.outboundId}` })
    }
  }

  return (
    <ScrollView scrollY style={{ height: '100vh' }}>
      <View className={styles.container}>
        <View className={statusBannerClass}>
          <View className={styles.statusHeader}>
            <Text className={styles.statusTitle}>{batch.batchNo}</Text>
            <View className={styles.statusTag}>
              <Text className={styles.statusTagText}>{getBatchStatusText(batch.status)}</Text>
            </View>
          </View>
          <Text className={styles.statusDesc}>
            {batch.grainType} · {batch.grade} · {batch.warehouseNo}
          </Text>
          {daysLeft <= 90 && daysLeft > 0 && (
            <Text className={styles.statusDesc}>距保质到期剩余 {daysLeft} 天</Text>
          )}
          {daysLeft <= 0 && (
            <Text className={styles.statusDesc}>已超过保质到期日，批次已锁定不可出库</Text>
          )}
        </View>

        <View className={styles.infoSection}>
          <Text className={styles.infoSectionTitle}>批次信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>粮食品种</Text>
            <Text className={styles.infoValue}>{batch.grainType}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>等级</Text>
            <Text className={styles.infoValue}>{batch.grade}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>仓号</Text>
            <Text className={styles.infoValue}>{batch.warehouseNo}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>入库数量</Text>
            <Text className={styles.infoValue}>{batch.quantity} {batch.unit}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>剩余数量</Text>
            <Text className={styles.infoValue}>{batch.remainingQuantity} {batch.unit}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>供应商</Text>
            <Text className={styles.infoValue}>{batch.supplier}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>入仓日期</Text>
            <Text className={styles.infoValue}>{batch.inboundDate}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>临期预警日</Text>
            <Text className={styles.infoValue}>{batch.warningDate || '到期前30天'}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text
              className={classnames(
                styles.infoLabel,
                (batch.status === 'warning' || batch.status === 'expired') && styles.expiryHighlight
              )}
            >
              保质到期
            </Text>
            <Text
              className={classnames(
                styles.infoValue,
                (batch.status === 'warning' || batch.status === 'expired') && styles.expiryHighlight
              )}
            >
              {batch.expiryDate}
            </Text>
          </View>
        </View>

        <View className={styles.infoSection}>
          <Text className={styles.infoSectionTitle}>检验信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>水分含量</Text>
            <Text className={styles.infoValue}>
              {batch.moistureContent}%（国标≤14%）
              {batch.moistureContent > 14 && <Text style={{ color: '#D93025', marginLeft: '8rpx' }}>(超标)</Text>}
            </Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>杂质率</Text>
            <Text className={styles.infoValue}>
              {batch.impurityRate}%（国标≤1.5%）
              {batch.impurityRate > 1.5 && <Text style={{ color: '#D93025', marginLeft: '8rpx' }}>(超标)</Text>}
            </Text>
          </View>
          {batch.remark && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>备注</Text>
              <Text className={styles.infoValue}>{batch.remark}</Text>
            </View>
          )}
        </View>

        {timeline.length > 0 && (
          <View className={styles.timelineSection}>
            <Text className={styles.timelineTitle}>生命周期</Text>
            {timeline.map((entry, idx) => (
              <View
                key={entry.id}
                className={styles.timelineItem}
                onClick={() => handleTimelineClick(entry)}
              >
                <View className={entry.dotClass} />
                {idx < timeline.length - 1 && <View className={styles.timelineLine} />}
                <View className={styles.timelineContent}>
                  {entry.content}
                  {entry.outboundId && (
                    <Text className={styles.timelineActionText}>查看详情 &gt;</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default BatchDetailPage
