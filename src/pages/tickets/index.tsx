import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { usePagination } from '@/hooks/usePagination'
import { ticketService } from '@/services/tickets'
import { parseQuizFeedbackQuestionId } from '@/utils/tickets'
import { formatDate } from '@/utils/format'
import type { Ticket, TicketStatus } from '@/types/ticket'

const { Paragraph, Text } = Typography

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  waiting_manual: { text: '待处理', color: 'orange' },
  processing: { text: '处理中', color: 'blue' },
  resolved: { text: '已解决', color: 'green' },
}

const isTicketStatus = (value: string): value is TicketStatus =>
  value === 'waiting_manual' || value === 'processing' || value === 'resolved'

export default function TicketManagement() {
  const navigate = useNavigate()
  const canAccessQuiz = usePermission('quiz:list')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [detail, setDetail] = useState<Ticket | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)

  const { data, loading, pagination, refresh } = usePagination(
    (page) => ticketService.list({ status: statusFilter || undefined, ...page }),
    [statusFilter],
  )

  const updateStatus = async (ticket: Ticket, status: TicketStatus) => {
    if (updating !== null) return
    setUpdating(ticket.id)
    try {
      await ticketService.update(ticket.id, { status })
      message.success(`工单 #${ticket.id} 已标记为「${STATUS_CONFIG[status]?.text ?? status}」`)
      setDetail(current => (current?.id === ticket.id ? null : current))
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新失败，请重试')
    } finally {
      setUpdating(null)
    }
  }

  const locateFeedbackQuestion = async (ticket: Ticket) => {
    const questionId = parseQuizFeedbackQuestionId(ticket.content)
    if (updating !== null || !questionId) return
    setUpdating(ticket.id)
    try {
      if (ticket.status !== 'processing') {
        await ticketService.update(ticket.id, { status: 'processing' })
      }
      message.success(`工单 #${ticket.id} 已标记为处理中，正在定位题目 #${questionId}`)
      setDetail(current => (current?.id === ticket.id ? null : current))
      navigate(`/admin/quiz/questions?question_id=${questionId}&include_deleted=true`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新失败，请重试')
    } finally {
      setUpdating(null)
    }
  }

  const columns: ColumnsType<Ticket> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户 ID', dataIndex: 'user_id', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => {
        const config = STATUS_CONFIG[value]
        return <Tag color={config?.color}>{config?.text ?? value}</Tag>
      },
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (value: string | null) => value || '-',
    },
    { title: '创建时间', dataIndex: 'created_at', width: 180, render: (value: string) => formatDate(value) },
    { title: '更新时间', dataIndex: 'updated_at', width: 180, render: (value: string) => formatDate(value) },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      render: (_, record) => (
        <Space>
          <a onClick={() => setDetail(record)}>查看</a>
          {canAccessQuiz && record.status !== 'resolved' && parseQuizFeedbackQuestionId(record.content) !== null && (
            <a onClick={() => void locateFeedbackQuestion(record)}>
              {updating === record.id ? '跳转中…' : '处理'}
            </a>
          )}
          {record.status !== 'processing' && (
            <a onClick={() => void updateStatus(record, 'processing')}>标记处理中</a>
          )}
          {record.status !== 'resolved' && (
            <a onClick={() => void updateStatus(record, 'resolved')}>标记已解决</a>
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer title="客服工单">
      <Tabs
        activeKey={statusFilter}
        onChange={key => setStatusFilter(key)}
        items={[
          { key: '', label: '全部' },
          { key: 'waiting_manual', label: '待处理' },
          { key: 'processing', label: '处理中' },
          { key: 'resolved', label: '已解决' },
        ]}
        style={{ marginBottom: 8 }}
      />
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        学生在练习页提交的「题目纠错」会以【题目反馈】开头进入这里；点击「处理」会自动标记处理中并跳转到对应题目，修正后请标记已解决，形成处理闭环。
      </Text>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
      />

      <Modal
        title={`工单 #${detail?.id ?? ''}`}
        open={detail !== null}
        footer={null}
        onCancel={() => setDetail(null)}
        width={720}
      >
        {detail && (
          <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 12 }}>
            <Space size={8}>
              <Tag color={STATUS_CONFIG[detail.status]?.color}>
                {STATUS_CONFIG[detail.status]?.text ?? detail.status}
              </Tag>
              <Text type="secondary">用户 ID：{detail.user_id}</Text>
              {detail.teacher_id !== null && <Text type="secondary">处理人 ID：{detail.teacher_id}</Text>}
            </Space>
            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
              {detail.content || '（无内容）'}
            </Paragraph>
            <Space>
              <Text type="secondary">创建：{formatDate(detail.created_at)}</Text>
              <Text type="secondary">更新：{formatDate(detail.updated_at)}</Text>
            </Space>
            {isTicketStatus(detail.status) && detail.status !== 'resolved' && (
              <Space>
                {canAccessQuiz && parseQuizFeedbackQuestionId(detail.content) !== null && (
                  <a onClick={() => void locateFeedbackQuestion(detail)}>
                    {updating === detail.id ? '跳转中…' : `处理并定位题目 #${parseQuizFeedbackQuestionId(detail.content)}`}
                  </a>
                )}
                {detail.status !== 'processing' && (
                  <a onClick={() => void updateStatus(detail, 'processing')}>标记处理中</a>
                )}
                <a onClick={() => void updateStatus(detail, 'resolved')}>标记已解决</a>
              </Space>
            )}
          </Space>
        )}
      </Modal>
    </PageContainer>
  )
}
