import { useEffect, useState } from 'react'
import { Button, Tabs, Typography, Space, Statistic, Card, Row, Col, Tag, message } from 'antd'
import { ArrowLeftOutlined, CopyOutlined, TeamOutlined, VideoCameraOutlined, FileTextOutlined, FieldTimeOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { classroomService } from '@/services/classroom'
import { formatDate } from '@/utils/format'
import { useAuth } from '@/hooks/useAuth'
import StudentsTab from './StudentsTab'
import VideosTab from './VideosTab'
import QuestionsTab from './QuestionsTab'
import QuizzesTab from './QuizzesTab'
import type { Classroom } from '@/types/classroom'

const { Text } = Typography

export default function ClassroomWorkbench() {
  const { classroomId } = useParams<{ classroomId: string }>()
  const navigate = useNavigate()
  const { admin } = useAuth()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [activeKey, setActiveKey] = useState('students')
  const [studentCount, setStudentCount] = useState(0)

  const load = () => {
    if (!classroomId) return
    classroomService.list({ page: 1, page_size: 100 })
      .then((page) => {
        const found = page.items.find((c) => c.id === Number(classroomId))
        if (!found) {
          message.error('课堂不存在')
          navigate('/admin/classrooms')
          return
        }
        setClassroom(found)
        setStudentCount(found.student_count)
      })
  }

  useEffect(load, [classroomId])

  if (!classroom) {
    return <PageContainer title='课堂工作台'><div style={{ textAlign: 'center', padding: 80, color: '#999' }}>加载中…</div></PageContainer>
  }

  const refreshCode = async () => {
    const result = await classroomService.refreshCode(classroom.id)
    message.success(`新课堂码：${result.join_code}`, 5)
    load()
  }

  const stop = async () => {
    await classroomService.stop(classroom.id)
    message.success('课堂已停课')
    load()
  }

  return (
    <PageContainer
      title={classroom.name}
      extra={
        classroom.status === 'active' && (
          <Space>
            <Button onClick={refreshCode}>
              {classroom.join_code ? '刷新课堂码' : '生成课堂码'}
            </Button>
            <ConfirmButton
              title='停课'
              description='停课后学生立即失去访问（视频/测验全部冻结），确认停课？'
              danger
              onConfirm={stop}
            >
              停课
            </ConfirmButton>
          </Space>
        )
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type='text' icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/classrooms')}>
            返回课堂列表
          </Button>
          {classroom.status === 'active'
            ? <Tag color='green'>进行中</Tag>
            : <Tag color='default'>已停课</Tag>}
        </Space>
      </div>

      {/* ── 统计面板 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6} lg={4}>
          <Card size='small'>
            <Statistic
              title='课堂码'
              value={classroom.status === 'active' ? (classroom.join_code || '未生成') : '已停课'}
              valueStyle={classroom.join_code ? { fontSize: 24, fontWeight: 700, letterSpacing: 3, color: '#1677ff' } : { fontSize: 14 }}
              prefix={classroom.join_code && classroom.status === 'active' ? <CopyOutlined style={{ cursor: 'pointer', fontSize: 16 }} onClick={() => { navigator.clipboard.writeText(classroom.join_code!); message.success('已复制') }} /> : undefined}
            />
            {classroom.join_code_expires_at && classroom.status === 'active' && (
              <Text type='secondary' style={{ fontSize: 12 }}>
                有效期至 {formatDate(classroom.join_code_expires_at)}
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card size='small'>
            <Statistic title='学生' value={studentCount} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card size='small'>
            <Statistic title='视频' value={classroom.video_count} prefix={<VideoCameraOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card size='small'>
            <Statistic title='题目' value={classroom.question_count} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Card size='small'>
            <Statistic title='创建时间' value={formatDate(classroom.created_at)} valueStyle={{ fontSize: 14 }} prefix={<FieldTimeOutlined />} />
          </Card>
        </Col>
        {admin?.role !== 'teacher' && (
          <Col xs={12} sm={6} lg={4}>
            <Card size='small'>
              <Statistic title='老师' value={classroom.teacher_name || '—'} valueStyle={{ fontSize: 14 }} />
            </Card>
          </Col>
        )}
      </Row>

      {/* ── 管理 Tab ── */}
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'students', label: `学生（${studentCount}）`, children: <StudentsTab classroom={classroom} onCount={setStudentCount} /> },
          { key: 'videos', label: '视频', children: <VideosTab classroom={classroom} /> },
          { key: 'questions', label: '随堂题库', children: <QuestionsTab classroom={classroom} /> },
          { key: 'quizzes', label: '测验', children: <QuizzesTab classroom={classroom} /> },
        ]}
      />
    </PageContainer>
  )
}
