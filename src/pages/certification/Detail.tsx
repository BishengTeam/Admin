import { useEffect, useState } from 'react'
import { Button, DatePicker, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { certificationService } from '@/services/certification'
import { formatPrice } from '@/utils/format'
import { PLAN_STATUS_MAP } from '@/types/certification'
import type { Certification, CertificationPlan, CertificationPlanPayload } from '@/types/certification'
import dayjs, { type Dayjs } from 'dayjs'

const { Text } = Typography
const { RangePicker } = DatePicker

export default function CertificationDetail() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const canWrite = usePermission('content:write')
  const [cert, setCert] = useState<Certification | null>(null)
  const [plans, setPlans] = useState<CertificationPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CertificationPlan | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [form] = Form.useForm<CertificationPlanPayload & { applyRange?: [Dayjs, Dayjs]; exam_date?: Dayjs }>()

  const loadData = async () => {
    if (!code) return
    setLoading(true)
    try {
      const list = await certificationService.list({ page: 1, page_size: 100, keyword: code })
      const found = list.items.find(c => c.code === code)
      setCert(found ?? null)
      try {
        const planList = await certificationService.listPlans(code)
        setPlans(planList)
      } catch { setPlans([]) }
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [code])

  const handleCreatePlan = () => {
    setEditingPlan(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEditPlan = (plan: CertificationPlan) => {
    setEditingPlan(plan)
    const range = plan.apply_start && plan.apply_end
      ? [dayjs(plan.apply_start), dayjs(plan.apply_end)] as [Dayjs, Dayjs]
      : undefined
    form.setFieldsValue({
      name: plan.name,
      applyRange: range,
      exam_date: plan.exam_date ? dayjs(plan.exam_date) : undefined,
      capacity: plan.capacity,
      price_cents: plan.price_cents,
      exam_location: plan.exam_location ?? '',
      description: plan.description ?? '',
      contact_name: plan.contact_name ?? '',
      contact_phone: plan.contact_phone ?? '',
      sort_order: plan.sort_order,
    } as Record<string, unknown>)
    setModalOpen(true)
  }

  const handleModalOk = async () => {
    if (!code) return
    const values = await form.validateFields()
    const [start, end] = values.applyRange ?? [undefined, undefined]
    const payload: CertificationPlanPayload = {
      name: values.name,
      apply_start: start ? start.format('YYYY-MM-DD') : null,
      apply_end: end ? end.format('YYYY-MM-DD') : null,
      exam_date: values.exam_date ? values.exam_date.format('YYYY-MM-DD') : null,
      capacity: values.capacity,
      price_cents: values.price_cents,
      exam_location: values.exam_location || null,
      description: values.description || null,
      contact_name: values.contact_name || null,
      contact_phone: values.contact_phone || null,
      sort_order: values.sort_order,
    }
    setConfirmLoading(true)
    try {
      if (editingPlan) {
        await certificationService.updatePlan(code, editingPlan.id, payload)
        message.success('批次已更新')
      } else {
        await certificationService.createPlan(code, payload)
        message.success('批次已创建')
      }
      setModalOpen(false)
      loadData()
    } catch (e: any) {
      message.error(e?.message || '操作失败')
    } finally { setConfirmLoading(false) }
  }

  const handlePublish = async (plan: CertificationPlan) => {
    if (!code) return
    await certificationService.publishPlan(code, plan.id)
    message.success('已发布')
    loadData()
  }

  const handleFinalize = async (plan: CertificationPlan) => {
    if (!code) return
    await certificationService.finalizePlan(code, plan.id)
    message.success('已终结')
    loadData()
  }

  const handleCancel = async (plan: CertificationPlan) => {
    if (!code) return
    await certificationService.cancelPlan(code, plan.id)
    message.success('已取消')
    loadData()
  }

  const handleDelete = async (plan: CertificationPlan) => {
    if (!code) return
    await certificationService.deletePlan(code, plan.id)
    message.success('已删除')
    loadData()
  }

  const getVendorRoute = (vendor: string) => {
    const lower = vendor.toLowerCase()
    if (lower === 'h3c') return '/admin/certification/h3c'
    if (lower === '人社' || lower === 'renshe') return '/admin/certification/renshe'
    return null
  }

  const columns: ColumnsType<CertificationPlan> = [
    { title: '批次名称', dataIndex: 'name', key: 'name', width: 200 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => { const m = PLAN_STATUS_MAP[s as keyof typeof PLAN_STATUS_MAP]; return m ? <Tag color={m.color}>{m.text}</Tag> : s } },
    { title: '报名时间', key: 'applyRange', width: 200, render: (_, r) => r.apply_start && r.apply_end ? `${r.apply_start.slice(5)} ~ ${r.apply_end.slice(5)}` : '-' },
    { title: '考试日期', dataIndex: 'exam_date', key: 'exam_date', width: 110, render: (d: string | null) => d?.slice(5) ?? '-' },
    { title: '容量', dataIndex: 'capacity', key: 'capacity', width: 70, align: 'right' },
    { title: '已报名', dataIndex: 'enrolled', key: 'enrolled', width: 70, align: 'right' },
    { title: '价格', dataIndex: 'price_cents', key: 'price_cents', width: 80, align: 'right', render: (c: number) => formatPrice(c) },
    {
      title: '操作', key: 'actions', width: canWrite ? 200 : 100, fixed: 'right',
      render: (_, plan) => (
        <Space size={0}>
          {canWrite && plan.status === 'draft' && <Button type='link' size='small' onClick={() => handleEditPlan(plan)}>编辑</Button>}
          {canWrite && plan.status === 'draft' && <Button type='link' size='small' onClick={() => handlePublish(plan)}>发布</Button>}
          {canWrite && plan.status === 'published' && <Button type='link' size='small' onClick={() => handleFinalize(plan)}>终结</Button>}
          {canWrite && plan.status === 'published' && <Button type='link' size='small' danger onClick={() => handleCancel(plan)}>取消</Button>}
          {canWrite && plan.status === 'draft' && <Popconfirm title='确认删除此批次？' onConfirm={() => handleDelete(plan)}><Button type='link' size='small' danger>删除</Button></Popconfirm>}
        </Space>
      ),
    },
  ]

  const vendorRoute = cert ? getVendorRoute(cert.vendor) : null

  return (
    <PageContainer
      title={cert ? cert.code : '认证详情'}
      extra={[
        <Button key='back' icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/certification')}>返回总览</Button>,
        vendorRoute && <Button key='vendor' onClick={() => navigate(vendorRoute)}>厂商工作台</Button>,
        canWrite && <Button key='create' type='primary' icon={<PlusOutlined />} onClick={handleCreatePlan}>新建批次</Button>,
      ]}
    >
      {cert && (
        <Descriptions bordered size='small' column={4} style={{ marginBottom: 24 }}>
          <Descriptions.Item label='认证代码'>{cert.code}</Descriptions.Item>
          <Descriptions.Item label='厂商'>{cert.vendor}</Descriptions.Item>
          <Descriptions.Item label='普通价格'>{formatPrice(cert.normal_price)}</Descriptions.Item>
          <Descriptions.Item label='学生价格'>{formatPrice(cert.student_price)}</Descriptions.Item>
          <Descriptions.Item label='状态'><Tag color={cert.is_active ? 'success' : 'default'}>{cert.is_active ? '启用' : '禁用'}</Tag></Descriptions.Item>
        </Descriptions>
      )}
      <Table
        rowKey='id'
        columns={columns}
        dataSource={plans}
        loading={loading}
        pagination={false}
        scroll={{ x: 1000 }}
        size='middle'
      />
      <Modal
        title={editingPlan ? '编辑批次' : '新建批次'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={confirmLoading}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout='vertical' style={{ marginTop: 16 }}>
          <Form.Item name='name' label='批次名称' rules={[{ required: true, message: '请输入批次名称' }]}>
            <Input placeholder='如：2026 年第 1 次考试' />
          </Form.Item>
          <Form.Item name='applyRange' label='报名时间'>
            <RangePicker style={{ width: '100%' }} placeholder={['报名开始', '报名截止']} />
          </Form.Item>
          <Form.Item name='exam_date' label='考试日期'>
            <DatePicker style={{ width: '100%' }} placeholder='选择考试日期' />
          </Form.Item>
          <Form.Item name='capacity' label='容量（人）'><InputNumber min={1} style={{ width: '100%' }} placeholder='最大报名人数' /></Form.Item>
          <Form.Item name='price_cents' label='价格（分）'><InputNumber min={0} style={{ width: '100%' }} addonAfter='分' /></Form.Item>
          <Form.Item name='exam_location' label='考试地点'><Input placeholder='考试地点' /></Form.Item>
          <Form.Item name='description' label='描述'><Input.TextArea rows={3} placeholder='批次备注' /></Form.Item>
          <Form.Item name='contact_name' label='联系人'><Input placeholder='联系人姓名' /></Form.Item>
          <Form.Item name='contact_phone' label='联系电话'><Input placeholder='联系电话' /></Form.Item>
          <Form.Item name='sort_order' label='排序'><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
