import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Upload,
  Typography,
  message,
} from 'antd'
import {
  DeleteOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePermission } from '@/hooks/usePermission'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import {
  courseManagementService,
  readVideoDuration,
} from '@/services/courseManagement'
import type { CourseChapter, CourseItem, CourseUpload } from '@/types/course'

type StageFile = {
  key: string
  file: File
  title: string
  duration: number
  sort_order: number
  status: 'ready' | 'uploading' | 'done' | 'failed'
  percent: number
  error?: string
}

type ReplaceUploadState = {
  chapterId: number
  chapterTitle: string
  fileName: string
  percent: number
  phase: 'uploading' | 'binding' | 'failed'
  error?: string
}

const { Text } = Typography

const courseStatusLabels: Record<CourseItem['status'], { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'green' },
  offline: { label: '已下线', color: 'orange' },
  archived: { label: '已归档', color: 'red' },
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes < 60) return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  return `${hours} 小时 ${minutes % 60} 分`
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function CourseDetailPage() {
  const courseId = Number(useParams().courseId)
  const navigate = useNavigate()
  const canWrite = usePermission('course:write')
  const canPublish = usePermission('course:publish')
  const isSuper = useAuth().admin?.role === 'super_admin'
  const [course, setCourse] = useState<CourseItem | null>(null)
  const [chapters, setChapters] = useState<CourseChapter[]>([])
  const [uploads, setUploads] = useState<CourseUpload[]>([])
  const [stage, setStage] = useState<StageFile[]>([])
  const [queueOpen, setQueueOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()
  const [bindingOpen, setBindingOpen] = useState(false)
  const [selectedUploadIds, setSelectedUploadIds] = useState<number[]>([])
  const [replaceTargetByUploadId, setReplaceTargetByUploadId] = useState<Record<number, number>>({})
  const [categories, setCategories] = useState<{ id: number; name: string; is_active: boolean }[]>([])
  const [bindings, setBindings] = useState<Awaited<ReturnType<typeof courseManagementService.listBindings>>>([])
  const [editingChapter, setEditingChapter] = useState<CourseChapter | null>(null)
  const [chapterForm] = Form.useForm<Pick<CourseChapter, 'title' | 'sort_order'>>()
  const [replaceUpload, setReplaceUpload] = useState<ReplaceUploadState | null>(null)

  const load = useCallback(async () => {
    const [courseResult, chapterPage, uploadList, categoryList, bindingList] =
      await Promise.all([
      courseManagementService.getCourse(courseId),
      courseManagementService.listChapters(courseId, { page: 1, page_size: 100 }),
      courseManagementService.listUploads(courseId),
      courseManagementService.listCategories(),
      courseManagementService.listBindings(courseId),
      ])
    setCourse(courseResult)
    setChapters(chapterPage.items)
    setUploads(uploadList)
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
  }, [courseId, form])

  useEffect(() => { void load() }, [load])

  const pendingUploads = uploads.filter(item => item.kind === 'chapter_video' && item.status === 'pending')
  const completedUploads = uploads.filter(item => item.kind === 'chapter_video' && item.status === 'completed')

  const startUpload = async () => {
    if (stage.length === 0) return
    setUploading(true)
    const queue = [...stage]
    const worker = async () => {
      while (queue.length) {
        const item = queue.shift()
        if (!item) return
        setStage(current => current.map(row => row.key === item.key ? { ...row, status: 'uploading', percent: 0 } : row))
        try {
          await courseManagementService.uploadChapterVideo(
            courseId,
            item.file,
            item.sort_order,
            {
              title: item.title,
              duration: item.duration,
              onProgress: percent => setStage(current => current.map(row =>
                row.key === item.key ? { ...row, percent } : row
              )),
            },
          )
          setStage(current => current.map(row => row.key === item.key ? { ...row, status: 'done' } : row))
        } catch (error) {
          setStage(current => current.map(row => row.key === item.key ? {
            ...row,
            status: 'failed',
            error: error instanceof Error ? error.message : '上传失败',
          } : row))
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setUploading(false)
    setStage(current => current.filter(row => row.status !== 'done'))
    await load()
    message.success('本轮上传处理完成')
  }

  const chapterColumns: ColumnsType<CourseChapter> = [
    { title: 'ID', dataIndex: 'id', width: 64, align: 'center' },
    { title: '课程名', dataIndex: 'title', ellipsis: true, render: value => <Text strong>{value}</Text> },
    { title: '文件', dataIndex: 'original_filename', ellipsis: true, render: value => <Text type="secondary">{value}</Text> },
    { title: '时长', dataIndex: 'duration', width: 110, render: value => formatDuration(value) },
    { title: '大小', dataIndex: 'size_bytes', width: 100, align: 'right', render: value => formatSize(value) },
    { title: '权限', width: 88, align: 'center', render: (_, record) => <Tag color={course && record.sort_order <= course.preview_chapter_count ? 'green' : 'blue'}>{course && record.sort_order <= course.preview_chapter_count ? '试看' : '完整'}</Tag> },
    {
      title: '操作',
      width: 230,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={async () => {
            chapterForm.setFieldsValue({
              title: record.title,
              sort_order: record.sort_order,
            })
            setEditingChapter(record)
          }}>编辑</Button>
          <Upload showUploadList={false} accept=".mp4,.mov,.mkv" beforeUpload={file => {
            void (async () => {
              setReplaceUpload({
                chapterId: record.id,
                chapterTitle: record.title,
                fileName: file.name,
                percent: 0,
                phase: 'uploading',
              })
              try {
                const uploaded = await courseManagementService.uploadChapterVideo(
                  courseId,
                  file,
                  record.sort_order,
                  {
                    title: record.title,
                    onProgress: percent => setReplaceUpload(current =>
                      current && current.chapterId === record.id ? { ...current, percent } : current
                    ),
                  },
                )
                setReplaceUpload(current =>
                  current && current.chapterId === record.id
                    ? { ...current, percent: 100, phase: 'binding' }
                    : current
                )
                await courseManagementService.replaceChapterVideo(courseId, record.id, uploaded.id)
                message.success('视频已替换')
                await load()
                setReplaceUpload(null)
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '替换失败'
                message.error(errorMessage)
                setReplaceUpload(current =>
                  current && current.chapterId === record.id
                    ? { ...current, phase: 'failed', error: errorMessage }
                    : current
                )
              }
            })()
            return false
          }}>
            <Button type="link" size="small">替换视频</Button>
          </Upload>
          <ConfirmButton title="删除课程视频" description="已有学习进度的课程视频不能删除，删除后文件同步清理。" danger type="link" size="small" onConfirm={async () => {
            await courseManagementService.deleteChapter(courseId, record.id)
            await load()
          }}>删除</ConfirmButton>
        </Space>
      ),
    },
  ]

  const stageColumns: ColumnsType<StageFile> = [
    { title: '排序', dataIndex: 'sort_order', width: 80, render: (value, record) => <InputNumber min={1} precision={0} value={value} disabled={record.status === 'uploading'} onChange={next => setStage(current => current.map(row => row.key === record.key ? { ...row, sort_order: next ?? 1 } : row))} /> },
    { title: '课程名', dataIndex: 'title', render: (value, record) => <Input value={value} disabled={record.status === 'uploading'} onChange={event => setStage(current => current.map(row => row.key === record.key ? { ...row, title: event.target.value } : row))} /> },
    {
      title: '上传进度',
      width: 180,
      render: (_, record) => record.status === 'failed'
        ? <Tag color="red">{record.error ?? '失败'}</Tag>
        : (
          <Space size={8}>
            <Progress
              percent={record.percent}
              size="small"
              status={record.status === 'uploading' ? 'active' : record.status === 'done' ? 'success' : 'normal'}
              style={{ width: 96, marginBottom: 0 }}
            />
            <Text type="secondary">{record.status === 'uploading' ? '上传中' : record.status === 'done' ? '完成' : '待上传'}</Text>
          </Space>
        ),
    },
    {
      title: '操作',
      width: 90,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={record.status === 'uploading'}
          onClick={() => setStage(current => current.filter(row => row.key !== record.key))}
        >
          取消
        </Button>
      ),
    },
  ]

  const pendingColumns: ColumnsType<CourseUpload> = [
    { title: '课程名', dataIndex: 'title', ellipsis: true, render: value => <Text strong>{value}</Text> },
    { title: '文件', dataIndex: 'filename', ellipsis: true, render: value => <Text type="secondary">{value}</Text> },
    { title: '声明大小', dataIndex: 'size_bytes', width: 110, align: 'right', render: value => formatSize(value) },
    { title: '过期时间', dataIndex: 'expires_at', width: 180, render: value => <Text type="secondary">{value}</Text> },
    {
      title: '操作',
      width: 170,
      render: (_, record) => (
        <Space size={4}>
          <Upload showUploadList={false} accept=".mp4,.mov,.mkv" beforeUpload={async file => {
            try {
              await courseManagementService.resumeChapterVideo(record, file)
              message.success('续传完成')
              await load()
            } catch (error) {
              message.error(error instanceof Error ? error.message : '续传失败')
            }
            return false
          }}>
            <Button type="link" size="small">选择原文件续传</Button>
          </Upload>
          <ConfirmButton title="放弃上传" description="将中止 OSS 分片并删除未绑定对象。" danger type="link" size="small" onConfirm={async () => { await courseManagementService.abortUpload(record.id); await load() }}>放弃</ConfirmButton>
        </Space>
      ),
    },
  ]

  const completedColumns: ColumnsType<CourseUpload> = [
    { title: '课程名', dataIndex: 'title', ellipsis: true, render: value => <Text strong>{value}</Text> },
    { title: '文件', dataIndex: 'filename', ellipsis: true, render: value => <Text type="secondary">{value}</Text> },
    { title: '时长', dataIndex: 'duration', width: 110, render: value => formatDuration(value ?? 0) },
    { title: '排序', dataIndex: 'sort_order', width: 70, align: 'center' },
    { title: '状态', dataIndex: 'status', width: 95, align: 'center', render: () => <Tag color="green">待确认</Tag> },
    {
      title: '操作',
      width: 260,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={async () => {
              await courseManagementService.batchCreateChapters(courseId, [record.id])
              message.success('课程名已创建')
              await load()
            }}
          >
            创建课程名
          </Button>
          <Select
            size="small"
            placeholder="替换已有课程名"
            style={{ width: 130 }}
            value={replaceTargetByUploadId[record.id]}
            options={[...chapters].sort((a, b) => a.id - b.id).map(chapter => ({
              value: chapter.id,
              label: `#${chapter.id} ${chapter.title}`,
            }))}
            onChange={value => setReplaceTargetByUploadId(current => ({ ...current, [record.id]: value }))}
          />
          <Button
            type="link"
            size="small"
            disabled={!replaceTargetByUploadId[record.id]}
            onClick={async () => {
              const targetId = replaceTargetByUploadId[record.id]
              if (!targetId) return
              await courseManagementService.replaceChapterVideo(courseId, targetId, record.id)
              message.success('课程视频已替换')
              await load()
            }}
          >
            替换
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer
      title={course ? `课程工作台 · ${course.title}` : '课程工作台'}
      extra={(
        <>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button onClick={() => navigate('/admin/courses')}>返回列表</Button>
          {canPublish && course?.status === 'draft' && (
            <ConfirmButton title="发布课程" type="primary" description="发布前会校验封面、课程名和试看集数。" onConfirm={async () => { await courseManagementService.changeLifecycle(courseId, 'publish'); message.success('课程已发布'); await load() }}>
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
                  {course.category} · {course.teacher_name || '未设置讲师'} · 试看 {course.preview_chapter_count} 集
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
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="已创建课程名" value={chapters.length} suffix="个" valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="本地待上传" value={stage.length} suffix="个" valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="断点续传" value={pendingUploads.length} suffix="个" valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="待确认视频" value={completedUploads.length} suffix="个" valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
      </Row>
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
                  <Form.Item name="preview_chapter_count" label="试看集数"><InputNumber min={0} precision={0} /></Form.Item>
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
                  <Upload showUploadList={false} accept=".jpg,.jpeg,.png,.webp" beforeUpload={async file => {
                    const uploaded = await courseManagementService.uploadCover(file)
                    await courseManagementService.updateCourse(courseId, { cover_upload_id: uploaded.id })
                    message.success('封面已替换')
                    await load()
                    return false
                  }}>
                    <Button icon={<UploadOutlined />}>替换 16:9 封面</Button>
                  </Upload>
                </Space>
              </Form>
            </Card>
          ),
        },
        {
          key: 'chapters',
          label: `课程视频 (${chapters.length})`,
          children: (
            <>
              <Alert
                type="warning"
                showIcon
                message="支持 MP4 / MOV / MKV，最大 5GB；非 MP4 可能无法在微信小程序播放。"
                style={{ marginBottom: 12 }}
              />
              <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                <Upload
                  multiple
                  maxCount={50}
                  accept=".mp4,.mov,.mkv"
                  showUploadList={false}
                  disabled={!canWrite || uploading}
                  beforeUpload={() => false}
                  onChange={async ({ fileList }) => {
                    const current = new Map(stage.map(item => [item.file.name + item.file.size + item.file.lastModified, item]))
                    const next: StageFile[] = []
                    for (let index = 0; index < fileList.length; index += 1) {
                      const uploadFile = fileList[index]
                      const file = uploadFile.originFileObj
                      if (!file) continue
                      const key = `${file.name}${file.size}${file.lastModified}`
                      if (current.has(key)) {
                        next.push(current.get(key)!)
                        continue
                      }
                      let duration: number
                      try {
                        duration = await readVideoDuration(file)
                      } catch {
                        message.error(`无法读取「${file.name}」的视频时长，请更换浏览器或视频文件`)
                        continue
                      }
                      next.push({
                        key,
                        file,
                        title: file.name.replace(/\.[^.]+$/, ''),
                        duration,
                        sort_order: chapters.length + index + 1,
                        status: 'ready',
                        percent: 0,
                      })
                    }
                    setStage(next.slice(0, 50))
                    if (next.length > 0) setQueueOpen(true)
                  }}
                >
                  <Button icon={<PlayCircleOutlined />} disabled={!canWrite || uploading}>选择视频</Button>
                </Upload>
                {stage.length > 0 && (
                  <Button type='primary' onClick={startUpload} loading={uploading} disabled={!canWrite}>
                    上传 {stage.length} 个视频
                  </Button>
                )}
              </div>

              <Spin spinning={false}>
                <Row gutter={[16, 16]}>
                  {[...chapters].sort((a, b) => a.sort_order - b.sort_order).map((ch) => (
                    <Col key={ch.id} xs={24} sm={12} lg={8}>
                      <Card size='small' style={{ height: '100%' }}
                        actions={canWrite ? [
                          <Button key='edit' type='text' size='small' onClick={() => {
                            chapterForm.setFieldsValue({ title: ch.title, sort_order: ch.sort_order })
                            setEditingChapter(ch)
                          }}>编辑</Button>,
                          <Upload key='replace' showUploadList={false} accept='.mp4,.mov,.mkv' beforeUpload={file => {
                            void (async () => {
                              setReplaceUpload({ chapterId: ch.id, chapterTitle: ch.title, fileName: file.name, percent: 0, phase: 'uploading' })
                              try {
                                const uploaded = await courseManagementService.uploadChapterVideo(courseId, file, ch.sort_order, {
                                  title: ch.title,
                                  onProgress: percent => setReplaceUpload(current => current && current.chapterId === ch.id ? { ...current, percent } : current),
                                })
                                await courseManagementService.replaceChapterVideo(courseId, ch.id, uploaded.id)
                                message.success('视频已替换')
                                await load()
                                setReplaceUpload(null)
                              } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : '替换失败'
                                message.error(errorMessage)
                                setReplaceUpload(current => current && current.chapterId === ch.id ? { ...current, phase: 'failed', error: errorMessage } : current)
                              }
                            })()
                            return false
                          }}>
                            <Button type='text' size='small'>替换</Button>
                          </Upload>,
                          <ConfirmButton key='del' title='删除' description='删除后文件同步清理，确认？' danger type='text' size='small'
                            onConfirm={async () => { await courseManagementService.deleteChapter(courseId, ch.id); await load() }}>
                            删除
                          </ConfirmButton>,
                        ] : undefined}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <PlayCircleOutlined style={{ fontSize: 36, color: course && ch.sort_order <= course.preview_chapter_count ? '#52c41a' : '#1677ff' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong ellipsis style={{ display: 'block', fontSize: 14 }}>
                              {ch.sort_order}. {ch.title}
                            </Text>
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              {formatDuration(ch.duration)} · {formatSize(ch.size_bytes)}
                            </Text>
                          </div>
                        </div>
                        {course && ch.sort_order <= course.preview_chapter_count && (
                          <Tag color='green' style={{ marginTop: 8 }}>试看</Tag>
                        )}
                      </Card>
                    </Col>
                  ))}
                </Row>
                {chapters.length === 0 && (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无课程视频，选择视频文件上传' style={{ padding: 40 }} />
                )}
              </Spin>

              <Drawer
                title={`上传队列（${stage.length}）`}
                open={queueOpen}
                onClose={() => setQueueOpen(false)}
                width={560}
                styles={{ body: { paddingTop: 12 } }}
              >
                <Table
                  rowKey='key'
                  size='small'
                  columns={stageColumns}
                  dataSource={stage}
                  pagination={false}
                  scroll={{ x: 480 }}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='队列为空，选择视频文件开始' /> }}
                />
              </Drawer>
            </>
          ),
        },
        {
          key: 'pending',
          label: `待完成上传 (${pendingUploads.length})`,
          children: (
            <Card size="small" title="断点续传队列">
              <Table
                rowKey="id"
                columns={pendingColumns}
                dataSource={pendingUploads}
                pagination={false}
                scroll={{ x: 820 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有待续传的视频" /> }}
              />
            </Card>
          ),
        },
        {
          key: 'confirm',
          label: `待确认课程名 (${completedUploads.length})`,
          children: (
            <Card
              size="small"
              title="上传完成待确认"
              extra={(
                <Button
                  type="primary"
                  disabled={selectedUploadIds.length === 0}
                  onClick={async () => {
                    await courseManagementService.batchCreateChapters(courseId, selectedUploadIds)
                    setSelectedUploadIds([])
                    message.success('课程名已创建')
                    await load()
                  }}
                >
                  创建所选课程名
                </Button>
              )}
            >
              <Table
                rowKey="id"
                columns={completedColumns}
                dataSource={completedUploads}
                pagination={false}
                scroll={{ x: 880 }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有待确认的视频" /> }}
                rowSelection={{ selectedRowKeys: selectedUploadIds, onChange: keys => setSelectedUploadIds(keys as number[]) }}
              />
            </Card>
          ),
        },
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
                <Alert type="info" showIcon message="题库绑定和回补需要超级管理员操作。" />
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
      <Modal
        title="编辑课程名"
        open={editingChapter !== null}
        onOk={async () => {
          if (!editingChapter) return
          const values = await chapterForm.validateFields()
          await courseManagementService.updateChapter(courseId, editingChapter.id, values)
          setEditingChapter(null)
          await load()
        }}
        onCancel={() => setEditingChapter(null)}
        destroyOnClose
      >
        <Form form={chapterForm} layout="vertical">
          <Form.Item name="title" label="课程名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber min={1} precision={0} /></Form.Item>
        </Form>
      </Modal>
      <Modal
        title="替换课程视频"
        open={replaceUpload !== null}
        closable={replaceUpload?.phase === 'failed'}
        keyboard={replaceUpload?.phase === 'failed'}
        maskClosable={replaceUpload?.phase === 'failed'}
        onCancel={() => setReplaceUpload(null)}
        footer={replaceUpload?.phase === 'failed' ? (
          <Button onClick={() => setReplaceUpload(null)}>关闭</Button>
        ) : null}
        destroyOnClose
      >
        {replaceUpload && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="课程名">{replaceUpload.chapterTitle}</Descriptions.Item>
              <Descriptions.Item label="新视频">{replaceUpload.fileName}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {replaceUpload.phase === 'uploading' && '正在上传新视频'}
                {replaceUpload.phase === 'binding' && '上传完成，正在绑定课程视频'}
                {replaceUpload.phase === 'failed' && (replaceUpload.error ?? '替换失败')}
              </Descriptions.Item>
            </Descriptions>
            {replaceUpload.phase === 'failed'
              ? <Alert type="error" showIcon message={replaceUpload.error ?? '替换失败，旧视频未被替换。'} />
              : <Progress percent={replaceUpload.phase === 'binding' ? 100 : replaceUpload.percent} status={replaceUpload.phase === 'binding' ? 'active' : 'active'} />}
          </Space>
        )}
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
