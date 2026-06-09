import { useState } from 'react'
import { Descriptions, Drawer, Table, Tag, Button, Space, message, Input, Modal, Form, Select } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { StatusTag } from '@/components/StatusTag'
import { ORDER_STATUS_MAP, USER_STATUS_MAP } from '@/core/constants'
import { formatDate, formatPhone, formatPrice } from '@/utils/format'
import { userService } from '@/services/users'
import type { UserDetail, UserOrderSummary, UserConversationSummary } from '@/types/user'
import { IDENTITY_STATUS_MAP } from '@/types/user'

interface UserDetailDrawerProps {
  user: UserDetail | null
  open: boolean
  onClose: () => void
  onSaved?: () => void
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

const GENDER_LABELS: Record<string, string> = { male: '男', female: '女' }
const USER_TYPE_LABELS: Record<string, string> = { student: '学生', enterprise: '企业' }
const GENDER_OPTIONS = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
]

export default function UserDetailDrawer({ user, open, onClose, onSaved }: UserDetailDrawerProps) {
  const [reviewing, setReviewing] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm] = Form.useForm()

  if (!user) return null

  const profile = user.profile
  const identity = user.identity

  const handleReview = async (status: 'verified' | 'rejected') => {
    setReviewing(true)
    try {
      if (status === 'rejected') {
        Modal.confirm({
          title: '驳回认证',
          content: (
            <div style={{ marginTop: 16 }}>
              <Input.TextArea
                id="review-comment"
                rows={3}
                placeholder="驳回原因（选填）"
                maxLength={256}
              />
            </div>
          ),
          onOk: async () => {
            const el = document.getElementById('review-comment') as HTMLTextAreaElement
            await userService.reviewIdentity(user.id, { status, comment: el?.value || undefined })
            message.success('已驳回')
            onClose()
          },
          onCancel: () => setReviewing(false),
        })
        return
      }
      await userService.reviewIdentity(user.id, { status })
      message.success('已通过')
      onClose()
    } finally {
      setReviewing(false)
    }
  }

  const handleOpenEdit = () => {
    if (!profile) return
    editForm.setFieldsValue({
      phone: profile.phone || '',
      email: profile.email || '',
      gender: profile.gender || undefined,
      education: profile.education || '',
      school: profile.school || '',
      major: profile.major || '',
      organization: profile.organization || '',
    })
    setEditModalOpen(true)
  }

  const handleSaveProfile = async () => {
    const values = await editForm.validateFields()
    setSaving(true)
    try {
      await userService.updateProfile(user.id, {
        phone: values.phone || null,
        email: values.email || null,
        gender: values.gender || null,
        education: values.education || null,
        school: values.school || null,
        major: values.major || null,
        organization: values.organization || null,
      })
      message.success('资料已更新')
      setEditModalOpen(false)
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title="用户详情"
      open={open}
      onClose={onClose}
      width={720}
    >
      {/* 基本信息 */}
      <h4 style={{ marginBottom: 12 }}>基本信息</h4>
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="用户名">{user.openid}</Descriptions.Item>
        <Descriptions.Item label="手机号">{formatPhone(user.phone)}</Descriptions.Item>
        <Descriptions.Item label="注册时间">{formatDate(user.created_at)}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <StatusTag status={user.is_active} map={USER_STATUS_MAP} />
        </Descriptions.Item>
      </Descriptions>

      {/* 个人资料 */}
      {profile && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>个人资料</h4>
            <Button size="small" icon={<EditOutlined />} onClick={handleOpenEdit}>
              编辑资料
            </Button>
          </div>
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="姓名">
              {profile.last_name}{profile.first_name}
              {!profile.last_name && !profile.first_name && (profile.real_name || '-')}
            </Descriptions.Item>
            <Descriptions.Item label="拼音">{profile.pinyin || '-'}</Descriptions.Item>
            <Descriptions.Item label="性别">
              {profile.gender ? GENDER_LABELS[profile.gender] || profile.gender : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="年龄">{profile.age ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{profile.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号（原始）">
              {profile.phone_raw ? formatPhone(profile.phone_raw) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="用户类型">
              {profile.user_type ? USER_TYPE_LABELS[profile.user_type] || profile.user_type : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="学历">{profile.education || '-'}</Descriptions.Item>
            <Descriptions.Item label="学校">{profile.school || '-'}</Descriptions.Item>
            <Descriptions.Item label="专业">{profile.major || '-'}</Descriptions.Item>
            <Descriptions.Item label="单位">{profile.organization || '-'}</Descriptions.Item>
            <Descriptions.Item label="国家">{profile.country || '-'}</Descriptions.Item>
            <Descriptions.Item label="语言">{profile.language || '-'}</Descriptions.Item>
            <Descriptions.Item label="身份证号">
              {profile.id_card_raw || profile.id_card || '-'}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      {/* 实名认证审核 */}
      {identity && (
        <>
          <h4 style={{ marginBottom: 12 }}>实名认证</h4>
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="认证类型">
              {identity.user_type === 'student' ? '学生' : '企业'}
            </Descriptions.Item>
            <Descriptions.Item label="真实姓名">{identity.real_name}</Descriptions.Item>
            <Descriptions.Item label="身份证号" span={2}>
              {identity.id_card_number}
            </Descriptions.Item>
            <Descriptions.Item label="审核状态">
              <Tag color={IDENTITY_STATUS_MAP[identity.status]?.color}>
                {IDENTITY_STATUS_MAP[identity.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="认证时间">
              {identity.verified_at ? formatDate(identity.verified_at) : '-'}
            </Descriptions.Item>
          </Descriptions>

          {identity.status === 'pending' && (
            <Space style={{ marginBottom: 24 }}>
              <Button
                type="primary"
                loading={reviewing}
                onClick={() => handleReview('verified')}
              >
                通过
              </Button>
              <Button
                danger
                loading={reviewing}
                onClick={() => handleReview('rejected')}
              >
                驳回
              </Button>
            </Space>
          )}
        </>
      )}

      {/* 订单记录 */}
      <h4 style={{ marginBottom: 12 }}>订单记录</h4>
      <Table
        rowKey="id"
        columns={orderColumns}
        dataSource={user.orders || []}
        pagination={false}
        size="small"
        style={{ marginBottom: 24 }}
      />

      {/* AI 对话记录 */}
      <h4 style={{ marginBottom: 12 }}>AI 对话记录</h4>
      <Table
        rowKey="id"
        columns={convColumns}
        dataSource={user.conversations || []}
        pagination={false}
        size="small"
      />

      {/* 编辑资料弹窗 */}
      <Modal
        title="编辑用户资料"
        open={editModalOpen}
        onOk={handleSaveProfile}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="phone" label="手机号">
            <Input placeholder="11 位手机号" maxLength={11} />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select placeholder="选择性别" options={GENDER_OPTIONS} allowClear />
          </Form.Item>
          <Form.Item name="education" label="学历">
            <Input placeholder="如：本科、硕士" />
          </Form.Item>
          <Form.Item name="school" label="学校">
            <Input placeholder="请输入学校" />
          </Form.Item>
          <Form.Item name="major" label="专业">
            <Input placeholder="请输入专业" />
          </Form.Item>
          <Form.Item name="organization" label="单位">
            <Input placeholder="请输入单位" />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  )
}
