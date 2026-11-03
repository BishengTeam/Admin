import CourseContent from './CourseContent'
import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Upload,
  Typography,
  message,
} from 'antd'
import {
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { CoverCropper } from '@/components/CoverCropper'
import { usePermission } from '@/hooks/usePermission'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import {
  courseManagementService,
} from '@/services/courseManagement'
import type { CourseItem } from '@/types/course'

const { Text } = Typography

const courseStatusLabels: Record<CourseItem['status'], { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'green' },
  offline: { label: '已下线', color: 'orange' },
  archived: { label: '已归档', color: 'red' },
}

export default function CourseDetailPage() {
  const courseId = Number(useParams().courseId)
  const navigate = useNavigate()
  const canWrite = usePermission('course:write')
  const canPublish = usePermission('course:publish')
  const isSuper = useAuth().admin?.role === 'super_admin'
  const [course, setCourse] = useState<CourseItem | null>(null)
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null)
  const [form] = Form.useForm()
  const [bindingOpen, setBindingOpen] = useState(false)
  const [categories, setCategories] = useState<{ id: number; name: string; is_active: boolean }[]>([])
  const [bindings, setBindings] = useState<Awaited<ReturnType<typeof courseManagementService.listBindings>>>([])

  const load = useCallback(async () => {
    const [courseResult, categoryList, bindingList] =
      await Promise.all([
      courseManagementService.getCourse(courseId),
      courseManagementService.listCategories(),
      isSuper ? courseManagementService.listBindings(courseId) : Promise.resolve([]),
      ])
    setCourse(courseResult)
    setCategories(categoryList)
    setBindings(bindingList)
    form.setFieldsValue({
      title: courseResult.title,
      category: courseResult.category,
      description: courseResult.description,
      preview_chapter_count: courseResult.preview_chapter_count,
      teacher_name: courseResult.teacher_name,
      teacher_contact: courseResult.teacher_contact,
      price_yuan: courseResult.price_yuan,
    })
  }, [courseId, form, isSuper])

  useEffect(() => { void load() }, [load])

  return (
    <PageContainer
      title={course ? `课程工作台 · ${course.title}` : '课程工作台'}
      extra={(
        <>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button onClick={() => navigate('/admin/courses')}>返回列表</Button>
          {canPublish && course?.status === 'draft' && (
            <ConfirmButton title="发布课程" type="primary" description="发布前会校验封面、课程名和免费预览章节数。" onConfirm={async () => { await courseManagementService.changeLifecycle(courseId, 'publish'); message.success('课程已发布'); await load() }}>
              发布课程
            </ConfirmButton>
          )}
          {canPublish && course?.status === 'published' && (
            <ConfirmButton title="下线课程" danger description="下线后不能新购，已购用户继续学习。" onConfirm={async () => { await courseManagementService.changeLifecycle(courseId, 'offline'); await load() }}>
              下线
            </ConfirmButton>
          )}
          {isSuper && course && ['published', 'offline'].includes(course.status) && (
            <ConfirmButton title="归档课程" description="归档后不再新售，已购用户保留学习入口。" onConfirm={async () => { await courseManagementService.changeLifecycle(course.id, 'archive'); await load() }}>
              归档
            </ConfirmButton>
          )}
          {isSuper && course && ['offline', 'archived'].includes(course.status) && (
            <ConfirmButton title="恢复发布" description="恢复后课程重新开放购买。" onConfirm={async () => { await courseManagementService.changeLifecycle(course.id, 'restore'); await load() }}>
              恢复
            </ConfirmButton>
          )}
        </>
      )}
    >
      {course && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space align="start" size={20} wrap>
            <Image
              src={course.cover_url}
              width={168}
              height={94}
              preview={false}
              style={{ borderRadius: 8, objectFit: 'cover' }}
            />
            <div style={{ minWidth: 280, flex: 1 }}>
              <Space wrap size={8}>
                <Text strong style={{ fontSize: 18 }}>{course.title}</Text>
                <Tag color={courseStatusLabels[course.status].color}>
                  {courseStatusLabels[course.status].label}
                </Tag>
              </Space>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  {course.category} · {course.teacher_name || '未设置讲师'} · 免费预览 {course.preview_chapter_count} 章
                </Text>
              </div>
              <div style={{ marginTop: 6 }}>
                <Text strong>{course.price_yuan}</Text>
                <Text type="secondary"> 元 / 门</Text>
              </div>
            </div>
          </Space>
        </Card>
      )}
      <CoverCropper open={Boolean(coverCropFile)} file={coverCropFile} crop={{ width: 1280, height: 720, title: '课程封面' }}
        onCancel={() => setCoverCropFile(null)} onCropped={async file => { const upload = await courseManagementService.uploadCover(file); await courseManagementService.updateCourse(courseId, { cover_upload_id: upload.id }); await load() }} />
      <Tabs items={[
        {
          key: 'basic',
          label: '基本信息',
          children: (
            <Card size="small" title="课程资料" extra={<Text type="secondary">价格仅超级管理员可修改</Text>}>
              <Form form={form} layout="vertical" disabled={!canWrite} style={{ maxWidth: 860 }}>
                <Space size={16} wrap>
                  <Form.Item name="title" label="课程标题" rules={[{ required: true }]} style={{ minWidth: 360 }}><Input /></Form.Item>
                  <Form.Item name="category" label="类目" rules={[{ required: true }]} style={{ width: 180 }}>
                    <Select options={categories.filter(item => item.is_active).map(item => ({ value: item.name, label: item.name }))} />
                  </Form.Item>
                </Space>
                <Form.Item name="description" label="简介"><Input.TextArea rows={4} /></Form.Item>
                <Space size={16} wrap>
                  <Form.Item name="price_yuan" label="价格（元）">
                    <Input disabled={!isSuper} style={{ width: 140 }} />
                  </Form.Item>
                  <Form.Item name="preview_chapter_count" label="免费预览章节数"><InputNumber min={0} precision={0} /></Form.Item>
                  <Form.Item name="teacher_name" label="讲师"><Input /></Form.Item>
                  <Form.Item name="teacher_contact" label="联系方式"><Input /></Form.Item>
                </Space>
                <Space>
                  <Button type="primary" onClick={async () => {
                    const values = await form.validateFields()
                    const payload = { ...values } as Record<string, unknown>
                    delete payload.price_yuan
                    await courseManagementService.updateCourse(courseId, payload)
                    if (isSuper && values.price_yuan) await courseManagementService.updatePrice(courseId, values.price_yuan)
                    message.success('课程信息已保存')
                    await load()
                  }}>保存基本信息</Button>
                  <Upload showUploadList={false} accept=".jpg,.jpeg,.png,.webp" beforeUpload={file => {
                    setCoverCropFile(file)
                    return false
                  }}>
                    <Button icon={<UploadOutlined />}>替换 16:9 封面（手动裁剪）</Button>
                  </Upload>
                </Space>
              </Form>
            </Card>
          ),
        },
        { key: 'chapters', label: '课程内容', children: <CourseContent courseId={courseId} canWrite={canWrite} /> },
        {
          key: 'bindings',
          label: '赠送题库',
          children: (
            <>
              {isSuper ? (
                <Card size="small" title="题库权益" extra={<Button type="primary" size="small" onClick={() => setBindingOpen(true)}>绑定题库</Button>}>
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={bindings}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂未绑定题库" /> }}
                    columns={[
                      { title: '题库', dataIndex: 'library_name', render: value => <Text strong>{value}</Text> },
                      { title: '编码', dataIndex: 'library_code' },
                      { title: '状态', dataIndex: 'status', width: 90, render: value => <Tag color={value === 'active' ? 'green' : 'default'}>{value === 'active' ? '有效' : '停用'}</Tag> },
                      {
                        title: '操作',
                        width: 100,
                        render: (_, record) => (
                          <ConfirmButton
                            title={record.status === 'active' ? '停用绑定' : '启用绑定'}
                            danger={record.status === 'active'}
                            description={record.status === 'active' ? '停用后将撤销无其他有效来源的用户权益。' : '启用后将为已购用户排队回补权益。'}
                            type="link"
                            size="small"
                            onConfirm={async () => {
                              await courseManagementService.setBindingStatus(record.id, record.status === 'active' ? 'inactive' : 'active')
                              setBindings(await courseManagementService.listBindings(courseId))
                            }}
                          >
                            {record.status === 'active' ? '停用' : '启用'}
                          </ConfirmButton>
                        ),
                      },
                    ]}
                  />
                </Card>
              ) : (
                null
              )}
            </>
          ),
        },
        {
          key: 'jobs',
          label: '权益任务',
          children: <CourseJobs courseId={courseId} />,
        },
      ]} />

      <Modal title="绑定赠送题库" open={bindingOpen} onCancel={() => setBindingOpen(false)} footer={null} destroyOnClose>
        <BindingWizard courseId={courseId} onDone={async () => { setBindingOpen(false); await load() }} />
      </Modal>
    </PageContainer>
  )
}

function CourseJobs({ courseId }: { courseId: number }) {
  const isSuper = useAuth().admin?.role === 'super_admin'
  const { data, loading, pagination, refresh } = usePagination(
    (page, signal) => courseManagementService.listJobs(courseId, page, signal),
    [courseId],
  )

  return (
    <Card size="small" title="权益回补 / 撤销任务" extra={<Button size="small" onClick={refresh}>刷新任务</Button>}>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        pagination={pagination}
        dataSource={data?.items ?? []}
        scroll={{ x: 760 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无权益任务" /> }}
        columns={[
          { title: '任务 ID', dataIndex: 'id', width: 90 },
          { title: '动作', dataIndex: 'action', width: 90 },
          { title: '状态', dataIndex: 'status', width: 100 },
          { title: '总数', dataIndex: 'total_count', width: 80 },
          { title: '成功', dataIndex: 'success_count', width: 80 },
          { title: '失败', dataIndex: 'failure_count', width: 80 },
          { title: '完成时间', dataIndex: 'finished_at', width: 180, render: value => value || '-' },
          {
            title: '操作',
            width: 90,
            render: (_, record) => isSuper && ['partial', 'failed'].includes(record.status) ? (
              <Button type="link" size="small" onClick={async () => { await courseManagementService.retryJob(record.id); refresh() }}>重试</Button>
            ) : '-',
          },
        ]}
      />
    </Card>
  )
}

function BindingWizard({ courseId, onDone }: { courseId: number; onDone: () => void | Promise<void> }) {
  const [libraries, setLibraries] = useState<{ id: number; name: string }[]>([])
  const [libraryId, setLibraryId] = useState<number>()
  const [impact, setImpact] = useState<Awaited<ReturnType<typeof courseManagementService.previewBinding>> | null>(null)

  useEffect(() => {
    void courseManagementService.listBindableLibraries().then(result => {
      setLibraries(result.map(item => ({ id: item.id, name: item.name })))
    })
  }, [])

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        showSearch
        optionFilterProp="label"
        placeholder="选择已发布课程权益题库"
        value={libraryId}
        onChange={async value => {
          setLibraryId(value)
          setImpact(await courseManagementService.previewBinding(courseId, value))
        }}
        options={libraries.map(item => ({ value: item.id, label: `${item.name} (#${item.id})` }))}
        style={{ width: '100%' }}
      />
      {impact && (
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="已购用户">{impact.active_enrollment_count}</Descriptions.Item>
          <Descriptions.Item label="待回补">{impact.candidates_to_backfill}</Descriptions.Item>
          <Descriptions.Item label="进行中题库会话">{impact.active_session_count}</Descriptions.Item>
          <Descriptions.Item label="阻断">{impact.blockers.join('、') || '无'}</Descriptions.Item>
        </Descriptions>
      )}
      <Button
        type="primary"
        disabled={!impact?.can_execute}
        onClick={async () => {
          if (!libraryId) return
          await courseManagementService.createBinding(courseId, libraryId)
          message.success('绑定已创建，回补任务已排队')
          await onDone()
        }}
      >
        确认绑定并回补
      </Button>
    </Space>
  )
}
