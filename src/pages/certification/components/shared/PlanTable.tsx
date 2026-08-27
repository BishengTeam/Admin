import { useCallback, useEffect, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Space, Table, Tag, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePermission } from '@/hooks/usePermission'
import { certificationService } from '@/services/certification'
import { formatDate } from '@/utils/format'
import type { CertificationPlan, CertificationPlanPayload } from '@/types/certification'
import { PLAN_STATUS_MAP } from '@/types/certification'
import type { CertType } from '../vendors/type-registry'

const { RangePicker } = DatePicker
const { Text } = Typography

interface PlanTableProps {
  type: CertType
  productCode: string | null
  overrides?: React.ReactNode  // vendor 可选替换整个表格
}

interface PlanFormValues {
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

export default function PlanTable({ type, productCode, overrides }: PlanTableProps) {
  const canWrite = usePermission('content:write')
  const [plans, setPlans] = useState<CertificationPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CertificationPlan | null>(null)
  const [form] = Form.useForm<PlanFormValues>()

  const loadPlans = useCallback(async () => {
    if (!productCode) { setPlans([]); return }
    setLoading(true)
    try {
      setPlans(await certificationService.listPlans(productCode))
    } catch { setPlans([]) }
    finally { setLoading(false) }
  }, [productCode])

  useEffect(() => { loadPlans() }, [loadPlans])

  // vendor 可完全替换渲染
  if (overrides) {
    return <>{overrides}</>
  }

  if (!productCode) {
    return <Empty description='请先选择认证产品' />
  }

  const handleCreate = () => { setEditingPlan(null); form.resetFields(); form.setFieldsValue({ capacity: 0 }); setModalOpen(true) }
  const handleEdit = (plan: CertificationPlan) => {
    setEditingPlan(plan)
    form.setFieldsValue({
      name: plan.name,
      apply_range: plan.apply_start && plan.apply_end ? [dayjs(plan.apply_start), dayjs(plan.apply_end)] : undefined,
      exam_date: plan.exam_date ? dayjs(plan.exam_date) : null,
      capacity: plan.capacity,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const [s, e] = values.apply_range || []
    const payload: CertificationPlanPayload = {
      name: values.name.trim(),
      apply_start: s ? s.toISOString() : null,
      apply_end: e ? e.toISOString() : null,
      exam_date: values.exam_date ? values.exam_date.toISOString() : null,
      capacity: values.capacity ?? 0,
    }
    setSaving(true)
    try {
      if (editingPlan) { await certificationService.updatePlan(productCode, editingPlan.id, payload); message.success('批次已更新') }
      else { await certificationService.createPlan(productCode, payload); message.success('批次已创建') }
      setModalOpen(false)
      await loadPlans()
    } finally { setSaving(false) }
  }

  const action = async (fn: () => Promise<unknown>) => { await fn(); await loadPlans() }

  const columns: ColumnsType<CertificationPlan> = [
    { title: '名称', dataIndex: 'name', width: 200, ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 110,
      render: (s: string) => { const m = PLAN_STATUS_MAP[s as keyof typeof PLAN_STATUS_MAP]; return m ? <Tag color={m.color}>{m.text}</Tag> : s },
    },
    { title: '报名时间', key: 'range', width: 200, render: (_, r) => `${formatPlanDate(r.apply_start)} ~ ${formatPlanDate(r.apply_end)}` },
    { title: '考试日期', dataIndex: 'exam_date', width: 150, render: (v: string | null) => formatPlanDate(v) },
    { title: '名额', width: 100, render: (_, r) => renderCapacity(r) },
    {
      title: '操作', width: canWrite ? 200 : 80, fixed: 'right',
      render: (_, plan) => (
        <Space size={0}>
          {canWrite && plan.status === 'draft' && <Button type='link' size='small' onClick={() => handleEdit(plan)}>编辑</Button>}
          {canWrite && plan.status === 'draft' && <Button type='link' size='small' onClick={() => action(() => certificationService.publishPlan(productCode, plan.id))}>发布</Button>}
          {canWrite && plan.status === 'published' && <Button type='link' size='small' onClick={() => action(() => certificationService.finalizePlan(productCode, plan.id))}>终结</Button>}
          {canWrite && plan.status === 'published' && <Button type='link' size='small' danger onClick={() => action(() => certificationService.cancelPlan(productCode, plan.id))}>取消</Button>}
          {canWrite && plan.status === 'draft' && (
            <ConfirmButton title='删除批次' description='确认删除此批次？' type='link' size='small' danger onConfirm={() => action(() => certificationService.deletePlan(productCode, plan.id))}>
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
          {canWrite && <Button type='primary' icon={<PlusOutlined />} onClick={handleCreate}>新建批次</Button>}
          <Button icon={<ReloadOutlined />} onClick={loadPlans} loading={loading}>刷新</Button>
        </Space>
        <Text type='secondary'>产品：{productCode}</Text>
      </div>
      <Table rowKey='id' columns={columns} dataSource={plans} loading={loading} pagination={false} scroll={{ x: 1000 }} size='middle'
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无批次' /> }}
      />
      <Modal title={`${editingPlan ? '编辑' : '新建'}批次 — ${productCode}`} open={modalOpen} onOk={handleSubmit} okButtonProps={{ loading: saving }} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout='vertical' style={{ marginTop: 16 }}>
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
