import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { courseAssignmentService } from '@/services/courseAssignment'
import { courseManagementService } from '@/services/courseManagement'
import { quizService } from '@/services/quiz'
import type {
  CourseAssignmentReviewLog,
  CourseAssignmentResultQuestion,
  CourseAssignmentSubmissionDetail,
  CourseAssignmentSubmissionFilter,
  CourseAssignmentSubmissionListItem,
} from '@/types/courseAssignment'
import type { CourseItem } from '@/types/course'
import type { QuizLibrary } from '@/types/quiz'

const { Text } = Typography

const statusLabels: Record<CourseAssignmentSubmissionListItem['status'], { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  submitted: { label: '待领取', color: 'processing' },
  claimed: { label: '评阅中', color: 'warning' },
  graded: { label: '已评分', color: 'success' },
}

const actionLabels: Record<CourseAssignmentReviewLog['action'], string> = {
  save: '保存评分草稿',
  claim: '领取评阅',
  complete: '完成评阅',
  reopen: '撤回评分',
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '请求失败'
}

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}

function answerText(answer: string | string[] | null) {
  if (answer == null) return '未作答'
  return Array.isArray(answer) ? answer.join('、') : answer
}

export default function CourseAssignmentReviewPage() {
  const canReview = usePermission('course_assignment_review')
  const [form] = Form.useForm<CourseAssignmentSubmissionFilter>()
  const [data, setData] = useState<{ items: CourseAssignmentSubmissionListItem[]; total: number }>({ items: [], total: 0 })
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [libraries, setLibraries] = useState<QuizLibrary[]>([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<CourseAssignmentSubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [logs, setLogs] = useState<CourseAssignmentReviewLog[]>([])
  const [scores, setScores] = useState<Record<number, number | null>>({})
  const [comments, setComments] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const [filters, setFilters] = useState<CourseAssignmentSubmissionFilter>({
    course_id: undefined,
    library_id: undefined,
    status: undefined,
    keyword: undefined,
    page: 1,
    page_size: 20,
  })

  const load = useCallback(async () => {
    if (!canReview) return
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setLoading(true)
    try {
      const result = await courseAssignmentService.listSubmissions(filters, next.signal)
      if (!next.signal.aborted) setData({ items: result.items, total: result.total })
    } catch (error) {
      if (!next.signal.aborted) message.error(errorText(error))
    } finally {
      if (!next.signal.aborted) setLoading(false)
    }
  }, [canReview, filters])

  useEffect(() => { void load(); return () => controller.current?.abort() }, [load])

  useEffect(() => {
    if (!canReview) return
    Promise.all([
      courseManagementService.listCourses({ page: 1, page_size: 100 }),
      quizService.listLibraries({ include_deleted: false }),
    ])
      .then(([coursePage, libraryList]) => {
        setCourses(coursePage.items)
        setLibraries(libraryList)
      })
      .catch(error => message.error(errorText(error)))
  }, [canReview])

  const applyDetail = (next: CourseAssignmentSubmissionDetail) => {
    setDetail(next)
    setScores(Object.fromEntries(next.questions.map(question => [question.submission_question_id, question.manual_score])))
    setComments(Object.fromEntries(next.questions.map(question => [question.submission_question_id, question.review_comment ?? ''])))
  }

  const openDetail = async (submissionId: number) => {
    setDetailLoading(true)
    setLogs([])
    try {
      applyDetail(await courseAssignmentService.getSubmission(submissionId))
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setDetailLoading(false)
    }
  }

  const claim = async (item: CourseAssignmentSubmissionListItem) => {
    try {
      const saved = await courseAssignmentService.claim(item.id, item.lock_version)
      message.success('已领取评阅，学生不可再撤回')
      await load()
      await openDetail(saved.submission_id)
    } catch (error) {
      message.error(errorText(error))
    }
  }

  const saveReview = async (complete: boolean) => {
    if (!detail) return
    if (complete) {
      const missing = detail.questions.filter(question => question.requires_review && scores[question.submission_question_id] == null)
      if (missing.length) {
        message.warning('还有已作答问答题未评分')
        return
      }
    }
    const payload = detail.questions
      .filter(question => question.requires_review)
      .map(question => ({
        submission_question_id: question.submission_question_id,
        score: Number(scores[question.submission_question_id] ?? 0),
        comment: comments[question.submission_question_id]?.trim() || null,
      }))
    setSaving(true)
    try {
      const saved = await courseAssignmentService.saveReview(detail.id, detail.lock_version, payload, complete)
      message.success(complete ? '评阅已完成，成绩已发布' : '评分草稿已保存')
      await load()
      await openDetail(saved.submission_id)
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  const reopen = async () => {
    if (!detail) return
    try {
      const saved = await courseAssignmentService.reopen(detail.id, detail.lock_version)
      message.success('已撤回评分')
      await load()
      await openDetail(saved.submission_id)
    } catch (error) {
      message.error(errorText(error))
    }
  }

  const loadLogs = async (submissionId: number) => {
    try {
      setLogs(await courseAssignmentService.listLogs(submissionId))
    } catch (error) {
      message.error(errorText(error))
    }
  }

  const columns: ColumnsType<CourseAssignmentSubmissionListItem> = [
    { title: '提交 ID', dataIndex: 'id', width: 85 },
    { title: '学生', dataIndex: 'student_name', width: 120, render: (value, record) => <Space direction="vertical" size={0}><Text strong>{value}</Text><Text type="secondary">{record.student_phone ?? `用户 ${record.user_id}`}</Text></Space> },
    { title: '题库', dataIndex: 'library_name', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 90, render: (value: CourseAssignmentSubmissionListItem['status']) => <Tag color={statusLabels[value].color}>{statusLabels[value].label}</Tag> },
    { title: '提交时间', dataIndex: 'submitted_at', width: 165, render: formatTime },
    { title: '评分时间', dataIndex: 'graded_at', width: 165, render: formatTime },
    { title: '总分', dataIndex: 'total_score', width: 80, render: value => value == null ? '-' : value.toFixed(2) },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => void openDetail(record.id)}>详情</Button>
          {record.status === 'submitted' && <Button type="link" size="small" onClick={() => void claim(record)}>领取</Button>}
        </Space>
      ),
    },
  ]

  const logColumns: ColumnsType<CourseAssignmentReviewLog> = [
    { title: '操作', dataIndex: 'action', width: 105, render: (value: CourseAssignmentReviewLog['action']) => actionLabels[value] },
    { title: '管理员', dataIndex: 'admin_id', width: 85, render: value => value ?? '系统' },
    { title: '变更前', ellipsis: true, render: (_, record) => JSON.stringify(record.before ?? {}) },
    { title: '变更后', ellipsis: true, render: (_, record) => JSON.stringify(record.after ?? {}) },
    { title: '时间', dataIndex: 'created_at', width: 165, render: formatTime },
  ]

  const renderQuestion = (question: CourseAssignmentResultQuestion) => (
    <Card key={question.submission_question_id} size="small" title={`第 ${question.position} 题 · ${question.question_type === 'essay' ? '问答题' : '客观题'} · 满分 ${question.score.toFixed(2)}`}>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Text>{question.question_text}</Text>
        {question.options && Object.keys(question.options).length > 0 && (
          <Text type="secondary">
            {Object.entries(question.options).map(([key, value]) => `${key}.${value}`).join('　')}
          </Text>
        )}
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="学生答案">{answerText(question.user_answer)}</Descriptions.Item>
          {!question.is_essay && <Descriptions.Item label="正确答案">{answerText(question.correct_answer)}</Descriptions.Item>}
          {!question.is_essay && <Descriptions.Item label="自动判分">{question.is_objective_correct ? <Tag color="success">正确</Tag> : <Tag color="error">错误</Tag>}</Descriptions.Item>}
          {question.is_essay && <Descriptions.Item label="参考答案 / 评分标准">{question.reference_answer || '未填写'}</Descriptions.Item>}
          {question.explanation && <Descriptions.Item label="解析">{question.explanation}</Descriptions.Item>}
        </Descriptions>
        {question.requires_review ? (
          <Space wrap align="baseline">
            <InputNumber
              min={0}
              max={question.score}
              precision={1}
              value={scores[question.submission_question_id] ?? null}
              onChange={value => setScores(current => ({ ...current, [question.submission_question_id]: value }))}
            />
            <Input.TextArea
              rows={2}
              maxLength={1000}
              value={comments[question.submission_question_id] ?? ''}
              onChange={event => setComments(current => ({ ...current, [question.submission_question_id]: event.target.value }))}
              placeholder="评语，选填"
              style={{ width: 420 }}
            />
          </Space>
        ) : (
          <Text type="secondary">
            得分：{(question.earned_score ?? 0).toFixed(2)} 分
            {question.review_comment ? ` · 评语：${question.review_comment}` : ''}
          </Text>
        )}
      </Space>
    </Card>
  )

  return (
    <PageContainer title="课程作业评阅">
      {!canReview ? (
        <Alert type="warning" showIcon message="当前角色没有课程作业评阅权限。" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Card size="small">
            <Form
              form={form}
              layout="vertical"
              onValuesChange={changed => setFilters(current => ({ ...current, ...changed, page: 1 }))}
            >
              <Row gutter={[12, 8]}>
                <Col xs={24} md={6}><Form.Item name="course_id" label="课程"><Select allowClear placeholder="全部课程" options={courses.map(course => ({ value: course.id, label: course.title }))} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item name="library_id" label="题库"><Select allowClear showSearch optionFilterProp="label" placeholder="全部题库" options={libraries.map(library => ({ value: library.id, label: library.name }))} /></Form.Item></Col>
                <Col xs={24} md={5}><Form.Item name="status" label="状态"><Select allowClear placeholder="全部状态" options={Object.entries(statusLabels).map(([value, item]) => ({ value, label: item.label }))} /></Form.Item></Col>
                <Col xs={24} md={7}><Form.Item name="keyword" label="学生"><Input allowClear placeholder="姓名 / 手机号" /></Form.Item></Col>
              </Row>
            </Form>
          </Card>
          <Card size="small" title={`提交记录 (${data.total})`}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={data.items}
              pagination={{
                current: filters.page,
                pageSize: filters.page_size,
                total: data.total,
                showSizeChanger: true,
                onChange: (page, pageSize) => setFilters(current => ({
                  ...current,
                  page: pageSize !== current.page_size ? 1 : page,
                  page_size: pageSize,
                })),
              }}
              scroll={{ x: 980 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无作业提交" /> }}
            />
          </Card>
        </Space>
      )}

      <Drawer
        title={detail ? `作业评阅 · ${detail.student_name}` : '作业评阅'}
        width={860}
        open={Boolean(detail)}
        onClose={() => { setDetail(null); setLogs([]) }}
        extra={detail && (
          <Space>
            <Button onClick={() => void loadLogs(detail.id)}>修改记录</Button>
            {detail.status === 'claimed' && <Button onClick={() => void saveReview(false)} loading={saving}>保存草稿</Button>}
            {detail.status === 'claimed' && <Button type="primary" onClick={() => void saveReview(true)} loading={saving}>完成评阅</Button>}
            {detail.status === 'graded' && <Button danger onClick={() => void reopen()}>撤回评分</Button>}
          </Space>
        )}
      >
        {detailLoading && <Text>正在加载提交详情…</Text>}
        {detail && !detailLoading && (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="状态"><Tag color={statusLabels[detail.status].color}>{statusLabels[detail.status].label}</Tag></Descriptions.Item>
              <Descriptions.Item label="配置版本">v{detail.config_version_no}</Descriptions.Item>
              <Descriptions.Item label="题库">{detail.library_name}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{formatTime(detail.submitted_at)}</Descriptions.Item>
              <Descriptions.Item label="领取管理员">{detail.claimed_by ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="总分">{detail.total_score == null ? '-' : detail.total_score.toFixed(2)}</Descriptions.Item>
            </Descriptions>
            {detail.status === 'submitted' && <Alert type="warning" showIcon message="该作业待领取；领取后学生不可撤回。" />}
            {detail.questions.map(renderQuestion)}
            {logs.length > 0 && <Card size="small" title="评分修改记录"><Table rowKey="id" size="small" columns={logColumns} dataSource={logs} pagination={false} scroll={{ x: 800 }} /></Card>}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  )
}
