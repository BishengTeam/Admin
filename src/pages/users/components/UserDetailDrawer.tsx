import { useState } from 'react'
import { Button, Descriptions, Drawer, Input, Modal, Space, Table, Tag, Typography, message } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { StatusTag } from '@/components/StatusTag'
import ReviewHistory from '@/components/ReviewHistory'
import { ORDER_STATUS_MAP, USER_STATUS_MAP } from '@/core/constants'
import { usePermission } from '@/hooks/usePermission'
import MaterialPreview from '@/pages/certification/components/vendors/renshe/MaterialPreview'
import { rensheService } from '@/services/renshe'
import { userService } from '@/services/users'
import type { UserConversationSummary, UserDetail, UserOrderSummary, UserReviewSummaryItem } from '@/types/user'
import { LEVEL2_STATUS_MAP } from '@/types/user'
import { formatDate, formatPrice } from '@/utils/format'
import { isPdfMaterial } from '@/utils/renshe'

const { Text } = Typography
const USER_REVIEW_TYPES = ['identity', 'student'] as const

interface UserDetailDrawerProps {
  user: UserDetail | null
  open: boolean
  onClose: () => void
  onSaved?: () => void | Promise<void>
  nextPending?: UserReviewSummaryItem | null
  onNextPending?: () => void
}

type ReviewTarget = 'identity' | 'student'

const orderColumns: ColumnsType<UserOrderSummary> = [
  { title: '订单号', dataIndex: 'out_trade_no', width: 150 },
  { title: '金额', dataIndex: 'price', width: 100, render: (value: number) => formatPrice(value) },
  { title: '状态', dataIndex: 'status', width: 80, render: (status: string) => <StatusTag status={status} map={ORDER_STATUS_MAP} /> },
  { title: '时间', dataIndex: 'created_at', width: 170, render: (value: string) => formatDate(value) },
]

const conversationColumns: ColumnsType<UserConversationSummary> = [
  { title: '首句', dataIndex: 'messages', ellipsis: true, render: (_: unknown, record) => firstMessageText(record) },
  { title: '消息数', dataIndex: 'message_count', width: 80, render: (value: number) => value ?? 0 },
  { title: '时间', dataIndex: 'created_at', width: 170, render: (value: string) => formatDate(value) },
]

/** 会话首句：优先用户第一句，其次 AI 第一句 */
function firstMessageText(conversation: UserConversationSummary): string {
  const messages = conversation.messages || []
  const first = messages.find(m => m.role === 'user') ?? messages[0]
  return first?.content?.trim() || '（无内容）'
}

/** 完整多轮问答：用户靠右、AI 靠左 */
function ConversationThread({ conversation }: { conversation: UserConversationSummary }) {
  const messages = conversation.messages || []
  if (messages.length === 0) return <Text type='secondary'>该会话没有可展示的对话内容</Text>
  return (
    <Space direction='vertical' size={8} style={{ width: '100%' }}>
      {messages.map((item, index) => {
        const isUser = item.role === 'user'
        return (
          <div key={index} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '78%', padding: '8px 12px', borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              background: isUser ? '#1677ff' : '#f5f5f5', color: isUser ? '#fff' : 'rgba(0,0,0,0.88)',
            }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{isUser ? '用户' : item.role || 'AI'}</div>
              {item.content || '（空消息）'}
            </div>
          </div>
        )
      })}
    </Space>
  )
}

function ReviewTag({ status }: { status: string }) {
  const config = LEVEL2_STATUS_MAP[status]
  return <Tag color={config?.color}>{config?.text ?? status}</Tag>
}

export default function UserDetailDrawer({
  user,
  open,
  onClose,
  onSaved,
  nextPending,
  onNextPending,
}: UserDetailDrawerProps) {
  const [reviewing, setReviewing] = useState<ReviewTarget | null>(null)
  const canReview = usePermission('user:write')
  // 签名 URL 接口要求 cert:renshe（细粒度 renshe:review），无权限时不自动拉图，避免 403 红字
  const canPreviewMaterials = usePermission('renshe:review')

  if (!user) return null

    const { profile, realname, student } = user
    const eligible = realname?.status === 'verified' && student?.status === 'verified'
    const hasPendingReview = realname?.status === 'pending' || student?.status === 'pending'
    // 学历证明槽位按 JPEG 上传，历史上有 PDF 存量，PDF 仍只走预览不自动取缩略图
    const degreeCertIsPdf = isPdfMaterial(student?.degree_cert_oss)

  const submitReview = async (target: ReviewTarget, status: 'verified' | 'rejected', comment?: string) => {
    setReviewing(target)
    try {
      if (target === 'identity') {
        await userService.reviewRealname(user.id, { status, comment })
      } else {
        await userService.reviewStudent(user.id, { status, comment })
      }
      message.success(status === 'verified' ? '审核已通过' : '审核已驳回')
      await onSaved?.()
    } finally {
      setReviewing(null)
    }
  }

  const approve = (target: ReviewTarget) => {
    const label = target === 'identity' ? '实名资料' : '学生资料'
    Modal.confirm({
      title: `通过${label}`,
      content: '确认当前材料完整、清晰且信息一致。',
      okText: '确认通过',
      onOk: () => submitReview(target, 'verified'),
    })
  }

  const reject = (target: ReviewTarget) => {
    const label = target === 'identity' ? '实名资料' : '学生资料'
    let reason = ''
    Modal.confirm({
      title: `驳回${label}`,
      content: (
        <Input.TextArea
          rows={4}
          maxLength={256}
          showCount
          placeholder="请输入驳回原因"
          onChange={(event) => { reason = event.target.value }}
        />
      ),
      okText: '确认驳回',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!reason.trim()) {
          message.error('请填写驳回原因')
          return Promise.reject()
        }
        await submitReview(target, 'rejected', reason.trim())
      },
    })
  }

  const reviewActions = (target: ReviewTarget, status?: string) => {
    if (!canReview || !status || !['pending', 'rejected'].includes(status)) return null
    const reReview = status === 'rejected'
    return (
      <Space style={{ marginBottom: 20 }}>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          loading={reviewing === target}
          onClick={() => approve(target)}
        >
          {reReview ? '重新通过' : '通过'}
        </Button>
        <Button
          danger
          icon={<CloseOutlined />}
          loading={reviewing === target}
          onClick={() => reject(target)}
        >
          {reReview ? '重新驳回' : '驳回'}
        </Button>
      </Space>
    )
  }

  return (
    <Drawer title="用户详情" open={open} onClose={onClose} width="min(900px, 94vw)">
      <Descriptions title="基本信息" bordered size="small" column={2} style={{ marginBottom: 20 }}>
        <Descriptions.Item label="用户 ID">{user.id}</Descriptions.Item>
        <Descriptions.Item label="OpenID">{user.openid}</Descriptions.Item>
        <Descriptions.Item label="手机号">{profile?.phone || user.phone || '-'}</Descriptions.Item>
        <Descriptions.Item label="注册时间">{formatDate(user.created_at)}</Descriptions.Item>
        <Descriptions.Item label="状态"><StatusTag status={user.is_active} map={USER_STATUS_MAP} /></Descriptions.Item>
        <Descriptions.Item label="昵称">{profile?.nickname || '-'}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{profile?.email || '-'}</Descriptions.Item>
      </Descriptions>

      {eligible && <Tag color="green" style={{ marginBottom: 20 }}>具备报名认证资格</Tag>}
      {hasPendingReview && nextPending && onNextPending && (
        <Button style={{ marginBottom: 20 }} onClick={onNextPending}>
          下一位待审核
        </Button>
      )}

      <Descriptions title="实名信息" bordered size="small" column={2} style={{ marginBottom: 12 }}>
        {realname ? (
          <>
            <Descriptions.Item label="真实姓名">{realname.real_name}</Descriptions.Item>
            <Descriptions.Item label="审核状态"><ReviewTag status={realname.status} /></Descriptions.Item>
            <Descriptions.Item label="拼音（姓）">{realname.last_name_zh || '-'}</Descriptions.Item>
            <Descriptions.Item label="拼音（名）">{realname.first_name_zh || '-'}</Descriptions.Item>
            <Descriptions.Item label="英文（姓）">{realname.last_name_en || '-'}</Descriptions.Item>
            <Descriptions.Item label="英文（名）">{realname.first_name_en || '-'}</Descriptions.Item>
            <Descriptions.Item label="身份证号" span={2}>{realname.id_card_number}</Descriptions.Item>
            <Descriptions.Item label="性别">{realname.gender || '-'}</Descriptions.Item>
            <Descriptions.Item label="出生日期">{realname.birth_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="民族">{realname.ethnicity || '-'}</Descriptions.Item>
            <Descriptions.Item label="户籍地">{realname.census_register || '-'}</Descriptions.Item>
            {realname.reject_reason && (
              <Descriptions.Item label="驳回原因" span={2}><Text type="danger">{realname.reject_reason}</Text></Descriptions.Item>
            )}
            <Descriptions.Item label="身份证正面" span={2}>
              <MaterialPreview
                available={Boolean(realname.id_card_front_oss)}
                filename="身份证正面"
                thumbnail={canPreviewMaterials}
                contentType={canPreviewMaterials ? 'image/jpeg' : undefined}
                resourceKey={`${user.id}:id_card_front:${realname.id_card_front_oss ?? ''}`}
                getSignedUrl={(download) => rensheService.getVerificationMaterialSignedUrl(user.id, 'id_card_front', download)}
              />
            </Descriptions.Item>
            <Descriptions.Item label="身份证背面" span={2}>
              <MaterialPreview
                available={Boolean(realname.id_card_back_oss)}
                filename="身份证背面"
                thumbnail={canPreviewMaterials}
                contentType={canPreviewMaterials ? 'image/jpeg' : undefined}
                resourceKey={`${user.id}:id_card_back:${realname.id_card_back_oss ?? ''}`}
                getSignedUrl={(download) => rensheService.getVerificationMaterialSignedUrl(user.id, 'id_card_back', download)}
              />
            </Descriptions.Item>
            <Descriptions.Item label="证件照" span={2}>
              <MaterialPreview
                available={Boolean(realname.avatar_oss)}
                filename="证件照"
                thumbnail={canPreviewMaterials}
                contentType={canPreviewMaterials ? 'image/jpeg' : undefined}
                resourceKey={`${user.id}:portrait:${realname.avatar_oss ?? ''}`}
                getSignedUrl={(download) => rensheService.getVerificationMaterialSignedUrl(user.id, 'portrait', download)}
              />
            </Descriptions.Item>
          </>
        ) : (
          <Descriptions.Item label="状态" span={2}>未提交</Descriptions.Item>
        )}
      </Descriptions>
      {reviewActions('identity', realname?.status)}

      <Descriptions title="学生信息" bordered size="small" column={2} style={{ marginBottom: 12 }}>
        {student ? (
          <>
            <Descriptions.Item label="学历">{student.education || '-'}</Descriptions.Item>
            <Descriptions.Item label="审核状态"><ReviewTag status={student.status} /></Descriptions.Item>
            <Descriptions.Item label="学校">{student.school || '-'}</Descriptions.Item>
            <Descriptions.Item label="专业">{student.major || '-'}</Descriptions.Item>
            {student.reject_reason && (
              <Descriptions.Item label="驳回原因" span={2}><Text type="danger">{student.reject_reason}</Text></Descriptions.Item>
            )}
            <Descriptions.Item label="学生证" span={2}>
              <MaterialPreview
                available={Boolean(student.student_card_oss)}
                filename="学生证"
                thumbnail={canPreviewMaterials}
                contentType={canPreviewMaterials ? 'image/jpeg' : undefined}
                resourceKey={`${user.id}:student_card:${student.student_card_oss ?? ''}`}
                getSignedUrl={(download) => rensheService.getVerificationMaterialSignedUrl(user.id, 'student_card', download)}
              />
            </Descriptions.Item>
            <Descriptions.Item label="学信网电子注册表" span={2}>
              <MaterialPreview
                available={Boolean(student.enrollment_pdf_oss)}
                filename="学信网电子注册表.pdf"
                isPdf
                getSignedUrl={(download) => rensheService.getVerificationMaterialSignedUrl(user.id, 'xuexin_registration', download)}
              />
            </Descriptions.Item>
            <Descriptions.Item label="学历证明" span={2}>
              <MaterialPreview
                available={Boolean(student.degree_cert_oss)}
                filename={degreeCertIsPdf ? '学历证明.pdf' : '学历证明'}
                isPdf={degreeCertIsPdf}
                thumbnail={canPreviewMaterials}
                contentType={canPreviewMaterials && !degreeCertIsPdf ? 'image/jpeg' : undefined}
                resourceKey={`${user.id}:education_proof:${student.degree_cert_oss ?? ''}`}
                getSignedUrl={(download) => rensheService.getVerificationMaterialSignedUrl(user.id, 'education_proof', download)}
              />
            </Descriptions.Item>
          </>
        ) : (
          <Descriptions.Item label="状态" span={2}>未提交</Descriptions.Item>
        )}
      </Descriptions>
      {reviewActions('student', student?.status)}

      <Typography.Title level={5}>审核记录</Typography.Title>
      <ReviewHistory targetType={[...USER_REVIEW_TYPES]} targetId={user.id} />

      <Typography.Title level={5}>订单记录</Typography.Title>
      <Table
        rowKey="id"
        columns={orderColumns}
        dataSource={user.orders || []}
        pagination={false}
        size="small"
        style={{ marginBottom: 24 }}
      />

      <Typography.Title level={5}>AI 对话记录</Typography.Title>
      <Text type='secondary' style={{ display: 'block', marginBottom: 8 }}>
        共 {(user.conversations || []).length} 个会话，点击行首箭头展开查看完整问答。
      </Text>
      <Table
        rowKey="id"
        columns={conversationColumns}
        dataSource={user.conversations || []}
        pagination={false}
        size="small"
        expandable={{ expandedRowRender: (record) => <ConversationThread conversation={record} /> }}
      />
    </Drawer>
  )
}
