import { useCallback, useEffect, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Space, Table, Tag, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { ConfirmButton } from '@/components/ConfirmButton'
import { certificationService } from '@/services/certification'
import { formatDate } from '@/utils/format'
import type { Certification, CertificationPlan, CertificationPlanPayload } from '@/types/certification'
import { PLAN_STATUS_MAP } from '@/types/certification'

const { RangePicker } = DatePicker
const { Text } = Typography

interface PlanFormValues {
  name: string
  apply_range?: [Dayjs, Dayjs]
  exam_date?: Dayjs | null
  capacity?: number | null
}

interface PlanManagementProps {
  certification: Certification
}

function formatPlanDate(value: string | null): string {
  return value ? formatDate(value, 'YYYY-MM-DD HH:mm') : '-'
}

function renderCapacity(plan: CertificationPlan): string {
  if (!plan.capacity) {
    return `${plan.enrolled}/不限`
  }
  return `${plan.enrolled}/${plan.capacity}`
}

function toFormValues(plan: CertificationPlan): PlanFormValues {
  return {
    name: plan.name,
    apply_range: plan.apply_start && plan.apply_end ? [dayjs(plan.apply_start), dayjs(plan.apply_end)] : undefined,
    exam_date: plan.exam_date ? dayjs(plan.exam_date) : null,
    capacity: plan.capacity,
  }
}

function toPayload(values: PlanFormValues): CertificationPlanPayload {
  const [applyStart, applyEnd] = values.apply_range || []
  return {
    name: values.name.trim(),
    apply_start: applyStart ? applyStart.toISOString() : null,
    apply_end: applyEnd ? applyEnd.toISOString() : null,
    exam_date: values.exam_date ? values.exam_date.toISOString() : null,
    capacity: values.capacity ?? 0,
  }
}

export default function PlanManagement({ certification }: PlanManagementProps) {
  const [plans, setPlans] = useState<CertificationPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CertificationPlan | null>(null)
  const [form] = Form.useForm<PlanFormValues>()

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const data = await certificationService.listPlans(certification.code)
      setPlans(data)
    } finally {
      setLoading(false)
    }
  }, [certification.code])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const handleCreate = () => {
    setEditingPlan(null)
    form.resetFields()
    form.setFieldsValue({ capacity: 0 })
    setModalOpen(true)
  }

  const handleEdit = (plan: CertificationPlan) => {
    setEditingPlan(plan)
    form.setFieldsValue(toFormValues(plan))
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const payload = toPayload(values)
    setSaving(true)
    try {
      if (editingPlan) {
        await certificationService.updatePlan(certification.code, editingPlan.id, payload)
        message.success('批次已更新')
      } else {
        await certificationService.createPlan(certification.code, payload)
        message.success('批次已创建')
      }
      setModalOpen(false)
      await loadPlans()
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (plan: CertificationPlan) => {
    await certificationService.publishPlan(certification.code, plan.id)
    message.success('批次已发布')
    await loadPlans()
  }

  const handleArchive = async (plan: CertificationPlan) => {
    await certificationService.archivePlan(certification.code, plan.id)
    message.success('批次已归档')
    await loadPlans()
  }

  const handleCancel = async (plan: CertificationPlan) => {
    await certificationService.cancelPlan(certification.code, plan.id)
    message.success('批次已取消')
    await loadPlans()
  }

  const handleDelete = async (plan: CertificationPlan) => {
    await certificationService.deletePlan(certification.code, plan.id)
    message.success('批次已删除')
    await loadPlans()
  }

  const columns: ColumnsType<CertificationPlan> = [
    {
      title: '批次',
      dataIndex: 'id',
      width: 80,
      render: (id: number) => `#${id}`,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
    },
    {
      title: '报名时间',
      width: 240,
      render: (_, record) => `${formatPlanDate(record.apply_start)} ~ ${formatPlanDate(record.apply_end)}`,
    },
    {
      title: '考试日期',
      dataIndex: 'exam_date',
      width: 150,
      render: (value: string | null) => formatPlanDate(value),
    },
    {
      title: '名额',
      width: 90,
      render: (_, record) => renderCapacity(record),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: CertificationPlan['status']) => {
        const cfg = PLAN_STATUS_MAP[status]
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 150,
      render: (value: string) => formatDate(value, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          {record.status === 'draft' && (
            <>
              <Button type="link" size="small" onClick={() => handleEdit(record)}>
                编辑
              </Button>
              <ConfirmButton
                title="发布批次"
                description="发布后用户端可见并可创建订单，确认发布？"
                type="link"
                size="small"
                onConfirm={() => handlePublish(record)}
              >
                发布
              </ConfirmButton>
              <ConfirmButton
                title="删除批次"
                description="仅草稿批次可删除，确认删除？"
                danger
                type="link"
                size="small"
                onConfirm={() => handleDelete(record)}
              >
                删除
              </ConfirmButton>
            </>
          )}
          {record.status === 'published' && (
            <>
              <ConfirmButton
                title="归档批次"
                description="归档后不再接受新报名，已支付订单可继续审核，确认归档？"
                type="link"
                size="small"
                onConfirm={() => handleArchive(record)}
              >
                归档
              </ConfirmButton>
              <ConfirmButton
                title="取消批次"
                description="取消后将关闭未支付订单，已支付订单进入退款处理，确认取消？"
                danger
                type="link"
                size="small"
                onConfirm={() => handleCancel(record)}
              >
                取消
              </ConfirmButton>
            </>
          )}
          {(record.status === 'archived' || record.status === 'cancelled') && (
            <Text type="secondary">只读</Text>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建批次
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadPlans} loading={loading}>
            刷新
          </Button>
        </Space>
        <Text type="secondary">认证代码：{certification.code}</Text>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={plans}
        loading={loading}
        pagination={false}
        scroll={{ x: 1200 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无批次" /> }}
      />

      <Modal
        title={`${editingPlan ? '编辑批次' : '新建批次'} — ${certification.code}`}
        open={modalOpen}
        onOk={handleSubmit}
        okButtonProps={{ loading: saving }}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ capacity: 0 }}>
          <Form.Item
            name="name"
            label="批次名称"
            rules={[
              { required: true, message: '请输入批次名称' },
              { whitespace: true, message: '批次名称不能只包含空格' },
              {
                validator: (_, value: string | undefined) => {
                  const name = value?.trim()
                  if (!name) return Promise.resolve()
                  const exists = plans.some((plan) => plan.name === name && plan.id !== editingPlan?.id)
                  return exists ? Promise.reject(new Error('同一认证下批次名称不能重复')) : Promise.resolve()
                },
              },
            ]}
          >
            <Input placeholder="如：2026年第三期" maxLength={128} showCount />
          </Form.Item>

          <Form.Item
            name="apply_range"
            label="报名时间"
            rules={[
              { required: true, message: '请选择报名时间' },
              {
                validator: (_, value: [Dayjs, Dayjs] | undefined) => {
                  if (!value?.[0] || !value?.[1]) {
                    return Promise.reject(new Error('请选择完整报名时间'))
                  }
                  if (!value[0].isBefore(value[1])) {
                    return Promise.reject(new Error('报名开始时间必须早于报名截止时间'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="exam_date"
            label="考试日期"
            dependencies={['apply_range']}
            rules={[
              {
                validator: (_, value: Dayjs | null | undefined) => {
                  const range = form.getFieldValue('apply_range')
                  const applyEnd = range?.[1]
                  if (value && applyEnd && value.isBefore(applyEnd)) {
                    return Promise.reject(new Error('考试日期不能早于报名截止时间'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <DatePicker showTime style={{ width: '100%' }} placeholder="可选" />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="名额上限"
            tooltip="0 表示不限名额"
            rules={[{ required: true, message: '请输入名额上限' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
