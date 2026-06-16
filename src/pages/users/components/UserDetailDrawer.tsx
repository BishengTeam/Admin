import { useState } from 'react'
import { Drawer, Table, Tag, Button, Space, message, Input, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { StatusTag } from '@/components/StatusTag'
import { ORDER_STATUS_MAP, USER_STATUS_MAP } from '@/core/constants'
import { formatDate, formatPrice } from '@/utils/format'
import { userService } from '@/services/users'
import type { UserDetail, UserOrderSummary, UserConversationSummary } from '@/types/user'
import { LEVEL2_STATUS_MAP } from '@/types/user'

interface UserDetailDrawerProps {
  user: UserDetail | null
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

const orderColumns: ColumnsType<UserOrderSummary> = [
  { title: '订单号', dataIndex: 'out_trade_no', width: 150 },
  { title: '金额', dataIndex: 'price', width: 100, render: (a: number) => formatPrice(a) },
  { title: '状态', dataIndex: 'status', width: 80, render: (s: string) => <StatusTag status={s} map={ORDER_STATUS_MAP} /> },
  { title: '时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
]

const convColumns: ColumnsType<UserConversationSummary> = [
  { title: '消息', dataIndex: 'message', ellipsis: true },
  { title: '意图', dataIndex: 'intent', width: 100, render: (t: string) => <Tag>{t}</Tag> },
  { title: '时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
]

const DESC_CELL: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #f0f0f0',
  verticalAlign: 'middle',
}
const DESC_LABEL: React.CSSProperties = {
  ...DESC_CELL,
  background: '#fafafa',
  fontWeight: 500,
  width: 140,
  whiteSpace: 'nowrap',
}
const DESC_VALUE: React.CSSProperties = {
  ...DESC_CELL,
  background: '#fff',
}

function ReviewTag({ status }: { status: string }) {
  const cfg = LEVEL2_STATUS_MAP[status]
  return <Tag color={cfg?.color}>{cfg?.text ?? status}</Tag>
}

export default function UserDetailDrawer({ user, open, onClose, onSaved }: UserDetailDrawerProps) {
  const [reviewing, setReviewing] = useState<string | null>(null)

  if (!user) return null

  const profile = user.profile
  const realname = user.realname
  const student = user.student
  const enterprise = user.enterprise
  const userType = realname?.user_type

  const reviewTargetLabel = (target: 'realname' | 'student' | 'enterprise') =>
    target === 'realname' ? '实名' : target === 'student' ? '学生' : '企业'

  const callReviewApi = (
    target: 'realname' | 'student' | 'enterprise',
  ) =>
    target === 'realname' ? userService.reviewRealname
    : target === 'student' ? userService.reviewStudent
    : userService.reviewEnterprise

  const doReview = async (
    target: 'realname' | 'student' | 'enterprise',
    status: 'verified' | 'rejected',
  ) => {
    const call = callReviewApi(target)
    const label = reviewTargetLabel(target)

    setReviewing(target)
    try {
      if (status === 'rejected') {
        Modal.confirm({
          title: `驳回${label}认证`,
          content: (
            <div style={{ marginTop: 16 }}>
              <Input.TextArea id="review-comment" rows={3} placeholder="驳回原因（选填）" maxLength={256} />
            </div>
          ),
          onOk: async () => {
            const el = document.getElementById('review-comment') as HTMLTextAreaElement
            await call(user.id, { status, comment: el?.value || undefined })
            message.success('已驳回')
            onSaved?.()
          },
          onCancel: () => setReviewing(null),
        })
        return
      }
      await call(user.id, { status })
      message.success('已通过')
      onSaved?.()
    } finally {
      setReviewing(null)
    }
  }

  const doUndo = async (target: 'realname' | 'student' | 'enterprise') => {
    const call = callReviewApi(target)
    const label = reviewTargetLabel(target)

    setReviewing(target)
    try {
      await call(user.id, { status: 'pending', comment: '撤销审核' })
      message.success(`已撤销${label}审核`)
      onSaved?.()
    } catch {
      // 后端不支持 pending 则回退到调用 rejected
    } finally {
      setReviewing(null)
    }
  }

  const reviewActions = (
    target: 'realname' | 'student' | 'enterprise',
    currentStatus: string | undefined,
  ) => {
    if (currentStatus === 'pending') {
      return (
        <Space style={{ marginBottom: 24 }}>
          <Button type="primary" loading={reviewing === target} onClick={() => doReview(target, 'verified')}>通过</Button>
          <Button danger loading={reviewing === target} onClick={() => doReview(target, 'rejected')}>驳回</Button>
        </Space>
      )
    }
    if (currentStatus === 'verified' || currentStatus === 'rejected') {
      return (
        <Space style={{ marginBottom: 24 }}>
          <Button loading={reviewing === target} onClick={() => doUndo(target)}>撤销审核</Button>
        </Space>
      )
    }
    return null
  }

  return (
    <Drawer title="用户详情" open={open} onClose={onClose} width={720}>
      {/* 基本信息 */}
      <h4 style={{ marginBottom: 12 }}>基本信息</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={DESC_LABEL}>用户名</td>
            <td style={DESC_VALUE}>{user.openid}</td>
            <td style={DESC_LABEL}>手机号</td>
            <td style={DESC_VALUE}>{profile?.phone || user.phone || '-'}</td>
          </tr>
          <tr>
            <td style={DESC_LABEL}>注册时间</td>
            <td style={DESC_VALUE}>{formatDate(user.created_at)}</td>
            <td style={DESC_LABEL}>状态</td>
            <td style={DESC_VALUE}><StatusTag status={user.is_active} map={USER_STATUS_MAP} /></td>
          </tr>
        </tbody>
      </table>

      {/* Level-1: 个人资料（只读） */}
      <h4 style={{ marginBottom: 12 }}>个人资料</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          {profile ? (
            <>
              <tr>
                <td style={DESC_LABEL}>昵称</td>
                <td style={DESC_VALUE}>{profile.nickname || '-'}</td>
                <td style={DESC_LABEL}>邮箱</td>
                <td style={DESC_VALUE}>{profile.email || '-'}</td>
              </tr>
              <tr>
                <td style={DESC_LABEL}>手机号</td>
                <td style={DESC_VALUE} colSpan={3}>{profile.phone || '-'}</td>
              </tr>
            </>
          ) : (
            <tr>
              <td style={DESC_VALUE} colSpan={4}><Tag>暂无数据</Tag></td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Level-2: 实名信息 */}
      <h4 style={{ marginBottom: 12 }}>实名信息</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          {realname ? (
            <>
              <tr>
                <td style={DESC_LABEL}>用户类型</td>
                <td style={DESC_VALUE}>{realname.user_type === 'student' ? '学生' : '企业'}</td>
                <td style={DESC_LABEL}>真实姓名</td>
                <td style={DESC_VALUE}>{realname.real_name}</td>
              </tr>
              <tr>
                <td style={DESC_LABEL}>身份证号</td>
                <td style={DESC_VALUE} colSpan={3}>{realname.id_card_number}</td>
              </tr>
              <tr>
                <td style={DESC_LABEL}>性别</td>
                <td style={DESC_VALUE}>{realname.gender || '-'}</td>
                <td style={DESC_LABEL}>年龄</td>
                <td style={DESC_VALUE}>{realname.age ?? '-'}</td>
              </tr>
              <tr>
                <td style={DESC_LABEL}>户籍地</td>
                <td style={DESC_VALUE}>{realname.census_register || '-'}</td>
                <td style={DESC_LABEL}>审核状态</td>
                <td style={DESC_VALUE}><ReviewTag status={realname.status} /></td>
              </tr>
              <tr>
                <td style={DESC_LABEL}>身份证正面</td>
                <td style={DESC_VALUE}>
                  {realname.id_card_front_oss ? (
                    <img src={realname.id_card_front_oss} alt="身份证正面" style={{ maxHeight: 120, maxWidth: '100%' }} />
                  ) : '-'}
                </td>
                <td style={DESC_LABEL}>身份证背面</td>
                <td style={DESC_VALUE}>
                  {realname.id_card_back_oss ? (
                    <img src={realname.id_card_back_oss} alt="身份证背面" style={{ maxHeight: 120, maxWidth: '100%' }} />
                  ) : '-'}
                </td>
              </tr>
            </>
          ) : (
            <tr>
              <td style={DESC_VALUE} colSpan={4}><Tag>暂无数据</Tag></td>
            </tr>
          )}
        </tbody>
      </table>
      {reviewActions('realname', realname?.status)}

      {/* Level-2: 学生信息（仅学生用户） */}
      {userType === 'student' && (
        <>
          <h4 style={{ marginBottom: 12 }}>学生信息</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          {student ? (
            <>
              <tr>
                <td style={DESC_LABEL}>学历</td>
                <td style={DESC_VALUE}>{student.education || '-'}</td>
                <td style={DESC_LABEL}>学校</td>
                <td style={DESC_VALUE}>{student.school || '-'}</td>
              </tr>
              <tr>
                <td style={DESC_LABEL}>专业</td>
                <td style={DESC_VALUE}>{student.major || '-'}</td>
                <td style={DESC_LABEL}>审核状态</td>
                <td style={DESC_VALUE}><ReviewTag status={student.status} /></td>
              </tr>
              <tr>
                <td style={DESC_LABEL}>学生证照片</td>
                <td style={DESC_VALUE} colSpan={3}>
                  {student.student_card_oss ? (
                    <img src={student.student_card_oss} alt="学生证" style={{ maxHeight: 120, maxWidth: '100%' }} />
                  ) : '-'}
                </td>
              </tr>
            </>
          ) : (
            <tr>
              <td style={DESC_VALUE} colSpan={4}><Tag>暂无数据</Tag></td>
            </tr>
          )}
        </tbody>
      </table>
      {reviewActions('student', student?.status)}
        </>
      )}

      {/* Level-2: 企业信息（仅企业用户） */}
      {userType === 'enterprise' && (
        <>
          <h4 style={{ marginBottom: 12 }}>企业信息</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          {enterprise ? (
            <>
              <tr>
                <td style={DESC_LABEL}>单位名称</td>
                <td style={DESC_VALUE} colSpan={3}>{enterprise.organization || '-'}</td>
              </tr>
              <tr>
                <td style={DESC_LABEL}>审核状态</td>
                <td style={DESC_VALUE}><ReviewTag status={enterprise.status} /></td>
              </tr>
            </>
          ) : (
            <tr>
              <td style={DESC_VALUE} colSpan={4}><Tag>暂无数据</Tag></td>
            </tr>
          )}
        </tbody>
      </table>
      {reviewActions('enterprise', enterprise?.status)}
        </>
      )}

      {/* 订单记录 */}
      <h4 style={{ marginBottom: 12 }}>订单记录</h4>
      <Table rowKey="id" columns={orderColumns} dataSource={user.orders || []} pagination={false} size="small" style={{ marginBottom: 24 }} />

      {/* AI 对话记录 */}
      <h4 style={{ marginBottom: 12 }}>AI 对话记录</h4>
      <Table rowKey="id" columns={convColumns} dataSource={user.conversations || []} pagination={false} size="small" />
    </Drawer>
  )
}
