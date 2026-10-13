import { useState } from 'react'
import {
  Button,
  Descriptions,
  Drawer,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { h3cService } from '@/services/h3c'
import { formatDate, formatPrice } from '@/utils/format'
import { refundErrorText } from '@/utils/refund'
import type { CertType } from '../type-registry'
import type { H3cRefund } from '@/types/h3c'

const { Text } = Typography

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  requested: { text: '待确认', color: 'orange' },
  approved: { text: '已确认', color: 'blue' },
  processing: { text: '退款中', color: 'cyan' },
  succeeded: { text: '已退款', color: 'green' },
  failed: { text: '退款失败', color: 'red' },
}

export default function RefundTab(_props: { type: CertType }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<H3cRefund | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const { data, loading, pagination, refresh } = usePagination(
    (page) => h3cService.listRefunds({
      ...page,
      status: statusFilter || undefined,
    }),
    [statusFilter],
  )
  const { ensureReauthenticated, reauthDialog } = useReauthentication()

  const confirm = async (id: number) => {
    setConfirmingId(id)
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      await h3cService.confirmRefund(id, token)
      message.success('退款已确认提交')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '退款确认失败，请重试')
    } finally {
      setConfirmingId(null)
    }
  }

  const columns: ColumnsType<H3cRefund> = [
    { title: '报名', dataIndex: 'registration_id', width: 90 },
    { title: '订单', dataIndex: 'order_id', width: 90 },
    { title: '原因', dataIndex: 'reason_code', width: 170 },
    {
      title: '金额',
      dataIndex: 'amount_cents',
      width: 110,
      render: (value: number) => formatPrice(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => {
        const item = STATUS_CONFIG[value] ?? { text: value, color: 'default' }
        return <Tag color={item.color}>{item.text}</Tag>
      },
    },
    {
      title: '失败原因',
      dataIndex: 'last_error',
      width: 230,
      ellipsis: true,
      render: (value: string | null) => value ? (
        <Text type='danger'>{refundErrorText(value)}</Text>
      ) : '-',
    },
    { title: '重试次数', dataIndex: 'retry_count', width: 90 },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 165,
      render: (value: string) => formatDate(value),
    },
    {
      title: '操作',
      width: 150,
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' onClick={() => setSelected(row)}>详情</Button>
          {(row.status === 'requested' || row.status === 'failed') && (
            <Popconfirm title='确认发起全额退款？' onConfirm={() => confirm(row.id)}>
              <Button
                size='small'
                danger
                type='primary'
                loading={confirmingId === row.id}
              >
                确认退款
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder='全部退款'
          value={statusFilter || undefined}
          onChange={(value) => setStatusFilter(value ?? '')}
          style={{ width: 140 }}
          options={Object.entries(STATUS_CONFIG).map(([value, config]) => ({
            value,
            label: config.text,
          }))}
        />
        <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
      </Space>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1250 }}
      />
      <Drawer
        title={`H3C 退款详情 #${selected?.id ?? ''}`}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        width={460}
      >
        {selected && (
          <Descriptions column={1} bordered size='small'>
            <Descriptions.Item label='状态'>
              <Tag color={STATUS_CONFIG[selected.status]?.color}>
                {STATUS_CONFIG[selected.status]?.text ?? selected.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label='报名ID'>{selected.registration_id}</Descriptions.Item>
            <Descriptions.Item label='订单ID'>{selected.order_id}</Descriptions.Item>
            <Descriptions.Item label='金额'>{formatPrice(selected.amount_cents)}</Descriptions.Item>
            <Descriptions.Item label='退款单号'>{selected.out_refund_no || '-'}</Descriptions.Item>
            <Descriptions.Item label='创建时间'>{formatDate(selected.created_at)}</Descriptions.Item>
            {selected.reason_detail && (
              <Descriptions.Item label='退款原因说明'>{selected.reason_detail}</Descriptions.Item>
            )}
            {selected.last_error && (
              <Descriptions.Item label='最后错误'>
                <Text type='danger'>{refundErrorText(selected.last_error)}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label='重试次数'>{selected.retry_count}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
      {reauthDialog}
    </>
  )
}
