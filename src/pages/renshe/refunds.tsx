import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { CheckOutlined, EyeOutlined, ReloadOutlined, RetweetOutlined, StopOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { rensheService } from '@/services/renshe'
import type { RensheRefund, RensheRefundFilter, RensheRefundStatus } from '@/types/renshe'
import { formatDate, formatPrice } from '@/utils/format'
import ApplicationDetailDrawer from './components/ApplicationDetailDrawer'

const { Text } = Typography

const REFUND_STATUS_MAP: Record<RensheRefundStatus, { text: string; color: string }> = {
  requested: { text: '待处理', color: 'orange' },
  approved: { text: '已批准', color: 'blue' },
  processing: { text: '处理中', color: 'processing' },
  succeeded: { text: '已退款', color: 'green' },
  rejected: { text: '已驳回', color: 'default' },
  failed: { text: '失败', color: 'red' },
}

const REQUEST_KIND_MAP: Record<string, string> = {
  normal: '普通退款',
  exception: '例外退款',
  batch_cancel: '批次取消退款',
  batch_finalize: '批次终结退款',
}

interface RejectFormValues {
  reason: string
}

function refundStatusTag(status: RensheRefundStatus) {
  const config = REFUND_STATUS_MAP[status]
  return <Tag color={config.color}>{config.text}</Tag>
}

function dueTag(refund: RensheRefund) {
  if (['succeeded', 'rejected'].includes(refund.status)) return <Text type="secondary">已结束</Text>
  const due = dayjs(refund.due_at)
  const hours = due.diff(dayjs(), 'hour', true)
  if (hours < 0) return <Tag color="red">逾期 {Math.ceil(Math.abs(hours))} 小时</Tag>
  if (hours <= 24) return <Tag color="orange">临期 {Math.max(1, Math.ceil(hours))} 小时</Tag>
  return <Tag>{Math.ceil(hours / 24)} 天</Tag>
}

export default function RensheRefundsPage() {
  const [filters, setFilters] = useState<RensheRefundFilter>({})
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null)
  const [rejectingRefund, setRejectingRefund] = useState<RensheRefund | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [rejectForm] = Form.useForm<RejectFormValues>()
  const { admin } = useAuth()
  const isSuperAdmin = admin?.role === 'super_admin'
  const canViewApplications = usePermission('user:list')

  const { data, loading, pagination, refresh } = usePagination(
    (page) => rensheService.listRefunds({ ...filters, ...page }),
    [filters],
  )

  const approveRefund = (refund: RensheRefund, retry = false) => {
    Modal.confirm({
      title: retry ? '重试退款' : '批准退款',
      content: `${retry ? '将重新向微信支付发起退款' : '确认批准该退款申请'}，金额 ${formatPrice(refund.amount_cents)}。`,
      okText: retry ? '确认重试' : '确认批准',
      onOk: async () => {
        setProcessingId(refund.id)
        try {
          const updated = await rensheService.decideRefund(refund.id, { decision: 'approved' })
          if (updated.status === 'failed') {
            message.error(updated.last_error || '退款发起失败')
          } else {
            message.success(retry ? '退款已重新发起' : '退款已批准')
          }
          refresh()
        } finally {
          setProcessingId(null)
        }
      },
    })
  }

  const rejectRefund = async () => {
    if (!rejectingRefund) return
    const values = await rejectForm.validateFields()
    setProcessingId(rejectingRefund.id)
    try {
      await rensheService.decideRefund(rejectingRefund.id, {
        decision: 'rejected',
        reason: values.reason.trim(),
      })
      message.success('退款申请已驳回')
      setRejectingRefund(null)
      rejectForm.resetFields()
      refresh()
    } finally {
      setProcessingId(null)
    }
  }

  const columns = useMemo<ColumnsType<RensheRefund>>(() => [
    { title: '退款 ID', dataIndex: 'id', width: 95, render: (id: number) => `#${id}` },
    { title: '类型', dataIndex: 'request_kind', width: 130, render: (value: string) => REQUEST_KIND_MAP[value] ?? value },
    { title: '金额', dataIndex: 'amount_cents', width: 110, render: (value: number) => <Text strong>{formatPrice(value)}</Text> },
    { title: '报名', dataIndex: 'application_id', width: 90, render: (id: number) => `#${id}` },
    { title: '订单', dataIndex: 'order_id', width: 90, render: (id: number) => `#${id}` },
    { title: '状态', dataIndex: 'status', width: 100, render: refundStatusTag },
    { title: '申请时间', dataIndex: 'requested_at', width: 170, render: (value: string) => formatDate(value) },
    { title: '处理截止', dataIndex: 'due_at', width: 170, render: (value: string) => formatDate(value) },
    { title: '时限', width: 115, render: (_, refund) => dueTag(refund) },
    {
      title: '原因/错误',
      ellipsis: true,
      render: (_, refund) => refund.last_error || refund.rejection_reason || refund.reason_detail || refund.reason_code || '-',
    },
    {
      title: '操作',
      width: 230,
      fixed: 'right',
      render: (_, refund) => (
        <Space size={0}>
          {canViewApplications && (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setSelectedApplicationId(refund.application_id)}>
              查看报名
            </Button>
          )}
          {isSuperAdmin && refund.status === 'requested' && (
            <>
              <Button
                type="link"
                size="small"
                danger
                icon={<StopOutlined />}
                loading={processingId === refund.id}
                onClick={() => setRejectingRefund(refund)}
              >
                驳回
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                loading={processingId === refund.id}
                onClick={() => approveRefund(refund)}
              >
                批准
              </Button>
            </>
          )}
          {isSuperAdmin && refund.status === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<RetweetOutlined />}
              loading={processingId === refund.id}
              onClick={() => approveRefund(refund, true)}
            >
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ], [canViewApplications, isSuperAdmin, processingId])

  return (
    <PageContainer
      title="人社退款工作台"
      extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>刷新</Button>}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Text strong>状态</Text>
        <Select
          allowClear
          placeholder="全部退款"
          value={filters.status}
          onChange={(status) => setFilters({ status })}
          style={{ width: 160 }}
          options={Object.entries(REFUND_STATUS_MAP).map(([value, config]) => ({ value, label: config.text }))}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1450 }}
      />

      <ApplicationDetailDrawer
        applicationId={selectedApplicationId}
        open={Boolean(selectedApplicationId)}
        onClose={() => setSelectedApplicationId(null)}
        onChanged={refresh}
      />

      <Modal
        title="驳回退款申请"
        open={Boolean(rejectingRefund)}
        okText="确认驳回"
        okButtonProps={{ danger: true, loading: processingId === rejectingRefund?.id }}
        onOk={rejectRefund}
        onCancel={() => {
          setRejectingRefund(null)
          rejectForm.resetFields()
        }}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="reason" label="驳回原因" rules={[{ required: true, whitespace: true, message: '请填写驳回原因' }]}>
            <Input.TextArea rows={4} maxLength={2000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
