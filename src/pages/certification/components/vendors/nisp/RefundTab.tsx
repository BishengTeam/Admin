import { useState } from 'react'
import {
  Button, Card, Descriptions, Drawer, Modal,
  Select, Space, Table, Tag, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { usePagination } from '@/hooks/usePagination'
import { http } from '@/core/request'
import type { PageData } from '@/types/api'
import { formatPrice } from '@/utils/format'

const { Text } = Typography

interface NispRefund {
  id: number
  registration_id: number
  order_id: number
  request_kind: string
  reason_code: string
  reason_detail: string | null
  amount_cents: number
  status: string
  requested_at: string
  approved_at: string | null
  out_refund_no: string | null
  succeeded_at: string | null
  last_error: string | null
  retry_count: number
}

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  requested: { text: '待确认', color: 'orange' },
  approved: { text: '已确认', color: 'blue' },
  processing: { text: '退款中', color: 'cyan' },
  succeeded: { text: '已退款', color: 'green' },
  failed: { text: '退款失败', color: 'red' },
}

const KIND_LABELS: Record<string, string> = {
  review_failed: '审核未通过',
  batch_cancelled: '批次取消',
  exception_close: '异常关闭',
}

export default function NispRefundTab() {
  const [statusFilter, setStatusFilter] = useState<string>('requested')
  const [selected, setSelected] = useState<NispRefund | null>(null)
  const [confirming, setConfirming] = useState(false)
  const { data, loading, pagination, refresh } = usePagination(
    (page) => http.get<PageData<NispRefund>>('/admin/nisp/refunds', {
      params: { ...page, status: statusFilter || undefined },
    }),
    [statusFilter],
  )

  const confirmRefund = async (refund: NispRefund) => {
    setConfirming(true)
    try {
      await http.post(`/admin/nisp/refunds/${refund.id}/confirm`)
      message.success('退款已提交')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '退款失败')
    } finally {
      setConfirming(false)
    }
  }

  const reconcileRefund = async (refund: NispRefund) => {
    try {
      await http.post(`/admin/nisp/refunds/${refund.id}/reconcile`)
      message.success('对账完成')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '对账失败')
    }
  }

  const columns: ColumnsType<NispRefund> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '报名ID', dataIndex: 'registration_id', width: 80 },
    {
      title: '退款原因',
      dataIndex: 'request_kind',
      width: 110,
      render: (v: string) => KIND_LABELS[v] || v,
    },
    {
      title: '金额',
      dataIndex: 'amount_cents',
      width: 90,
      render: (v: number) => formatPrice(v),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v] ?? { text: v, color: 'default' }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    { title: '退款单号', dataIndex: 'out_refund_no', width: 140, ellipsis: true },
    { title: '请求时间', dataIndex: 'requested_at', width: 110, render: (v: string) => v?.slice(0, 16).replace('T', ' ') },
    {
      title: '操作',
      width: 160,
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' onClick={() => setSelected(row)}>详情</Button>
          {(row.status === 'requested' || row.status === 'failed') && (
            <Button size='small' type='primary' loading={confirming} onClick={() => confirmRefund(row)}>
              确认退款
            </Button>
          )}
          {['approved', 'processing', 'failed'].includes(row.status) && (
            <Button size='small' onClick={() => reconcileRefund(row)}>对账</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            allowClear
            placeholder="筛选状态"
            options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.text }))}
          />
        </Space>
        <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />
      </Card>

      <Drawer
        title={`退款详情 #${selected?.id ?? ''}`}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={420}
      >
        {selected && (
          <Descriptions column={1} bordered size='small'>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_CONFIG[selected.status]?.color}>
                {STATUS_CONFIG[selected.status]?.text ?? selected.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="报名ID">{selected.registration_id}</Descriptions.Item>
            <Descriptions.Item label="订单ID">{selected.order_id}</Descriptions.Item>
            <Descriptions.Item label="退款原因">{KIND_LABELS[selected.request_kind] || selected.request_kind}</Descriptions.Item>
            <Descriptions.Item label="金额">{formatPrice(selected.amount_cents)}</Descriptions.Item>
            <Descriptions.Item label="退款单号">{selected.out_refund_no || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求时间">{selected.requested_at?.replace('T', ' ').slice(0, 19)}</Descriptions.Item>
            {selected.reason_detail && (
              <Descriptions.Item label="驳回原因">{selected.reason_detail}</Descriptions.Item>
            )}
            {selected.last_error && (
              <Descriptions.Item label="最后错误">
                <Text type='danger'>{selected.last_error}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="重试次数">{selected.retry_count}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  )
}
