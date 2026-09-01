import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, Input, Modal, Radio, Segmented, Space, Table, Tag, Typography, message } from 'antd'
import { CheckCircleOutlined, EyeOutlined, LockOutlined, RollbackOutlined, SendOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import { useAuthStore } from '@/stores/authStore'
import { ApiError, isConflictError } from '@/core/request'
import type {
  AdminQuizReviewDetail,
  AdminQuizReviewListItem,
  AdminQuizReviewQuestion,
  AdminQuizReviewVerdictItem,
  ReviewVerdict,
} from '@/types/quiz'

const { Paragraph, Title } = Typography

const reviewStatusLabels: Record<AdminQuizReviewListItem['review_status'], string> = {
  pending: '待领取',
  in_progress: '评阅中',
  recalled: '已撤回',
}
const reviewStatusColors: Record<AdminQuizReviewListItem['review_status'], string> = {
  pending: 'gold',
  in_progress: 'processing',
  recalled: 'warning',
}
const verdictLabels: Record<ReviewVerdict, string> = {
  wrong: '✗ 不得分',
  partial: '半对 得一半',
  correct: '✓ 满分',
}

function errorText(error: unknown) { return error instanceof Error ? error.message : '请求失败' }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-' }

interface VerdictDraft {
  verdict: ReviewVerdict
  comment: string
}

export default function QuizReviews() {
  const admin = useAuthStore((s) => s.admin)
  const adminId = admin?.id ?? null
  const [statusFilter, setStatusFilter] = useState<'all' | AdminQuizReviewListItem['review_status']>('all')
  const [items, setItems] = useState<AdminQuizReviewListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<AdminQuizReviewDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [drafts, setDrafts] = useState<Record<number, VerdictDraft>>({})
  const [saving, setSaving] = useState(false)
  const [recallOpen, setRecallOpen] = useState(false)
  const [recallExamId, setRecallExamId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await quizService.listReviewExams({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        page_size: pageSize,
      })
      setItems(result.items)
      setTotal(result.total)
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter])

  useEffect(() => { void load() }, [load])

  const openDetail = async (examId: number) => {
    setDetailLoading(true)
    setDrafts({})
    try {
      const loaded = await quizService.getReviewDetail(examId)
      setDetail(loaded)
      setDrafts(Object.fromEntries(loaded.questions.map((question) => [
        question.exam_question_id,
        { verdict: question.verdict ?? 'wrong', comment: question.comment ?? '' },
      ])))
    } catch (error) {
      if (error instanceof ApiError && isConflictError(error)) message.warning(error.message)
      else message.error(errorText(error))
    } finally {
      setDetailLoading(false)
    }
  }

  const claim = async (examId: number) => {
    try {
      await quizService.claimReview(examId)
      message.success('已领取评阅任务')
      await openDetail(examId)
      await load()
    } catch (error) {
      if (error instanceof ApiError && isConflictError(error)) message.warning(error.message)
      else message.error(errorText(error))
    }
  }

  const saveVerdicts = async () => {
    if (!detail) return
    const verdicts: AdminQuizReviewVerdictItem[] = detail.questions.map((question) => ({
      exam_question_id: question.exam_question_id,
      verdict: drafts[question.exam_question_id]?.verdict ?? 'wrong',
      comment: drafts[question.exam_question_id]?.comment?.trim() || null,
    }))
    setSaving(true)
    try {
      await quizService.submitReviewVerdicts(detail.exam_id, verdicts)
      message.success('评分草稿已保存')
      await openDetail(detail.exam_id)
    } catch (error) {
      if (error instanceof ApiError && isConflictError(error)) message.warning(error.message)
      else message.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  const complete = () => {
    if (!detail) return
    const missing = detail.questions.filter((question) => !drafts[question.exam_question_id]?.verdict)
    if (missing.length) {
      message.warning(`还有 ${missing.length} 道问答题未评分`)
      return
    }
    Modal.confirm({
      title: '完成评阅并公布成绩？',
      content: '完成后学生即可看到总分、每题得分与评语。未作答的问答题将按 0 分计入。',
      okText: '完成评阅',
      cancelText: '再检查一下',
      onOk: async () => {
        if (!detail) return
        setSubmitting(true)
        try {
          await quizService.submitReviewVerdicts(detail.exam_id, detail.questions.map((question) => ({
            exam_question_id: question.exam_question_id,
            verdict: drafts[question.exam_question_id]?.verdict ?? 'wrong',
            comment: drafts[question.exam_question_id]?.comment?.trim() || null,
          })))
          const result = await quizService.completeReview(detail.exam_id)
          message.success(`评阅完成，总分 ${result.score} 分`)
          setDetail(null)
          await load()
        } catch (error) {
          if (error instanceof ApiError && isConflictError(error)) message.warning(error.message)
          else message.error(errorText(error))
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  const recall = () => {
    if (!recallExamId) return
    Modal.confirm({
      title: `撤回考试 ${recallExamId} 的评分？`,
      content: '撤回后学生端回到“评阅中”状态，成绩统计同步回滚，原评分记录保留留痕。',
      okText: '撤回评分',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setSubmitting(true)
        try {
          await quizService.recallReview(recallExamId)
          message.success('评分已撤回，可重新领取评阅')
          setRecallOpen(false)
          setRecallExamId(null)
          await load()
        } catch (error) {
          if (error instanceof ApiError && isConflictError(error)) message.warning(error.message)
          else message.error(errorText(error))
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  const columns: ColumnsType<AdminQuizReviewListItem> = [
    { title: '考试', dataIndex: 'exam_id', width: 90 },
    { title: '学生', dataIndex: 'user_id', width: 90 },
    { title: '交卷状态', dataIndex: 'status', width: 100, render: (value: string) => <Tag>{value === 'completed' ? '正常交卷' : '到时自动结算'}</Tag> },
    { title: '评阅状态', dataIndex: 'review_status', width: 100, render: (value: AdminQuizReviewListItem['review_status']) => <Tag color={reviewStatusColors[value]}>{reviewStatusLabels[value]}</Tag> },
    { title: '题数', dataIndex: 'question_count', width: 70 },
    { title: '交卷时间', width: 180, render: (_, record) => formatDate(record.submitted_at ?? record.timed_out_at) },
    { title: '领取人', dataIndex: 'review_locked_by', width: 90, render: (value: number | null) => (value == null ? '-' : `管理员 ${value}`) },
    {
      title: '操作',
      width: 140,
      render: (_, record) => {
        const mine = adminId != null && record.review_locked_by === adminId
        if (record.review_status === 'pending' || record.review_locked_by == null) {
          return <Button type="primary" size="small" icon={<LockOutlined />} onClick={() => void claim(record.exam_id)}>{record.review_status === 'recalled' ? '重新领取' : '领取评阅'}</Button>
        }
        if (mine) {
          return <Button size="small" icon={<EyeOutlined />} onClick={() => void openDetail(record.exam_id)}>继续评阅</Button>
        }
        return <Button size="small" disabled>他人评阅中</Button>
      },
    },
  ]

  return (
    <PageContainer title="考试人工评阅">
      <Card
        title="考试人工评阅"
        extra={
          <Space>
            <Segmented
              value={statusFilter}
              onChange={(value) => { setStatusFilter(value as typeof statusFilter); setPage(1) }}
              options={[
                { value: 'all', label: '全部' },
                { value: 'pending', label: '待领取' },
                { value: 'in_progress', label: '评阅中' },
                { value: 'recalled', label: '已撤回' },
              ]}
            />
            <Button icon={<RollbackOutlined />} onClick={() => setRecallOpen(true)}>按考试 ID 撤回评分</Button>
            <Button onClick={() => void load()}>刷新</Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="含问答题的考试在评阅完成前不向学生显示任何分数；客观题（含填空）交卷即自动判分。"
        />
        <Table
          rowKey="exam_id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={{ current: page, pageSize, total, showSizeChanger: false, onChange: setPage }}
        />
      </Card>

      <Drawer
        title={detail ? `阅卷 · 考试 ${detail.exam_id} · 学生 ${detail.user_id}` : '阅卷'}
        open={detail != null}
        onClose={() => setDetail(null)}
        width={760}
        destroyOnClose
        footer={
          detail ? (
            <Space style={{ float: 'right' }}>
              <Button onClick={() => setDetail(null)}>关闭</Button>
              <Button loading={saving} onClick={() => void saveVerdicts()}>保存评分草稿</Button>
              <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={complete}>完成评阅并公布</Button>
            </Space>
          ) : null
        }
      >
        {detailLoading || !detail ? (
          <Empty description="加载中" />
        ) : (
          <>
            <Alert
              type={detail.questions.some((question) => !question.answered) ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 16 }}
              message={
                detail.questions.some((question) => !question.answered)
                  ? '本场有未作答的问答题：默认 0 分，需逐题显式确认三档判定后才能完成评阅。'
                  : '全部问答题均有作答，逐题三档打分后点击“完成评阅并公布”。'
              }
            />
            {detail.questions.map((question, index) => (
              <Card
                key={question.exam_question_id}
                size="small"
                style={{ marginBottom: 16 }}
                title={<Space><Tag color="purple">问答题</Tag><span>第 {question.position} 题</span>{!question.answered && <Tag color="red">未作答</Tag>}</Space>}
              >
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{index + 1}. {question.question_text}</Paragraph>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                    <Title level={5}>学生答案</Title>
                    <Paragraph style={{ whiteSpace: 'pre-wrap' }} type={question.answered ? undefined : 'secondary'}>
                      {question.answered ? question.user_answer : '（未作答）'}
                    </Paragraph>
                  </div>
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                    <Title level={5}>参考答案</Title>
                    <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{question.reference_answer}</Paragraph>
                    {question.explanation && <Paragraph type="secondary" style={{ whiteSpace: 'pre-wrap' }}>解析：{question.explanation}</Paragraph>}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Radio.Group
                    value={drafts[question.exam_question_id]?.verdict ?? 'wrong'}
                    onChange={(event) => setDrafts((prev) => ({
                      ...prev,
                      [question.exam_question_id]: { verdict: event.target.value as ReviewVerdict, comment: prev[question.exam_question_id]?.comment ?? '' },
                    }))}
                    optionType="button"
                    options={(Object.keys(verdictLabels) as ReviewVerdict[]).map((value) => ({ value, label: verdictLabels[value] }))}
                  />
                  <Input.TextArea
                    style={{ marginTop: 8 }}
                    rows={2}
                    maxLength={512}
                    value={drafts[question.exam_question_id]?.comment ?? ''}
                    onChange={(event) => setDrafts((prev) => ({
                      ...prev,
                      [question.exam_question_id]: { verdict: prev[question.exam_question_id]?.verdict ?? 'wrong', comment: event.target.value },
                    }))}
                    placeholder="评语（可选，学生可见）"
                  />
                </div>
              </Card>
            ))}
          </>
        )}
      </Drawer>

      <Modal
        title="按考试 ID 撤回评分"
        open={recallOpen}
        onOk={recall}
        onCancel={() => setRecallOpen(false)}
        okText="撤回"
        okButtonProps={{ danger: true, disabled: recallExamId == null }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            type="number"
            placeholder="输入要撤回评分的考试 ID"
            value={recallExamId ?? ''}
            onChange={(event) => setRecallExamId(Number(event.target.value) || null)}
          />
          <Alert type="warning" showIcon message="仅超级管理员或原评阅人可撤回；学生端将回到“评阅中”状态。" />
        </Space>
      </Modal>
    </PageContainer>
  )
}
