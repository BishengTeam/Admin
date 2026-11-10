/**
 * 统一批次产品添加模态框 — 根据产品 type 动态渲染厂商专属配置表单
 */
import { useMemo, useState } from 'react'
import { Form, Input, InputNumber, Modal, Select, Space, Typography } from 'antd'
import type { CertProduct } from '@/types/certProduct'
import type { H3CBatchConfig, NispBatchConfig } from './service'

const { Text } = Typography

const VENDOR_LABEL: Record<string, string> = {
  h3c: 'H3C',
  nisp: 'NISP',
  renshe: '人社',
  sangfor: '深信服',
  generic: '通用',
}

interface ProductAddModalProps {
  open: boolean
  onClose: () => void
  onAdd: (payload: Record<string, unknown>) => Promise<void>
  products: CertProduct[]
  batchId: number
}

export default function ProductAddModal({ open, onClose, onAdd, products }: ProductAddModalProps) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )
  const productType = selectedProduct?.type || ''

  const availableProducts = products.filter(
    (p) => p.is_active && p.type !== 'generic'
  )

  const handleAdd = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        product_id: selectedProductId,
        capacity: values.capacity ?? 0,
      }

      if (productType === 'renshe') {
        payload.renshe_config_id = values.renshe_config_id
        payload.occupation_name = values.occupation_name
        payload.occupation_code = values.occupation_code
        payload.skill_level = values.skill_level
        payload.exam_type = values.exam_type
        payload.application_type = values.application_type
      } else if (productType === 'h3c') {
        payload.h3c_config = {
          exam_code: values.h3c_exam_code,
          coupon_price_cents: values.h3c_coupon_price ?? 0,
          student_price_cents: values.h3c_student_price ?? 0,
          full_price_cents: values.h3c_full_price ?? 0,
          payment_timeout_minutes: values.h3c_payment_timeout ?? 30,
          resubmission_window_hours: values.h3c_resubmission_window ?? 48,
          max_resubmissions: values.h3c_max_resubmissions ?? 3,
        } satisfies H3CBatchConfig
      } else if (productType === 'nisp') {
        payload.nisp_config = {
          level: values.nisp_level ?? '1',
          level1_price_cents: values.nisp_level1_price ?? 0,
          level2_price_cents: values.nisp_level2_price ?? 0,
        } satisfies NispBatchConfig
      }

      await onAdd(payload)
      form.resetFields()
      setSelectedProductId(null)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="添加产品到批次"
      open={open}
      onOk={handleAdd}
      onCancel={() => { onClose(); form.resetFields(); setSelectedProductId(null) }}
      confirmLoading={saving}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item label="选择产品" required>
          <Select
            showSearch
            placeholder="选择认证产品（跨厂商）"
            style={{ width: '100%' }}
            value={selectedProductId}
            onChange={(v) => {
              setSelectedProductId(v)
              form.resetFields()
            }}
            optionFilterProp="label"
            options={availableProducts.map((p) => ({
              value: p.id,
              label: `[${VENDOR_LABEL[p.type] ?? p.type}] ${p.name} (${p.code})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="capacity"
          label={`名额${productType === 'h3c' ? '（必填 > 0）' : '（0=不限）'}`}
          rules={productType === 'h3c' ? [{ required: true, message: 'H3C 必须设置名额' }] : []}
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder="该产品在此批次的名额" />
        </Form.Item>

        {productType === 'h3c' && <H3CConfigFields />}
        {productType === 'nisp' && <NispConfigFields />}
        {productType === 'renshe' && <RensheConfigFields />}
        {productType === 'sangfor' && (
          <Text type="secondary">深信服产品无需额外配置</Text>
        )}
      </Form>
    </Modal>
  )
}

// ============================================================
// 厂商专属配置表单片段
// ============================================================

function H3CConfigFields() {
  return (
    <>
      <Typography.Title level={5}>H3C 专属配置</Typography.Title>
      <Form.Item name="h3c_exam_code" label="考试编码" rules={[{ required: true, message: '请输入考试编码' }]}>
        <Input maxLength={64} placeholder="如 H3C-GB0-390" />
      </Form.Item>
      <Space wrap>
        <Form.Item name="h3c_coupon_price" label="考券价（分）" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="h3c_student_price" label="学生价（分）" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="h3c_full_price" label="全额价（分）" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: 140 }} />
        </Form.Item>
      </Space>
      <Space wrap>
        <Form.Item name="h3c_payment_timeout" label="支付超时（分钟）" initialValue={30}>
          <InputNumber min={1} max={1440} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="h3c_resubmission_window" label="补交窗口（小时）" initialValue={48}>
          <InputNumber min={1} max={720} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="h3c_max_resubmissions" label="最大补交次数" initialValue={3}>
          <InputNumber min={0} max={10} style={{ width: 140 }} />
        </Form.Item>
      </Space>
    </>
  )
}

function NispConfigFields() {
  return (
    <>
      <Typography.Title level={5}>NISP 专属配置</Typography.Title>
      <Form.Item name="nisp_level" label="等级" rules={[{ required: true }]} initialValue="1">
        <Select style={{ width: 120 }} options={[
          { value: '1', label: '一级' },
          { value: '2', label: '二级' },
        ]} />
      </Form.Item>
      <Space wrap>
        <Form.Item name="nisp_level1_price" label="一级价（分）" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="nisp_level2_price" label="二级价（分）" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: 160 }} />
        </Form.Item>
      </Space>
    </>
  )
}

function RensheConfigFields() {
  return (
    <>
      <Typography.Title level={5}>人社专属配置</Typography.Title>
      <Form.Item name="renshe_config_id" label="项目配置 ID" rules={[{ required: true, message: '请输入人社项目配置 ID' }]}>
        <InputNumber min={1} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="occupation_name" label="职业名称" rules={[{ required: true }]}>
        <Input maxLength={64} />
      </Form.Item>
      <Form.Item name="occupation_code" label="职业编码">
        <Input maxLength={160} />
      </Form.Item>
      <Space wrap>
        <Form.Item name="skill_level" label="技能等级" rules={[{ required: true }]}>
          <Input maxLength={32} />
        </Form.Item>
        <Form.Item name="exam_type" label="考试类型" rules={[{ required: true }]}>
          <Input maxLength={16} placeholder="新考/补考" />
        </Form.Item>
        <Form.Item name="application_type" label="申请类型" rules={[{ required: true }]}>
          <Input maxLength={16} placeholder="学历型/工龄型" />
        </Form.Item>
      </Space>
    </>
  )
}
