import { useEffect, useState } from 'react'
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, Typography, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { usePagination } from '@/hooks/usePagination'
import { classroomService } from '@/services/classroom'
import { formatDate } from '@/utils/format'
import GradingDrawer from './GradingDrawer'
import type { Classroom, ClassroomQuestion, ClassroomQuiz } from '@/types/classroom'

const { Text } = Typography

export default function QuizzesTab({ classroom }: { classroom: Classroom }) {
  const [quizzes, setQuizzes] = useState<ClassroomQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [grading, setGrading] = useState<ClassroomQuiz | null>(null)
  const [form] = Form.useForm<{ title: string; duration_minutes: number; question_ids: number[] }>()

  // 已发布题目（选题用）
  const [questions, setQuestions] = useState<ClassroomQuestion[]>([])
  const { data: qData } = usePagination(
    (page) => classroomService.listQuestions(classroom.id, { status: 'published', ...page }),
    [classroom.id],
  )
  useEffect(() => { if (qData) setQuestions(qData.items) }, [qData])

  const load = () => {
    classroomService.listQuizzes(classroom.id)
      .then(setQuizzes)
      .finally(() => setLoading(false))
  }
  useEffect(load, [classroom.id])

  const create = async () => {
    const values = await form.validateFields()
    await classroomService.createQuiz(classroom.id, values)
    message.success('测验已发起，学生端立即可见')
    setCreateOpen(false)
    load()
  }

  const end = async (quizId: number) => {
    await classroomService.endQuiz(classroom.id, quizId)
    message.success('测验已结束')
    load()
  }

  const columns: ColumnsType<ClassroomQuiz> = [
    { title: '测验', dataIndex: 'title', ellipsis: true },
    { title: '限时', dataIndex: 'duration_minutes', width: 80, render: (v: number) => `${v} 分钟` },
    { title: '题数', dataIndex: 'question_count', width: 70, align: 'center' },
    {
      title: '交卷', width: 110,
      render: (_, r) => `${r.submitted_count} / ${r.student_count}`,
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: string) => v === 'ongoing' ? <Tag color='orange'>进行中</Tag> : <Tag color='blue'>已结束</Tag>,
    },
    { title: '开始时间', dataIndex: 'started_at', width: 170, render: (t: string) => formatDate(t) },
    {
      title: '操作', width: 180,
      render: (_, r) => (
        <Space size={4}>
          <Button type='link' size='small' onClick={() => setGrading(r)}>批改</Button>
          {r.status === 'ongoing' && (
            <Button type='link' size='small' danger onClick={() => end(r.id)}>结束</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Button type='primary' icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { form.resetFields(); form.setFieldsValue({ duration_minutes: 20 }); setCreateOpen(true) }}>
        发起限时测验
      </Button>
      <Table rowKey='id' columns={columns} dataSource={quizzes} loading={loading} pagination={false} />

      <Modal
        title='发起限时测验' open={createOpen} onOk={create}
        onCancel={() => setCreateOpen(false)} destroyOnClose
      >
        <Form form={form} layout='vertical' style={{ marginTop: 16 }}>
          <Form.Item name='title' label='测验标题' rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder='如：第 3 讲随堂测验' maxLength={128} />
          </Form.Item>
          <Form.Item name='duration_minutes' label='限时（分钟）' rules={[{ required: true }]}>
            <InputNumber min={1} max={180} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name='question_ids' label='选择题目（仅已发布）'
            rules={[{ required: true, message: '请选择题目' }]}
          >
            <Select
              mode='multiple'
              placeholder='选择题目'
              options={questions.map((q) => ({
                label: `[${q.type}] ${q.stem.slice(0, 30)}…（${q.score}分）`,
                value: q.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {grading && (
        <GradingDrawer classroom={classroom} quiz={grading} onClose={() => { setGrading(null); load() }} />
      )}
    </>
  )
}
