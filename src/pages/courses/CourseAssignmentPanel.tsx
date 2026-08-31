import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, InputNumber, Modal, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { usePermission } from '@/hooks/usePermission'
import { quizService } from '@/services/quiz'
import {
  allocateAssignmentScores,
  courseAssignmentService,
} from '@/services/courseAssignment'
import type { CourseAssignment, CourseAssignmentQuestion } from '@/types/courseAssignment'
import type { CourseQuizBinding } from '@/types/course'
import type { QuizV2Question } from '@/types/quiz'

const { Text } = Typography

const statusLabels: Record<CourseAssignment['status'], { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  disabled: { label: '已停用', color: 'warning' },
}

const typeLabels: Record<CourseAssignmentQuestion['question_type'], string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  judge: '判断题',
  essay: '问答题',
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '请求失败'
}

async function loadPublishedQuestions(libraryId: number) {
  const first = await quizService.listV2Questions({
    library_id: libraryId,
    status: 'published',
    page: 1,
    page_size: 100,
  })
  const items = [...first.items]
  const totalPages = Math.max(1, Math.ceil(first.total / first.page_size))
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await quizService.listV2Questions({
      library_id: libraryId,
      status: 'published',
      page,
      page_size: 100,
    })
    items.push(...next.items)
  }
  return items
}

function questionRows(questions: Array<CourseAssignmentQuestion | QuizV2Question>): CourseAssignmentQuestion[] {
  return questions.map((question, index) => {
    const isAssignmentQuestion = 'question_id' in question
    return {
      question_id: isAssignmentQuestion ? question.question_id : question.id,
      position: isAssignmentQuestion ? question.position : index + 1,
      question_type: question.question_type,
      question_text: question.question_text,
      options: question.options,
      option_image_urls: question.option_image_urls ?? {},
      image_urls: question.image_urls ?? [],
      explanation: question.explanation,
      reference_answer: question.reference_answer,
      score: isAssignmentQuestion ? question.score : 0,
      is_essay: question.question_type === 'essay',
    }
  })
}

export default function CourseAssignmentPanel({
  courseId,
  bindings = [],
}: {
  courseId?: number
  bindings?: CourseQuizBinding[]
}) {
  const canManage = usePermission('course_assignment_manage')
  const [assignments, setAssignments] = useState<CourseAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<CourseAssignment | null>(null)
  const [creatingLibrary, setCreatingLibrary] = useState<CourseQuizBinding | null>(null)
  const [creatingQuestions, setCreatingQuestions] = useState<CourseAssignmentQuestion[]>([])
  const [scores, setScores] = useState<Record<number, number | null>>({})
  const [saving, setSaving] = useState(false)
  const questionController = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAssignments(courseId
        ? await courseAssignmentService.list(courseId)
        : await courseAssignmentService.listAll())
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => { void load() }, [load])

  const openEditing = (assignment: CourseAssignment) => {
    setEditing(assignment)
    setCreatingLibrary(null)
    setScores(Object.fromEntries(
      assignment.questions
        .filter(question => question.is_essay)
        .map(question => [question.question_id, question.score]),
    ))
  }

  const openCreating = async (binding: CourseQuizBinding) => {
    questionController.current?.abort()
    const controller = new AbortController()
    questionController.current = controller
    setCreatingLibrary(binding)
    setCreatingQuestions([])
    setScores({})
    try {
      const questions = questionRows(await loadPublishedQuestions(binding.library_id))
      if (!controller.signal.aborted) setCreatingQuestions(questions)
    } catch (error) {
      if (!controller.signal.aborted) message.error(errorText(error))
    }
  }

  const activeQuestions = editing ? editing.questions : creatingQuestions
  const allocation = useMemo(() => {
    try {
      return {
        scores: allocateAssignmentScores(activeQuestions, scores),
        error: '',
      }
    } catch (error) {
      return { scores: {} as Record<number, string>, error: errorText(error) }
    }
  }, [activeQuestions, scores])

  const essayTotal = activeQuestions
    .filter(question => question.is_essay)
    .reduce((total, question) => total + (scores[question.question_id] ?? 0), 0)
  const objectiveTotal = Math.max(0, 100 - essayTotal)

  const save = async () => {
    if (allocation.error) {
      message.warning(allocation.error)
      return
    }
    const essayScores = activeQuestions
      .filter(question => question.is_essay)
      .map(question => ({
        question_id: question.question_id,
        score: Number(scores[question.question_id]),
      }))
    setSaving(true)
    try {
      if (editing) {
        await courseAssignmentService.update(editing.id, editing.lock_version, essayScores)
        message.success('作业配置已更新，未提交学生将使用最新版本')
      } else if (creatingLibrary) {
        const targetCourseId = courseId ?? creatingLibrary.course_id
        await courseAssignmentService.create(targetCourseId, creatingLibrary.library_id, essayScores)
        message.success('作业配置已创建')
      }
      setEditing(null)
      setCreatingLibrary(null)
      await load()
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  const runStatusAction = (assignment: CourseAssignment, action: 'publish' | 'disable') => {
    Modal.confirm({
      title: action === 'publish' ? '发布课程作业？' : '停用课程作业？',
      content: action === 'publish'
        ? '发布后拥有课程题库权益的学生可见并可开始作答。'
        : '停用后不能新增作答，已有草稿不能提交；已提交记录继续评阅。',
      okButtonProps: { danger: action === 'disable' },
      onOk: async () => {
        try {
          if (action === 'publish') await courseAssignmentService.publish(assignment.id, assignment.lock_version)
          else await courseAssignmentService.disable(assignment.id, assignment.lock_version)
          await load()
          message.success(action === 'publish' ? '作业已发布' : '作业已停用')
        } catch (error) {
          message.error(errorText(error))
          throw error
        }
      },
    })
  }

  const assignmentByLibrary = new Map(assignments.map(assignment => [assignment.library_id, assignment]))
  const activeBindings = bindings.filter(binding => binding.status === 'active')
  const unconfiguredBindings = activeBindings.filter(binding => !assignmentByLibrary.has(binding.library_id))

  const columns: ColumnsType<CourseAssignment> = [
    { title: '题库', dataIndex: 'library_name', render: value => <Text strong>{value}</Text> },
    { title: '编码', dataIndex: 'library_code', width: 130 },
    { title: '状态', dataIndex: 'status', width: 90, render: (value: CourseAssignment['status']) => <Tag color={statusLabels[value].color}>{statusLabels[value].label}</Tag> },
    { title: '版本', dataIndex: 'version_no', width: 75 },
    {
      title: '共享课程',
      width: 105,
      render: (_, record) => record.course_ids.length > 1
        ? <Tag color="purple">{record.course_ids.length} 门课程</Tag>
        : <Text type="secondary">仅当前课程</Text>,
    },
    { title: '题目', width: 100, render: (_, record) => `${record.question_count} 题` },
    { title: '问答题', width: 90, render: (_, record) => `${record.essay_count} 题 / ${record.essay_total_score.toFixed(2)} 分` },
    { title: '客观题', width: 90, render: (_, record) => `${record.objective_count} 题 / ${record.objective_total_score.toFixed(2)} 分` },
    {
      title: '操作',
      width: 190,
      render: (_, record) => canManage ? (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEditing(record)}>配置分值</Button>
          {record.status === 'published'
            ? <Button type="link" size="small" danger onClick={() => runStatusAction(record, 'disable')}>停用</Button>
            : <Button type="link" size="small" onClick={() => runStatusAction(record, 'publish')}>发布</Button>}
        </Space>
      ) : <Text type="secondary">无配置权限</Text>,
    },
  ]

  const drawerQuestions: ColumnsType<CourseAssignmentQuestion> = [
    { title: '#', dataIndex: 'position', width: 50 },
    { title: '题型', dataIndex: 'question_type', width: 85, render: (value: CourseAssignmentQuestion['question_type']) => typeLabels[value] },
    { title: '题干', dataIndex: 'question_text', ellipsis: true },
    {
      title: '分值',
      width: 145,
      render: (_, record) => record.is_essay ? (
        <InputNumber
          min={0.1}
          max={100}
          precision={1}
          value={scores[record.question_id] ?? null}
          onChange={value => setScores(current => ({ ...current, [record.question_id]: value }))}
        />
      ) : <Text>{allocation.scores[record.question_id] ?? '-'} 分</Text>,
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      <Alert
        type="info"
        showIcon
        message="课程作业固定总分 100 分；问答题单独设置分值，客观题自动分摊剩余分数。"
        description="同一题库绑定多个课程时共享一份作业。已发布配置可直接修改；未提交学生使用最新版本，已提交学生保留提交时快照。"
      />
      <Card size="small" title={`作业配置 (${assignments.length})`}>
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={assignments}
          pagination={false}
          scroll={{ x: 980 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前课程还没有作业配置" /> }}
        />
      </Card>
      {canManage && unconfiguredBindings.length > 0 && (
        <Card size="small" title={`可配置题库 (${unconfiguredBindings.length})`}>
          <Space wrap>
            {unconfiguredBindings.map(binding => (
              <Button key={binding.id} onClick={() => void openCreating(binding)}>
                {`${binding.library_name}（课程 ${binding.course_id}）`}
              </Button>
            ))}
          </Space>
        </Card>
      )}
      <Drawer
        title={editing ? `配置作业 · ${editing.library_name}` : creatingLibrary ? `创建作业 · ${creatingLibrary.library_name}` : '作业配置'}
        width={760}
        open={Boolean(editing || creatingLibrary)}
        onClose={() => { setEditing(null); setCreatingLibrary(null) }}
        extra={<Button type="primary" loading={saving} onClick={save} disabled={Boolean(allocation.error)}>保存配置</Button>}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {allocation.error && <Alert type="error" showIcon message={allocation.error} />}
          {editing && editing.course_ids.length > 1 && (
            <Alert type="warning" showIcon message={`该题库作业被 ${editing.course_ids.length} 门课程共享，修改会同步影响全部课程入口。`} />
          )}
          {!allocation.error && (
            <Alert
              type="success"
              showIcon
              message={`问答题 ${essayTotal.toFixed(2)} 分 · 客观题 ${objectiveTotal.toFixed(2)} 分 · 总分 100.00 分`}
            />
          )}
          <Table
            rowKey="question_id"
            size="small"
            columns={drawerQuestions}
            dataSource={activeQuestions}
            pagination={false}
            scroll={{ x: 680 }}
          />
        </Space>
      </Drawer>
    </Space>
  )
}
