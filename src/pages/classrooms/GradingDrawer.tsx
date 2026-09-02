import { useEffect, useState } from 'react'
import { Drawer, Table, Button, Tag, Space, InputNumber, Progress, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { classroomService } from '@/services/classroom'
import { formatDate } from '@/utils/format'
import type {
  Classroom, ClassroomQuiz, ClassroomSubmission,
  ClassroomSubmissionQuestion,
} from '@/types/classroom'

const { Text } = Typography

const TYPE_LABELS: Record<string, string> = {
  single: '单选', multiple: '多选', judge: '判断', blank: '填空', short: '简答',
}

interface Props {
  classroom: Classroom
  quiz: ClassroomQuiz
  onClose: () => void
}

export default function GradingDrawer({ classroom, quiz, onClose }: Props) {
  const [questions, setQuestions] = useState<ClassroomSubmissionQuestion[]>([])
  const [submissions, setSubmissions] = useState<ClassroomSubmission[]>([])
  const [detail, setDetail] = useState<ClassroomSubmission | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ submitted: 0, total: 0, remaining: 0 })

  const load = () => {
    classroomService.listSubmissions(classroom.id, quiz.id)
      .then(({ questions, submissions }) => {
        setQuestions(questions)
        setSubmissions(submissions)
        setProgress({
          submitted: quiz.submitted_count,
          total: quiz.student_count,
          remaining: 0,
        })
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [quiz.id])

  // 实时进度轮询（进行中的测验）
  useEffect(() => {
    if (quiz.status !== 'ongoing') return
    const timer = setInterval(async () => {
      try {
        const p = await classroomService.quizProgress(classroom.id, quiz.id)
        setProgress({ submitted: p.submitted_count, total: p.student_count, remaining: p.remaining_seconds })
      } catch { /* 忽略轮询错误 */ }
    }, 15000)
    return () => clearInterval(timer)
  }, [quiz.id, quiz.status])

  const openDetail = (sub: ClassroomSubmission) => {
    setDetail(sub)
    setScores(sub.manual_scores || {})
  }

  const saveReview = async (approve: boolean) => {
    if (!detail) return
    await classroomService.reviewSubmission(classroom.id, quiz.id, detail.id, {
      manual_scores: scores, approve,
    })
    message.success(approve ? '已批改放行，学生可见分数' : '批改已暂存')
    setDetail(null)
    load()
  }

  const qmap = Object.fromEntries(questions.map((q) => [q.id, q]))
  const autoTotal = (sub: ClassroomSubmission) => sub.total_score - sub.manual_score

  const columns: ColumnsType<ClassroomSubmission> = [
    { title: '学生', dataIndex: 'student_name', width: 120 },
    {
      title: '客观题', width: 80,
      render: (_, r) => autoTotal(r),
    },
    {
      title: '简答给分', width: 90,
      render: (_, r) => r.manual_score,
    },
    {
      title: '总分', width: 80,
      render: (_, r) => <Text strong>{r.total_score}</Text>,
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: string) => v === 'approved' ? <Tag color='green'>已放行</Tag> : <Tag color='orange'>待批改</Tag>,
    },
    { title: '交卷时间', dataIndex: 'submitted_at', width: 160, render: (t: string) => formatDate(t) },
    {
      title: '操作', width: 80,
      render: (_, r) => <Button type='link' size='small' onClick={() => openDetail(r)}>批改</Button>,
    },
  ]

  return (
    <Drawer
      title={`批改 · ${quiz.title}`}
      open
      onClose={onClose}
      width={720}
      destroyOnClose
    >
      {quiz.status === 'ongoing' && (
        <div style={{ marginBottom: 16 }}>
          <Progress
            percent={progress.total ? Math.round((progress.submitted / progress.total) * 100) : 0}
            format={() => `已交 ${progress.submitted} / ${progress.total}`}
          />
          <Text type='secondary'>
            剩余时间 {Math.floor(progress.remaining / 60)} 分 {progress.remaining % 60} 秒（15 秒自动刷新）
          </Text>
        </div>
      )}

      <Table rowKey='id' columns={columns} dataSource={submissions} loading={loading} pagination={false} size='small' />

      <Drawer
        title={`阅卷 · ${detail?.student_name ?? ''}`}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        width={640}
        destroyOnClose
      >
        {detail && questions.map((q) => {
          const studentAnswer = detail.answers[String(q.id)] ?? ''
          const autoScored = ['single', 'multiple', 'judge', 'blank'].includes(q.type)
          return (
            <div key={q.id} style={{ marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8 }}>
              <Space style={{ marginBottom: 8 }}>
                <Tag>{TYPE_LABELS[q.type]}</Tag>
                <Text type='secondary'>满分 {q.score}</Text>
              </Space>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>{q.stem}</div>
              {q.options && (
                <div style={{ marginBottom: 8 }}>
                  {q.options.map((opt, i) => (
                    <div key={i} style={{ color: q.answer?.includes(String(i)) ? '#52c41a' : '#666' }}>
                      {String.fromCharCode(65 + i)}. {opt} {q.answer?.includes(String(i)) && '✓'}
                    </div>
                  ))}
                </div>
              )}
              {q.answer && <Text type='secondary' style={{ display: 'block', marginBottom: 4 }}>标准答案：{q.answer}</Text>}
              <Text style={{ display: 'block', marginBottom: 8 }}>学生答案：{studentAnswer || '（未作答）'}</Text>
              <Space>
                <span>给分：</span>
                <InputNumber
                  min={0} max={q.score}
                  value={scores[String(q.id)] ?? (autoScored ? undefined : 0)}
                  onChange={(v) => setScores({ ...scores, [String(q.id)]: v ?? 0 })}
                  disabled={false}
                />
                <Text type='secondary'>/ {q.score}</Text>
              </Space>
            </div>
          )
        })}
        {detail && (
          <Space>
            <Button onClick={() => saveReview(false)}>暂存</Button>
            <Button type='primary' onClick={() => saveReview(true)}>批改并放行分数</Button>
          </Space>
        )}
      </Drawer>
    </Drawer>
  )
}
