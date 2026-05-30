import { Descriptions, Drawer, Table, Tag, Avatar } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { StatusTag } from '@/components/StatusTag'
import { ORDER_STATUS_MAP, USER_STATUS_MAP } from '@/core/constants'
import { formatDate, formatPhone, formatPrice } from '@/utils/format'
import type { UserDetail, UserOrderSummary, UserConversationSummary } from '@/types/user'

interface UserDetailDrawerProps {
  user: UserDetail | null
  open: boolean
  onClose: () => void
}

const orderColumns: ColumnsType<UserOrderSummary> = [
  { title: '订单号', dataIndex: 'out_trade_no', width: 150 },
  {
    title: '金额',
    dataIndex: 'price',
    width: 100,
    render: (a: number) => formatPrice(a),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    render: (s: string) => <StatusTag status={s} map={ORDER_STATUS_MAP} />,
  },
  {
    title: '时间',
    dataIndex: 'created_at',
    width: 170,
    render: (t: string) => formatDate(t),
  },
]

const convColumns: ColumnsType<UserConversationSummary> = [
  { title: '消息', dataIndex: 'message', ellipsis: true },
  {
    title: '意图',
    dataIndex: 'intent',
    width: 100,
    render: (t: string) => <Tag>{t}</Tag>,
  },
  {
    title: '时间',
    dataIndex: 'created_at',
    width: 170,
    render: (t: string) => formatDate(t),
  },
]

export default function UserDetailDrawer({ user, open, onClose }: UserDetailDrawerProps) {
  if (!user) return null

  return (
    <Drawer
      title="用户详情"
      open={open}
      onClose={onClose}
      width={720}
    >
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="头像">
          <Avatar size="small">{user.openid?.[0]}</Avatar>
        </Descriptions.Item>
        <Descriptions.Item label="用户名">{user.openid}</Descriptions.Item>
        <Descriptions.Item label="手机号">{formatPhone(user.phone)}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{user.email || '-'}</Descriptions.Item>
        <Descriptions.Item label="学校">{user.school || '-'}</Descriptions.Item>
        <Descriptions.Item label="注册时间">{formatDate(user.created_at)}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <StatusTag status={user.is_active} map={USER_STATUS_MAP} />
        </Descriptions.Item>
      </Descriptions>

      <h4 style={{ marginBottom: 12 }}>订单记录</h4>
      <Table
        rowKey="id"
        columns={orderColumns}
        dataSource={user.orders}
        pagination={false}
        size="small"
        style={{ marginBottom: 24 }}
      />

      <h4 style={{ marginBottom: 12 }}>AI 对话记录</h4>
      <Table
        rowKey="id"
        columns={convColumns}
        dataSource={user.conversations}
        pagination={false}
        size="small"
      />
    </Drawer>
  )
}
