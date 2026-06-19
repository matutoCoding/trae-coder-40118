import React, { useState } from 'react'
import { View, Text, Input, Picker, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import dayjs from 'dayjs'
import { useGrainStore } from '@/store'
import { getDaysLeft } from '@/utils/helpers'
import { GrainBatch, InspectionRecord } from '@/types'
import styles from './index.module.scss'

const GRAIN_TYPES = ['小麦', '玉米', '稻谷', '大豆', '高粱', '其他']
const GRADES = ['一等', '二等', '三等']
const WAREHOUSES = ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-03', 'C-01', 'C-02', 'D-01', 'D-02']
const STANDARDS: Record<string, string> = {
  小麦: 'GB 1351-2008',
  玉米: 'GB 1353-2018',
  稻谷: 'GB 1350-2009',
  大豆: 'GB 1352-2009',
  高粱: 'GB/T 8231-2007',
  其他: 'GB/T 29047-2012'
}

const InboundPage: React.FC = () => {
  const { addBatch, addInspection } = useGrainStore()
  const [form, setForm] = useState({
    grainType: '',
    grade: '',
    warehouseNo: '',
    quantity: '',
    supplier: '',
    inboundDate: dayjs().format('YYYY-MM-DD'),
    expiryDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    moistureContent: '',
    impurityRate: '',
    remark: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validateForm = (): boolean => {
    if (!form.grainType) {
      Taro.showToast({ title: '请选择粮食品种', icon: 'none' })
      return false
    }
    if (!form.warehouseNo) {
      Taro.showToast({ title: '请选择仓号', icon: 'none' })
      return false
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      Taro.showToast({ title: '请输入有效数量', icon: 'none' })
      return false
    }
    if (!form.supplier) {
      Taro.showToast({ title: '请输入供应商', icon: 'none' })
      return false
    }
    if (!form.inboundDate) {
      Taro.showToast({ title: '请选择入仓日期', icon: 'none' })
      return false
    }
    if (!form.expiryDate) {
      Taro.showToast({ title: '请选择保质到期日', icon: 'none' })
      return false
    }
    if (dayjs(form.expiryDate).isBefore(form.inboundDate)) {
      Taro.showToast({ title: '到期日不能早于入仓日', icon: 'none' })
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm() || submitting) return
    setSubmitting(true)

    try {
      const now = dayjs()
      const quarter = `Q${Math.ceil((now.month() + 1) / 3)}`
      const batchNo = `PK${now.year()}${quarter}-${String(now.format('MMDDHHmm')).slice(-6)}`
      const expiryDate = dayjs(form.expiryDate)
      const warningDate = expiryDate.subtract(30, 'day')

      const batch: GrainBatch = {
        id: `B${Date.now()}`,
        batchNo,
        grainType: form.grainType,
        warehouseNo: form.warehouseNo,
        quantity: Number(form.quantity),
        remainingQuantity: Number(form.quantity),
        unit: '吨',
        inboundDate: form.inboundDate,
        expiryDate: form.expiryDate,
        warningDate: warningDate.format('YYYY-MM-DD'),
        status: 'normal',
        supplier: form.supplier,
        moistureContent: Number(form.moistureContent) || 0,
        impurityRate: Number(form.impurityRate) || 0,
        grade: form.grade || '二等',
        remark: form.remark
      }

      const created = addBatch(batch)
      const daysLeft = getDaysLeft(created.expiryDate)

      const moisture = Number(form.moistureContent)
      const impurity = Number(form.impurityRate)
      const hasMoisture = !isNaN(moisture) && moisture > 0
      const hasImpurity = !isNaN(impurity) && impurity > 0

      if (hasMoisture || hasImpurity) {
        const moisturePass = !hasMoisture || moisture <= 14
        const impurityPass = !hasImpurity || impurity <= 1.5
        const pass = moisturePass && impurityPass

        const inspection: InspectionRecord = {
          id: `INS${Date.now()}`,
          batchNo,
          grainType: form.grainType,
          inspectionType: hasMoisture && hasImpurity ? 'full' : hasMoisture ? 'moisture' : 'impurity',
          moistureContent: moisture,
          impurityRate: impurity,
          result: pass ? 'pass' : 'fail',
          standard: STANDARDS[form.grainType] || '通用标准',
          inspector: '系统自动',
          inspectionDate: form.inboundDate,
          remark: pass ? '入库验收合格' : `入库验收入${!moisturePass ? '水分超标' : ''}${!impurityPass ? '杂质超标' : ''}`
        }
        addInspection(inspection)
        console.info('[Inbound] 已生成检验记录:', inspection)
      }

      let toastMsg = `入库成功：${batchNo}`
      if (created.status === 'warning') {
        toastMsg += `（临期，剩${daysLeft}天）`
      } else if (created.status === 'expired') {
        toastMsg += '（已超期锁定）'
      }
      console.info('[Inbound] 新增批次:', created)
      Taro.showToast({ title: toastMsg, icon: 'none', duration: 2000 })
      setTimeout(() => Taro.navigateBack(), 1800)
    } catch (e) {
      console.error('[InboundPage] 入库异常', e)
      Taro.showToast({ title: '入库失败，请重试', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm({
      grainType: '',
      grade: '',
      warehouseNo: '',
      quantity: '',
      supplier: '',
      inboundDate: dayjs().format('YYYY-MM-DD'),
      expiryDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
      moistureContent: '',
      impurityRate: '',
      remark: ''
    })
  }

  return (
    <View className={styles.container}>
      <ScrollView scrollY style={{ height: 'calc(100vh - 140rpx)' }}>
        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>基本信息</Text>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}><Text className={styles.required}>*</Text>粮食品种</Text>
            <Picker mode='selector' range={GRAIN_TYPES} onChange={(e) => updateForm('grainType', GRAIN_TYPES[e.detail.value])}>
              <View className={styles.pickerValue}>
                <Text className={!form.grainType ? styles.pickerPlaceholder : ''}>
                  {form.grainType || '请选择品种'}
                </Text>
              </View>
            </Picker>
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>等级</Text>
            <Picker mode='selector' range={GRADES} onChange={(e) => updateForm('grade', GRADES[e.detail.value])}>
              <View className={styles.pickerValue}>
                <Text className={!form.grade ? styles.pickerPlaceholder : ''}>
                  {form.grade || '请选择等级'}
                </Text>
              </View>
            </Picker>
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}><Text className={styles.required}>*</Text>仓号</Text>
            <Picker mode='selector' range={WAREHOUSES} onChange={(e) => updateForm('warehouseNo', WAREHOUSES[e.detail.value])}>
              <View className={styles.pickerValue}>
                <Text className={!form.warehouseNo ? styles.pickerPlaceholder : ''}>
                  {form.warehouseNo || '请选择仓号'}
                </Text>
              </View>
            </Picker>
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}><Text className={styles.required}>*</Text>数量(吨)</Text>
            <Input
              className={styles.formInput}
              type='digit'
              placeholder='请输入入库数量'
              value={form.quantity}
              onInput={(e) => updateForm('quantity', e.detail.value)}
            />
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}><Text className={styles.required}>*</Text>供应商</Text>
            <Input
              className={styles.formInput}
              placeholder='请输入供应商名称'
              value={form.supplier}
              onInput={(e) => updateForm('supplier', e.detail.value)}
            />
          </View>
        </View>

        <View className={styles.formSection}>
          <Text className={styles.sectionTitle}>效期与检验</Text>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}><Text className={styles.required}>*</Text>入仓日期</Text>
            <Picker mode='date' value={form.inboundDate} onChange={(e) => updateForm('inboundDate', e.detail.value)}>
              <View className={styles.pickerValue}>
                <Text className={!form.inboundDate ? styles.pickerPlaceholder : ''}>
                  {form.inboundDate || '请选择入仓日期'}
                </Text>
              </View>
            </Picker>
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}><Text className={styles.required}>*</Text>保质到期日</Text>
            <Picker mode='date' value={form.expiryDate} onChange={(e) => updateForm('expiryDate', e.detail.value)}>
              <View className={styles.pickerValue}>
                <Text className={!form.expiryDate ? styles.pickerPlaceholder : ''}>
                  {form.expiryDate || '请选择到期日期'}
                </Text>
              </View>
            </Picker>
          </View>
          <View className={styles.formRow}>
            <View className={styles.formRowItem}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>水分含量(%)</Text>
                <Input
                  className={styles.formInput}
                  type='digit'
                  placeholder='如 12.5，≤14合格'
                  value={form.moistureContent}
                  onInput={(e) => updateForm('moistureContent', e.detail.value)}
                />
              </View>
            </View>
            <View className={styles.formRowItem}>
              <View className={styles.formItem}>
                <Text className={styles.formLabel}>杂质率(%)</Text>
                <Input
                  className={styles.formInput}
                  type='digit'
                  placeholder='如 0.8，≤1.5合格'
                  value={form.impurityRate}
                  onInput={(e) => updateForm('impurityRate', e.detail.value)}
                />
              </View>
            </View>
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}>备注</Text>
            <Input
              className={styles.textArea}
              placeholder='请输入备注信息'
              value={form.remark}
              onInput={(e) => updateForm('remark', e.detail.value)}
            />
          </View>
          <View className={styles.inspectionNotice}>
            <Text className={styles.noticeText}>💡 填写水分和杂质后将自动生成「到货验收」检验记录，并根据数值判断合格/不合格。效期状态将根据到期日自动计算。</Text>
          </View>
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.resetBtn} onClick={handleReset}>
          <Text style={{ fontSize: '28rpx', color: '#5A5A5A', whiteSpace: 'nowrap' }}>重置</Text>
        </View>
        <View className={styles.submitBtn} onClick={!submitting ? handleSubmit : undefined}>
          <Text style={{ fontSize: '32rpx', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {submitting ? '处理中...' : '确认入库'}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default InboundPage
