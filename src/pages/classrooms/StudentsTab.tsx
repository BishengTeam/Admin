import { useEffect, useState } from 'react'
import { Table, Button, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ConfirmButton } from '@/components/ConfirmButton'
import { classroomService } from '@/services/classroom'
import { formatDate } from '@/utils/format'
import type { Classroom, ClassroomStudent } from '@/types/classroom'

const { Text } = Typography

export default function StudentsTab({ classroom, onCount }: {
  classroom: Classroom
  onCount: (n: number) => void
}) {
  const [students, setStudents] = useState<ClassroomStudent[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    classroomService.listStudents(classroom.id)
      .then((items) => { setStudents(items); onCount(items.length) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [classroom.id])

  const remove = async (userId: number) => {
    await classroomService.removeStudent(classroom.id, userId)
    message.success('学生已移除')
    load()
  }

  const columns: ColumnsType<ClassroomStudent> = [
    { title: '姓名', dataIndex: 'real_name', width: 160 },
    { title: '用户 ID', dataIndex: 'user_id', width: 100 },
    { title: '加入时间', dataIndex: 'joined_at', width: 180, render: (t: string) => formatDate(t) },
    {
      title: '操作', width: 100,
      render: (_, r) => (
        <ConfirmButton
          title='移除学生' description='移除后该学生立即失去课堂访问，确认？'
          danger type='link' size='small'
          onConfirm={() => remove(r.user_id)}
        >
          移除
        </ConfirmButton>
      ),
    },
  ]

  return (
    <>
      <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
        学生使用课堂码自助加入（需完成实名认证）；课堂码 30 分钟过期，过期后在课堂列表刷新。
      </Text>
      <Table rowKey='id' columns={columns} dataSource={students} loading={loading} pagination={false} />
    </>
  )
}
