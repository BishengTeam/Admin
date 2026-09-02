import { useEffect, useState } from 'react'
import { Button, Tabs, Typography, Space } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import StudentsTab from './StudentsTab'
import VideosTab from './VideosTab'
import QuestionsTab from './QuestionsTab'
import QuizzesTab from './QuizzesTab'
import type { Classroom } from '@/types/classroom'

const { Text } = Typography

interface Props {
  classroom: Classroom
  onBack: () => void
}

export default function ClassroomWorkbench({ classroom, onBack }: Props) {
  const [activeKey, setActiveKey] = useState('students')
  const [studentCount, setStudentCount] = useState(classroom.student_count)

  useEffect(() => {
    setStudentCount(classroom.student_count)
  }, [classroom.id])

  return (
    <PageContainer
      title={classroom.name}
      extra={
        <Space>
          <Button type='text' icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>
          <Text type='secondary'>学生 {studentCount} 人 · 视频 {classroom.video_count} · 题目 {classroom.question_count}</Text>
        </Space>
      }
    >
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
