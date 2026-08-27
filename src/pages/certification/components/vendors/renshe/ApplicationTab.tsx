import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, DatePicker, Form, Input, Select, Space, Table, Tag } from 'antd'
import { AuditOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { certificationService } from '@/services/certification'
import { rensheService } from '@/services/renshe'
import type { CertificationPlan } from '@/types/certification'
import type {
  RensheApplicationFilter,
  RensheApplicationListItem,
  RensheApplicationStatus,
  RenshePaymentStatus,
} from '@/types/renshe'
import { formatDate } from '@/utils/format'
import {
  RENSHE_APPLICATION_STATUS_MAP,
  RENSHE_PAYMENT_STATUS_MAP,
} from '@/utils/renshe'
import type { CertType } from '../type-registry'
import ApplicationDetailDrawer from './ApplicationDetailDrawer'

const { RangePicker } = DatePicker

interface ApplicationTabProps {
  type: CertType
}

interface FilterFormValues {
  plan_id?: number
  status?: RensheApplicationStatus
  payment_status?: RenshePaymentStatus
  keyword?: string
  submitted_range?: [Dayjs, Dayjs]
}

const applicationStatusOptions = Object.entries(RENSHE_APPLICATION_STATUS_MAP).map(([value, config]) => ({
  value,
  label: config.text,
}))

const paymentStatusOptions = Object.entries(RENSHE_PAYMENT_STATUS_MAP).map(([value, config]) => ({
  value,
  label: config.text,
}))

function statusTag(status: string | null, map: Record<string, { text: string; color: string }>) {
  if (!status) return '-'
  const config = map[status]
  return <Tag color={config?.color}>{config?.text ?? status}</Tag>
}

export default function ApplicationTab(_props: ApplicationTabProps) {
  const [form] = Form.useForm<FilterFormValues>()
  const [plans, setPlans] = useState<CertificationPlan[]>([])
  const [filters, setFilters] = useState<RensheApplicationFilter>({})
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const canReview = usePermission('user:write')

  const { data, loading, pagination, refresh } = usePagination(
    (page) => rensheService.listApplications({ ...filters, ...page }),
    [filters],
  )

  useEffect(() => {
    certificationService.listPlans('renshe').then(setPlans)
  }, [])

  const openApplication = useCallback((applicationId: number) => {
    setSelectedApplicationId(applicationId)
    setDrawerOpen(true)
  }, [])

  const handleSearch = (values: FilterFormValues) => {
    const [start, end] = values.submitted_range || []
    setFilters({
      plan_id: values.plan_id,
      status: values.status,
      payment_status: values.payment_status,
      keyword: values.keyword?.trim() || undefined,
      submitted_at_start: start?.startOf('day').toISOString(),
      submitted_at_end: end?.endOf('day').toISOString(),
    })
  }

  const handleReset = () => {
    form.resetFields()
    setFilters({})
  }

  const columns = useMemo<ColumnsType<RensheApplicationListItem>>(() => [
    { title: '报名 ID', dataIndex: 'id', width: 95, render: (id: number) => `#${id}` },
    { title: '批次', dataIndex: 'plan_id', width: 85, render: (id: number) => `#${id}` },
    {
      title: '考生',
      width: 170,
      render: (_, record) => (
        <div>
          <div>{record.candidate_name || `用户 #${record.user_id}`}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record.contact_phone_masked || '-'}</div>
        </div>
      ),
    },
    { title: '身份证号', dataIndex: 'id_card_masked', width: 170, render: (value: string | null) => value || '-' },
    {
      title: '报名状态',
      dataIndex: 'status',
      width: 110,
      render: (status: string) => statusTag(status, RENSHE_APPLICATION_STATUS_MAP),
    },
    {
      title: '支付状态',
      dataIndex: 'payment_status',
      width: 100,
      render: (status: string | null) => statusTag(status, RENSHE_PAYMENT_STATUS_MAP),
    },
    { title: '当前版本', dataIndex: 'current_version_id', width: 100, render: (id: number | null) => id ? `#${id}` : '-' },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      width: 170,
      render: (value: string | null) => value ? formatDate(value) : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (value: string) => formatDate(value),
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openApplication(record.id)}>
            查看详情
          </Button>
          {canReview && record.status === 'pending_initial_review' && (
            <Button type="link" size="small" icon={<AuditOutlined />} onClick={() => openApplication(record.id)}>
              初审
            </Button>
          )}
          {canReview && record.status === 'pending_external_review' && (
            <Button type="link" size="small" icon={<AuditOutlined />} onClick={() => openApplication(record.id)}>
              外审
            </Button>
          )}
        </Space>
      ),
    },
  ], [canReview, openApplication])

  return (
    <>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'flex-end' }}>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>刷新</Button>
      </Space>

      <Form
        form={form}
        layout="inline"
        onFinish={handleSearch}
        style={{ rowGap: 12, marginBottom: 16 }}
      >
        <Form.Item name="plan_id" label="批次">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="全部批次"
            style={{ width: 210 }}
            options={plans.map((plan) => ({ value: plan.id, label: `${plan.name} (#${plan.id})` }))}
          />
        </Form.Item>
        <Form.Item name="status" label="报名状态">
          <Select allowClear placeholder="全部" style={{ width: 145 }} options={applicationStatusOptions} />
        </Form.Item>
        <Form.Item name="payment_status" label="支付状态">
          <Select allowClear placeholder="全部" style={{ width: 125 }} options={paymentStatusOptions} />
        </Form.Item>
        <Form.Item name="keyword" label="考生">
          <Input allowClear placeholder="姓名 / 身份证 / 手机号" style={{ width: 210 }} />
        </Form.Item>
        <Form.Item name="submitted_range" label="提交时间">
          <RangePicker />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1350 }}
      />

      <ApplicationDetailDrawer
        applicationId={selectedApplicationId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onChanged={refresh}
      />
    </>
  )
}
