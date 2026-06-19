import React, { useState } from 'react'
import { View, Text, Input, Picker, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGrainStore } from '@/store'
import styles from './index.module.scss'

const GRAIN_TYPES = ['小麦', '玉米', '稻谷', '大豆', '高粱', '其他']
const GRADES = ['一等', '二等', '三等']
const WAREHOUSES = ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-03', 'C-01', 'C-02', 'D-01', 'D-02']

const InboundPage: React.FC = () => {
  const { addBatch } = useGrainStore()
  const [form, setForm] = useState({
    grainType: '',
    grade: '',
    warehouseNo: '',
    quantity: '',
    supplier: '',
    inboundDate: '',
    expiryDate: '',
    moistureContent: '',
    impurityRate: '',
    remark: ''
  })

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
    return true
  }

  const handleSubmit = () => {
    if (!validateForm()) return

    const now = new Date()
    const batchNo = `PK${now.getFullYear()}Q${Math.ceil((now.getMonth() + 1) / 3)}-${String(Date.now()).slice(-3)}`
    const expiryDate = new Date(form.expiryDate)
    const warningDate = new Date(expiryDate)
    warningDate.setMonth(warningDate.getMonth() - 1)

    addBatch({
      id: `B${Date.now()}`,
      batchNo,
      grainType: form.grainType,
      warehouseNo: form.warehouseNo,
      quantity: Number(form.quantity),
      remainingQuantity: Number(form.quantity),
      unit: '吨',
      inboundDate: form.inboundDate,
      expiryDate: form.expiryDate,
      warningDate: warningDate.toISOString().split('T')[0],
      status: 'normal',
      supplier: form.supplier,
      moistureContent: Number(form.moistureContent) || 0,
      impurityRate: Number(form.impurityRate) || 0,
      grade: form.grade || '二等',
      remark: form.remark
    })

    console.info('[Inbound] 新增批次:', batchNo)
    Taro.showToast({ title: '入库登记成功', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 1500)
  }

  const handleReset = () => {
    setForm({
      grainType: '',
      grade: '',
      warehouseNo: '',
      quantity: '',
      supplier: '',
      inboundDate: '',
      expiryDate: '',
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
            <Picker mode='date' onChange={(e) => updateForm('inboundDate', e.detail.value)}>
              <View className={styles.pickerValue}>
                <Text className={!form.inboundDate ? styles.pickerPlaceholder : ''}>
                  {form.inboundDate || '请选择入仓日期'}
                </Text>
              </View>
            </Picker>
          </View>
          <View className={styles.formItem}>
            <Text className={styles.formLabel}><Text className={styles.required}>*</Text>保质到期日</Text>
            <Picker mode='date' onChange={(e) => updateForm('expiryDate', e.detail.value)}>
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
                  placeholder='如 12.5'
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
                  placeholder='如 0.8'
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
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.resetBtn} onClick={handleReset}>
          <Text style={{ fontSize: '28rpx', color: '#5A5A5A', whiteSpace: 'nowrap' }}>重置</Text>
        </View>
        <View className={styles.submitBtn} onClick={handleSubmit}>
          <Text style={{ fontSize: '32rpx', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>确认入库</Text>
        </View>
      </View>
    </View>
  )
}

export default InboundPage
