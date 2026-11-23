import { useState } from 'react'
import { Button, Input, Modal, Form, Tag, Typography, message, Row, Col, Card, Spin } from 'antd'
import { DeleteOutlined, PlusOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { ConfirmButton } from '@/components/ConfirmButton'
import { PageContainer } from '@/components/PageContainer'
import { usePagination } from '@/hooks/usePagination'
import { classroomService } from '@/services/classroom'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom } from '@/types/classroom'

const { Text } = Typography

export default function ClassroomManagement() {
  const { admin } = useAuth()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<{ name: string }>()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => classroomService.list(page),
    [],
  )

  const handleAdd = () => {
    form.resetFields()
    setModalOpen(true)
  }

  const handleOk = async () => {
    const { name } = await form.validateFields()
    await classroomService.create(name)
    message.success('课堂已创建，进入工作台生成课堂码')
    setModalOpen(false)
    refresh()
  }

  const handleDelete = async (classroom: Classroom) => {
    await classroomService.remove(classroom.id)
    message.success(`「${classroom.name}」已删除，可在回收站恢复`)
    refresh()
  }

  return (
    <PageContainer
      title={admin?.role === 'teacher' ? '我的课堂' : '教学课堂'}
      extra={<Button type='primary' icon={<PlusOutlined />} onClick={handleAdd}>新建课堂</Button>}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type='secondary'>共 {data?.total ?? 0} 个课堂</Text>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {(data?.items ?? []).map((c) => (
            <Col key={c.id} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                onClick={() => navigate(`/admin/classrooms/${c.id}`, {
                  state: { breadcrumbTitle: c.name },
                })}
                style={{ height: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text strong style={{ fontSize: 16, flex: 1, marginRight: 12 }}>{c.name}</Text>
                  {c.status === 'active'
                    ? <Tag color='green'>进行中</Tag>
                    : <Tag color='default'>已停课</Tag>}
                </div>
                {admin?.role !== 'teacher' && (
                  <Text type='secondary' style={{ display: 'block', marginTop: 8 }}>
                    <TeamOutlined /> {c.teacher_name || '—'}
                  </Text>
                )}
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div onClick={(event) => event.stopPropagation()}>
                    <ConfirmButton
                      title='删除课堂'
                      description={`删除后学生端立即看不到「${c.name}」，课堂数据与学生记录保留。30 天内可在「回收站 → 教学课堂」恢复，恢复后状态不变。`}
                      type='text'
                      danger
                      size='small'
                      icon={<DeleteOutlined />}
                      onConfirm={() => handleDelete(c)}
                    >
                      删除
                    </ConfirmButton>
                  </div>
                  <Text type='secondary'>
                    进入工作台 <RightOutlined style={{ fontSize: 12 }} />
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
        {!loading && (data?.items ?? []).length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
            暂无课堂，点击右上角「新建课堂」开始
          </div>
        )}
      </Spin>

      {pagination.total > (data?.page_size ?? 20) && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button onClick={() => pagination.onChange?.((data?.page ?? 1) + 1, data?.page_size ?? 20)}>
            加载更多
          </Button>
        </div>
      )}

      <Modal
        title='新建课堂'
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
