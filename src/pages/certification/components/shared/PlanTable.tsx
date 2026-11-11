import { useCallback, useEffect, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePermission } from '@/hooks/usePermission'
import { certificationService } from '@/services/certification'
import { certProductService } from '@/services/certProduct'
import { formatDate } from '@/utils/format'
import type { CertificationPlan, CertificationPlanPayload } from '@/types/certification'
import { PLAN_STATUS_MAP } from '@/types/certification'
import type { CertProduct } from '@/types/certProduct'
import type { CertType } from '../vendors/type-registry'

const { RangePicker } = DatePicker
const { Text } = Typography

interface PlanTableProps {
  type: CertType
  overrides?: React.ReactNode
}

interface PlanFormValues {
  product_code?: string
  name: string
  apply_range?: [Dayjs, Dayjs]
  exam_date?: Dayjs | null
  capacity?: number | null
}

function formatPlanDate(value: string | null): string {
  return value ? formatDate(value, 'YYYY-MM-DD HH:mm') : '-'
}

function renderCapacity(plan: CertificationPlan): string {
  if (!plan.capacity) return `${plan.enrolled}/不限`
  return `${plan.enrolled}/${plan.capacity}`
}

export default function PlanTable({ type, overrides }: PlanTableProps) {
  const canWrite = usePermission('content:write')
  const [plans, setPlans] = useState<CertificationPlan[]>([])
  const [products, setProducts] = useState<CertProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CertificationPlan | null>(null)
  const [form] = Form.useForm<PlanFormValues>()

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const productPage = await certProductService.list({ type, page: 1, page_size: 100 })
      setProducts(productPage.items)
      const planGroups = await Promise.all(
        productPage.items.map(product =>
          certificationService.listPlans(product.code).catch(() => [] as CertificationPlan[])
        )
      )
      setPlans(planGroups.flat().sort((a, b) => b.id - a.id))
    } catch {
      setProducts([])
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => { if (!overrides) void loadPlans() }, [loadPlans, overrides])

  if (overrides) {
    return <>{overrides}</>
  }

  const activeProducts = products.filter(product => product.is_active)
  const productLabel = (code: string) => {
    const product = products.find(item => item.code === code)
    return product ? `${code} · ${product.chinese_name}` : code
  }

  const handleCreate = () => {
    setEditingPlan(null)
    form.resetFields()
    form.setFieldsValue({
      capacity: 0,
      product_code: activeProducts.length === 1 ? activeProducts[0].code : undefined,
    })
    setModalOpen(true)
  }

  const handleEdit = (plan: CertificationPlan) => {
    setEditingPlan(plan)
    form.setFieldsValue({
      product_code: plan.product_type,
      name: plan.name,
      apply_range: plan.apply_start && plan.apply_end
        ? [dayjs(plan.apply_start), dayjs(plan.apply_end)]
        : undefined,
      exam_date: plan.exam_date ? dayjs(plan.exam_date) : null,
      capacity: plan.capacity,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const [start, end] = values.apply_range || []
    const productCode = editingPlan ? editingPlan.product_type : values.product_code
    const payload: CertificationPlanPayload = {
      name: values.name.trim(),
      apply_start: start ? start.toISOString() : null,
      apply_end: end ? end.toISOString() : null,
      exam_date: values.exam_date ? values.exam_date.toISOString() : null,
      capacity: values.capacity ?? 0,
    }
    if (!productCode) {
      message.warning('请选择认证产品')
      return
    }

    setSaving(true)
    try {
      if (editingPlan) {
        await certificationService.updatePlan(productCode, editingPlan.id, payload)
        message.success('批次已更新')
      } else {
        await certificationService.createPlan(productCode, payload)
        message.success('批次已创建')
      }
      setModalOpen(false)
      await loadPlans()
    } finally {
      setSaving(false)
    }
  }

  const runPlanAction = async (
    plan: CertificationPlan,
    action: (productCode: string) => Promise<unknown>,
  ) => {
    await action(plan.product_type)
    await loadPlans()
  }

  const columns: ColumnsType<CertificationPlan> = [
    { title: '名称', dataIndex: 'name', width: 200, ellipsis: true },
    {
      title: '产品',
      dataIndex: 'product_type',
      width: 190,
      ellipsis: true,
      render: productLabel,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: CertificationPlan['status']) => {
        const config = PLAN_STATUS_MAP[status]
        return config ? <Tag color={config.color}>{config.text}</Tag> : status
      },
    },
    {
      title: '报名时间',
      key: 'range',
      width: 200,
      render: (_, plan) => `${formatPlanDate(plan.apply_start)} ~ ${formatPlanDate(plan.apply_end)}`,
    },
    { title: '考试日期', dataIndex: 'exam_date', width: 150, render: value => formatPlanDate(value) },
    { title: '名额', width: 100, render: (_, plan) => renderCapacity(plan) },
    {
      title: '操作',
      width: canWrite ? 220 : 80,
      fixed: 'right',
      render: (_, plan) => (
        <Space size={0}>
          {canWrite && plan.status === 'draft' && (
            <Button type='link' size='small' onClick={() => handleEdit(plan)}>编辑</Button>
          )}
          {canWrite && plan.status === 'draft' && (
            <Button
              type='link'
              size='small'
              onClick={() => void runPlanAction(plan, code => certificationService.publishPlan(code, plan.id))}
            >
              发布
            </Button>
          )}
          {canWrite && plan.status === 'published' && (
            <Button
              type='link'
              size='small'
              onClick={() => void runPlanAction(plan, code => certificationService.finalizePlan(code, plan.id))}
            >
              终结
            </Button>
          )}
          {canWrite && plan.status === 'published' && (
            <Button
              type='link'
              size='small'
              danger
              onClick={() => void runPlanAction(plan, code => certificationService.cancelPlan(code, plan.id))}
            >
              取消
            </Button>
          )}
          {canWrite && plan.status === 'draft' && (
            <ConfirmButton
              title='删除批次'
              description='确认删除该批次？'
              type='link'
              size='small'
              danger
              onConfirm={() => runPlanAction(plan, code => certificationService.deletePlan(code, plan.id))}
            >
              删除
            </ConfirmButton>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          {canWrite && (
            <Button
              type='primary'
              icon={<PlusOutlined />}
              disabled={activeProducts.length === 0}
              onClick={handleCreate}
            >
              新建批次
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => { void loadPlans() }} loading={loading}>刷新</Button>
        </Space>
        <Text type='secondary'>共 {plans.length} 个批次</Text>
      </div>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={plans}
        loading={loading}
        pagination={false}
        scroll={{ x: 1100 }}
        size='middle'
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={products.length === 0 ? '请先在产品页创建认证产品' : '暂无批次'}
            />
          ),
        }}
      />
      <Modal
        title={editingPlan ? `编辑批次 — ${editingPlan.product_type}` : '新建批次'}
        open={modalOpen}
        onOk={handleSubmit}
        okButtonProps={{ loading: saving }}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout='vertical' style={{ marginTop: 16 }}>
          <Form.Item
            name='product_code'
            label='认证产品'
            rules={[{ required: true, message: '请选择认证产品' }]}
            tooltip='产品在产品页创建；此处选择本批次挂载的产品'
          >
            <Select
              placeholder='选择认证产品'
              showSearch
              optionFilterProp='label'
              disabled={Boolean(editingPlan)}
              options={activeProducts.map(product => ({
                label: `${product.code} · ${product.chinese_name}`,
                value: product.code,
              }))}
              notFoundContent={products.length === 0 ? '请先在产品页创建认证产品' : undefined}
            />
          </Form.Item>
          <Form.Item name='name' label='批次名称' rules={[{ required: true, message: '请输入批次名称' }, { whitespace: true }]}>
            <Input placeholder='如：2026年第三期' maxLength={128} showCount />
          </Form.Item>
          <Form.Item name='apply_range' label='报名时间' rules={[{ required: true, message: '请选择报名时间' }]}>
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name='exam_date' label='考试日期'>
            <DatePicker showTime style={{ width: '100%' }} placeholder='可选' />
          </Form.Item>
          <Form.Item name='capacity' label='名额上限' tooltip='0 表示不限' rules={[{ required: true }]}>
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
