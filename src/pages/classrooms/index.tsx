import { useState } from 'react'
import { Button, Input, Modal, Form, Tag, Space, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined, TeamOutlined, VideoCameraOutlined, FileTextOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { Table } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { classroomService } from '@/services/classroom'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/format'
import ClassroomWorkbench from './Workbench'
import type { Classroom } from '@/types/classroom'

const { Text } = Typography

export default function ClassroomManagement() {
  const { admin } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Classroom | null>(null)
  const [workbench, setWorkbench] = useState<Classroom | null>(null)
  const [form] = Form.useForm<{ name: string }>()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => classroomService.list(page),
    [],
  )

  const handleAdd = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleOk = async () => {
    const { name } = await form.validateFields()
    if (editing) {
      await classroomService.rename(editing.id, name)
      message.success('已更新')
    } else {
      await classroomService.create(name)
      message.success('课堂已创建，点击「课堂码」生成加入码')
    }
    setModalOpen(false)
    refresh()
  }

  const handleRefreshCode = async (id: number) => {
    const result = await classroomService.refreshCode(id)
    message.success(`新课堂码：${result.join_code}（30 分钟内有效）`, 5)
    refresh()
  }

  const handleStop = async (id: number) => {
    await classroomService.stop(id)
    message.success('课堂已停课，学生访问已冻结')
    refresh()
  }

  const columns: ColumnsType<Classroom> = [
    { title: '课堂', dataIndex: 'name', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: string) => v === 'active'
        ? <Tag color='green'>进行中</Tag>
        : <Tag color='default'>已停课</Tag>,
    },
    {
      title: '课堂码', width: 140,
      render: (_, r) => r.status === 'active'
        ? r.join_code
          ? <Text copyable={{ text: r.join_code }} strong style={{ fontSize: 16, letterSpacing: 2 }}>{r.join_code}</Text>
          : <Text type='secondary'>未生成</Text>
        : <Text type='secondary'>—</Text>,
    },
    {
      title: '学生', width: 70, align: 'center',
      render: (_, r) => <span><TeamOutlined /> {r.student_count}</span>,
    },
    {
      title: '内容', width: 120,
      render: (_, r) => (
        <Space size={12}>
          <span><VideoCameraOutlined /> {r.video_count}</span>
          <span><FileTextOutlined /> {r.question_count}</span>
        </Space>
      ),
    },
    {
      title: '测验', width: 90,
      render: (_, r) => r.ongoing_quiz ? <Tag color='orange'>进行中</Tag> : <Text type='secondary'>—</Text>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
    {
      title: '操作', width: 320,
      render: (_, r) => (
        <Space size={4}>
          <Button type='link' size='small' onClick={() => setWorkbench(r)}>工作台</Button>
          {r.status === 'active' && (
            <>
              <Button type='link' size='small' onClick={() => handleRefreshCode(r.id)}>
                {r.join_code ? '刷新码' : '生成码'}
              </Button>
              <ConfirmButton
                title='停课'
                description='停课后学生立即失去访问（视频/测验全部冻结），确认停课？'
                danger type='link' size='small'
                onConfirm={() => handleStop(r.id)}
              >
                停课
              </ConfirmButton>
            </>
          )}
        </Space>
      ),
    },
  ]

  if (workbench) {
    return <ClassroomWorkbench classroom={workbench} onBack={() => { setWorkbench(null); refresh() }} />
  }

  return (
    <PageContainer
      title={admin?.role === 'teacher' ? '我的课堂' : '课堂管理'}
      extra={<Button type='primary' icon={<PlusOutlined />} onClick={handleAdd}>新建课堂</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>刷新</Button>
        <Text type='secondary'>共 {data?.total ?? 0} 个课堂</Text>
      </Space>
      <Table rowKey='id' columns={columns} dataSource={data?.items} loading={loading} pagination={pagination} />

      <Modal
        title={editing ? '编辑课堂' : '新建课堂'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout='vertical' style={{ marginTop: 16 }}>
          <Form.Item name='name' label='课堂名称' rules={[{ required: true, message: '请输入课堂名称' }]}>
            <Input placeholder='如：9月 H3C 晚班' maxLength={128} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
