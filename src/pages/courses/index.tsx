import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from 'antd'
import {
  ApartmentOutlined,
  BookOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { RcFile } from 'antd/es/upload/interface'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { usePagination } from '@/hooks/usePagination'
import { courseManagementService, type CourseChapterMutation } from '@/services/courseManagement'
import { quizService } from '@/services/quiz'
import { isApiError } from '@/core/request'
import { formatDate, formatPrice } from '@/utils/format'
import type { CourseAsset, CourseBindingImpact, CourseCategory, CourseChapter, CourseItem, CourseQuizBinding } from '@/types/course'
import type { QuizLibrary } from '@/types/quiz'
import CourseStudents from './Students'
import CourseAudit from './Audit'

type CourseFormValues = {
  title: string
  category: string
  description?: string
  cover_url?: string
  price: number
  teacher_name?: string
  teacher_contact?: string
  free_preview_seconds?: number | null
}

const COURSE_ASSET_MAX_BYTES = 200 * 1024 * 1024
const COURSE_ASSET_ACCEPT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
}

const STATUS_META: Record<CourseItem['status'], { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  offline: { text: '已下线', color: 'orange' },
  archived: { text: '已归档', color: 'default' },
}

function CourseModal({
  open,
  course,
  categories,
  onClose,
  onSuccess,
}: {
  open: boolean
  course: CourseItem | null
  categories: CourseCategory[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form] = Form.useForm<CourseFormValues>()
  useEffect(() => {
    if (!open) return
    if (course) {
      form.setFieldsValue({
        title: course.title,
        category: course.category,
        description: course.description ?? undefined,
        cover_url: course.cover_url ?? undefined,
        price: course.price,
        teacher_name: course.teacher_name ?? undefined,
        teacher_contact: course.teacher_contact ?? undefined,
        free_preview_seconds: course.free_preview_seconds,
      })
    } else {
      form.resetFields()
    }
  }, [course, form, open])

  const submit = async () => {
    const values = await form.validateFields()
    if (course) await courseManagementService.updateCourse(course.id, values)
    else await courseManagementService.createCourse(values)
    message.success(course ? '课程已更新' : '课程已创建')
    onSuccess()
  }

  return (
    <Modal
      title={course ? `编辑课程 · ${course.title}` : '创建课程'}
      open={open}
      onOk={submit}
      onCancel={onClose}
      destroyOnClose
      width={720}
      okText="保存"
      cancelText="取消"
    >
      <Alert type="info" showIcon message="课程是纯在线网课，不支持班次和线下安排。" style={{ marginBottom: 16 }} />
      <Form form={form} layout="vertical">
        <Space style={{ width: '100%' }} size={16} wrap>
          <Form.Item name="title" label="课程标题" rules={[{ required: true, whitespace: true, message: '请输入课程标题' }]} style={{ minWidth: 360 }}>
            <Input placeholder="请输入课程标题" />
          </Form.Item>
          <Form.Item name="category" label="类目" rules={[{ required: true, message: '请选择类目' }]} style={{ width: 180 }}>
            <Select
              options={categories.filter(item => item.is_active).map(item => ({ value: item.name, label: item.name }))}
              placeholder="请选择类目"
            />
          </Form.Item>
        </Space>
        <Form.Item name="cover_url" label="封面图">
          <ImageUpload maxSize={5} />
        </Form.Item>
        <Form.Item name="description" label="课程简介">
          <Input.TextArea rows={4} placeholder="课程简介" />
        </Form.Item>
        <Space size={16} wrap>
          <Form.Item name="price" label="价格（分）" rules={[{ required: true, message: '请输入价格' }]}>
            <InputNumber min={0} precision={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="teacher_name" label="讲师名称">
            <Input style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="teacher_contact" label="讲师联系方式">
            <Input style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="free_preview_seconds" label="试看时长（秒）">
            <InputNumber min={0} precision={0} style={{ width: 160 }} />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  )
}

function ChapterModal({
  open,
  courseId,
  chapter,
  assets,
  onClose,
  onSuccess,
}: {
  open: boolean
  courseId?: number
  chapter: CourseChapter | null
  assets: CourseAsset[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form] = Form.useForm<CourseChapterMutation>()
  useEffect(() => {
    if (!open) return
    if (chapter) {
      form.setFieldsValue({
        title: chapter.title,
        video_source_type: chapter.video_source_type,
        video_url: chapter.video_url ?? undefined,
        asset_id: chapter.asset_id ?? undefined,
        duration: chapter.duration,
        sort_order: chapter.sort_order,
        is_preview: chapter.is_preview,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ video_source_type: 'external_url', is_preview: false })
    }
  }, [chapter, form, open])

  const submit = async () => {
    if (!courseId) return
    const values = await form.validateFields() as Required<Pick<CourseChapterMutation, 'title' | 'video_source_type'>> & CourseChapterMutation
    if (values.video_source_type === 'external_url') {
      delete values.asset_id
      values.video_url = values.video_url?.trim()
    } else {
      delete values.video_url
    }
    if (chapter) await courseManagementService.updateChapter(courseId, chapter.id, values)
    else await courseManagementService.createChapter(courseId, values)
    message.success(chapter ? '章节已更新' : '章节已创建')
    onSuccess()
  }

  const sourceType = Form.useWatch('video_source_type', form)
  const videoAssets = assets.filter(
    item => item.asset_type === 'video/mp4' || item.asset_type === 'video/webm',
  )
  return (
    <Modal
      title={chapter ? `编辑章节 · ${chapter.title}` : '新增章节'}
      open={open}
      onOk={submit}
      onCancel={onClose}
      destroyOnClose
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="章节标题" rules={[{ required: true, whitespace: true, message: '请输入章节标题' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="video_source_type" label="视频来源" rules={[{ required: true }]}>
          <Select options={[
            { value: 'external_url', label: '外部视频 URL' },
            { value: 'course_asset', label: '课程私有资料' },
          ]} />
        </Form.Item>
        {sourceType === 'external_url' ? (
          <Form.Item name="video_url" label="外部视频 URL" rules={[{ required: true, message: '请输入视频 URL' }]}>
            <Input placeholder="https://..." />
          </Form.Item>
        ) : (
          <Form.Item name="asset_id" label="课程视频资料" rules={[{ required: true, message: '请选择课程视频资料' }]}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="选择已上传的视频资料"
              options={videoAssets.map(item => ({
                value: item.id,
                label: `${item.title} (#${item.id})`,
              }))}
            />
          </Form.Item>
        )}
        <Space wrap>
          <Form.Item name="duration" label="时长（秒）">
            <InputNumber min={0} precision={0} style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} precision={0} style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="is_preview" label="允许试看" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  )
}

export default function CourseManagementPage() {
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [searchForm] = Form.useForm()
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [courseModalOpen, setCourseModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null)
  const [activeCourse, setActiveCourse] = useState<CourseItem | null>(null)
  const [chapterOpen, setChapterOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<CourseChapter | null>(null)
  const [chapters, setChapters] = useState<CourseChapter[]>([])
  const [assets, setAssets] = useState<CourseAsset[]>([])
  const [bindings, setBindings] = useState<CourseQuizBinding[]>([])
  const [libraries, setLibraries] = useState<QuizLibrary[]>([])
  const [selectedLibraryId, setSelectedLibraryId] = useState<number>()
  const [impact, setImpact] = useState<CourseBindingImpact | null>(null)
  const [bindingImpacts, setBindingImpacts] = useState<Record<number, CourseBindingImpact>>({})
  const [detailDrawer, setDetailDrawer] = useState(false)
  const [assetUploading, setAssetUploading] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryForm] = Form.useForm<{ name: string; sort_order: number }>()

  const { data, loading, pagination, refresh } = usePagination(
    (page, signal) => courseManagementService.listCourses({ ...filters, ...page }, signal),
    [JSON.stringify(filters)],
  )

  const loadCategories = useCallback(async () => {
    setCategories(await courseManagementService.listCategories())
  }, [])

  useEffect(() => { void loadCategories() }, [loadCategories])

  const loadCourseDetailObjects = useCallback(async (course: CourseItem) => {
    const [chapterPage, assetList, bindingList, libraryList] = await Promise.all([
      courseManagementService.listChapters(course.id, { page: 1, page_size: 100 }),
      courseManagementService.listAssets(course.id),
      courseManagementService.listBindings(course.id),
      quizService.listLibraries({ access_mode: 'course_entitlement', status: 'published' }),
    ])
    setChapters(chapterPage.items)
    setAssets(assetList)
    setBindings(bindingList)
    setLibraries(libraryList)
  }, [])

  const openDetail = async (course: CourseItem) => {
    setActiveCourse(course)
    setDetailDrawer(true)
    await loadCourseDetailObjects(course)
  }

  const lifecycle = async (course: CourseItem, action: 'publish' | 'offline' | 'archive' | 'restore') => {
    const updated = await courseManagementService.changeLifecycle(course.id, action)
    message.success('课程状态已更新')
    await refresh()
    if (activeCourse?.id === updated.id) setActiveCourse(updated)
  }

  const beforeAssetUpload = (file: RcFile) => {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    const expectedType = COURSE_ASSET_ACCEPT[extension]
    if (!expectedType) {
      message.error(`不支持的课程资料格式：${extension || '未知格式'}`)
      return false
    }
    if (file.type !== expectedType) {
      message.error('课程资料类型与文件扩展名不一致')
      return false
    }
    if (file.size > COURSE_ASSET_MAX_BYTES) {
      message.error('课程资料不能超过 200MB')
      return false
    }
    return true
  }

  const uploadCourseAsset = async (options: {
    file: RcFile
    onSuccess: (body: unknown) => void
    onError: (error: Error) => void
  }) => {
    const { file, onSuccess, onError } = options
    if (!activeCourse) {
      onError(new Error('课程未打开'))
      message.error('课程未打开')
      return
    }
    const form = new FormData()
    form.append('file', file)
    form.append('title', file.name)
    form.append('asset_type', file.type)
    form.append('sort_order', String(assets.length + 1))
    form.append('is_preview', 'false')
    setAssetUploading(true)
    try {
      await courseManagementService.uploadAsset(activeCourse.id, form)
      setAssets(await courseManagementService.listAssets(activeCourse.id))
      message.success('课程资料已上传')
      onSuccess(null)
    } catch (error) {
      const fallback = new Error('课程资料上传失败，请重试')
      onError(error instanceof Error ? error : fallback)
      if (isApiError(error)) {
        if (error.status === 413) message.error('课程资料超过服务器 200MB 上传限制')
        else if (error.status === 422) message.error(error.message || '课程资料校验失败')
        else message.error('课程资料上传失败，请稍后重试')
      } else {
        message.error('网络异常，课程资料未上传')
      }
    } finally {
      setAssetUploading(false)
    }
  }

  const previewImpact = async () => {
    if (!activeCourse || !selectedLibraryId) return
    setImpact(await courseManagementService.previewBinding(activeCourse.id, selectedLibraryId))
  }

  const createBinding = async () => {
    if (!activeCourse || !selectedLibraryId || !impact?.can_execute) return
    await courseManagementService.createBinding(activeCourse.id, selectedLibraryId)
    message.success('绑定已创建，回补任务已排队')
    setImpact(null)
    setSelectedLibraryId(undefined)
    setBindings(await courseManagementService.listBindings(activeCourse.id))
    await refresh()
  }

  const setBindingStatus = async (binding: CourseQuizBinding, status: 'active' | 'inactive') => {
    await courseManagementService.setBindingStatus(binding.id, status)
    message.success('权益任务已排队')
    setBindings(await courseManagementService.listBindings(binding.course_id))
  }

  const courseColumns: ColumnsType<CourseItem> = useMemo(() => [
    {
      title: '封面',
      dataIndex: 'cover_url',
      width: 80,
      render: value => value ? <Image src={value} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 48, height: 48, background: '#f0f0f0', borderRadius: 4 }} />,
    },
    { title: '课程', dataIndex: 'title', width: 220, ellipsis: true },
    { title: '类目', dataIndex: 'category', width: 110 },
    { title: '价格', dataIndex: 'price', width: 100, render: value => value === 0 ? <Tag>免费</Tag> : formatPrice(value) },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: CourseItem['status']) => <Tag color={STATUS_META[status].color}>{STATUS_META[status].text}</Tag>,
    },
    { title: '赠送题库', dataIndex: 'bound_quiz_library_count', width: 100 },
    { title: '已购人数', dataIndex: 'enrollment_count', width: 100 },
    { title: '更新时间', dataIndex: 'updated_at', width: 170, render: value => formatDate(value) },
    {
      title: '操作',
      width: 360,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => openDetail(record)}>管理</Button>
          <Button type="link" size="small" onClick={() => { setEditingCourse(record); setCourseModalOpen(true) }}>编辑</Button>
          {record.status === 'draft' && (
            <ConfirmButton title="发布课程" description="发布后用户可购买，确认发布？" type="link" size="small" onConfirm={() => lifecycle(record, 'publish')}>发布</ConfirmButton>
          )}
          {record.status === 'published' && (
            <ConfirmButton title="下线课程" description="下线后不能新购，待支付订单无法支付，已购用户继续学习。" danger type="link" size="small" onConfirm={() => lifecycle(record, 'offline')}>下线</ConfirmButton>
          )}
          {(record.status === 'published' || record.status === 'offline') && (
            <ConfirmButton title="归档课程" description="归档后不再新售，已购用户保留学习入口。" type="link" size="small" onConfirm={() => lifecycle(record, 'archive')}>归档</ConfirmButton>
          )}
          {(record.status === 'offline' || record.status === 'archived') && (
            <ConfirmButton title="恢复发布" description="恢复后课程重新开放购买。" type="link" size="small" onConfirm={() => lifecycle(record, 'restore')}>恢复</ConfirmButton>
          )}
          {record.status === 'draft' && (
            <ConfirmButton title="删除草稿课程" description="仅无业务关联的草稿课程可删除。" danger type="link" size="small" onConfirm={async () => { await courseManagementService.deleteCourse(record.id); message.success('课程已删除'); refresh() }}>删除</ConfirmButton>
          )}
        </Space>
      ),
    },
  ], [activeCourse, refresh])

  const chapterColumns: ColumnsType<CourseChapter> = [
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    { title: '章节', dataIndex: 'title', width: 220, ellipsis: true },
    {
      title: '视频来源',
      dataIndex: 'video_source_type',
      width: 130,
      render: (_, record) => record.video_source_type === 'external_url'
        ? '外部 URL'
        : `课程资料 #${record.asset_id}`,
    },
    { title: '时长', dataIndex: 'duration', width: 90, render: value => value == null ? '-' : `${value} 秒` },
    { title: '试看', dataIndex: 'is_preview', width: 80, render: value => <Tag color={value ? 'green' : 'default'}>{value ? '可试看' : '完整'}</Tag> },
    {
      title: '操作',
      width: 140,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => { setEditingChapter(record); setChapterOpen(true) }}>编辑</Button>
          <ConfirmButton title="下架章节" description="已保存学习进度不会删除。" danger type="link" size="small" onConfirm={async () => {
            if (!activeCourse) return
            await courseManagementService.deleteChapter(activeCourse.id, record.id)
            setChapters((await courseManagementService.listChapters(activeCourse.id, { page: 1, page_size: 100 })).items)
          }}>下架</ConfirmButton>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer
      title="课程管理"
      extra={(
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingCourse(null); setCourseModalOpen(true) }}>创建课程</Button>
        </Space>
      )}
    >
      <Form
        form={searchForm}
        layout="inline"
        onFinish={values => setFilters({
          keyword: values.keyword?.trim() || undefined,
          category: values.category,
          status: values.status,
          price_type: values.price_type,
          bound_quiz: values.bound_quiz,
        })}
        style={{ marginBottom: 16, rowGap: 12 }}
      >
        <Form.Item name="keyword" label="课程">
          <Input allowClear prefix={<SearchOutlined />} placeholder="标题关键词" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="category" label="类目">
          <Select allowClear options={categories.map(item => ({ value: item.name, label: item.name }))} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select allowClear options={Object.entries(STATUS_META).map(([value, item]) => ({ value, label: item.text }))} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="price_type" label="价格">
          <Select allowClear options={[{ value: 'free', label: '免费' }, { value: 'paid', label: '付费' }]} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="bound_quiz" label="绑定题库">
          <Select allowClear options={[{ value: true, label: '已绑定' }, { value: false, label: '未绑定' }]} style={{ width: 110 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={() => { searchForm.resetFields(); setFilters({}) }}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table<CourseItem>
        rowKey="id"
        columns={courseColumns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1450 }}
      />

      <Tabs
        items={[
          { key: 'students', label: '报名学员', children: <CourseStudents /> },
          { key: 'audit', label: '课程审计', children: <CourseAudit /> },
          {
            key: 'categories',
            label: '类目字典',
            children: (
              <>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCategoryOpen(true)} style={{ marginBottom: 12 }}>新增类目</Button>
                <Table<CourseCategory>
                  rowKey="id"
                  dataSource={categories}
                  pagination={false}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 80 },
                    { title: '名称', dataIndex: 'name' },
                    { title: '排序', dataIndex: 'sort_order', width: 100 },
                    { title: '启用', dataIndex: 'is_active', width: 100, render: value => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag> },
                    {
                      title: '操作',
                      width: 120,
                      render: (_, record) => (
                        <ConfirmButton
                          title={record.is_active ? '停用类目' : '启用类目'}
                          description="已有课程保留原类目名称，新编辑课程只能选择启用类目。"
                          type="link"
                          size="small"
                          onConfirm={async () => {
                            await courseManagementService.updateCategory(record.id, { is_active: !record.is_active })
                            await loadCategories()
                          }}
                        >
                          {record.is_active ? '停用' : '启用'}
                        </ConfirmButton>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />

      <CourseModal
        open={courseModalOpen}
        course={editingCourse}
        categories={categories}
        onClose={() => setCourseModalOpen(false)}
        onSuccess={() => { setCourseModalOpen(false); refresh() }}
      />

      <Modal
        title="新增课程类目"
        open={categoryOpen}
        onOk={async () => {
          const values = await categoryForm.validateFields()
          await courseManagementService.createCategory(values)
          message.success('课程类目已创建')
          setCategoryOpen(false)
          categoryForm.resetFields()
          await loadCategories()
        }}
        onCancel={() => setCategoryOpen(false)}
        destroyOnClose
      >
        <Form form={categoryForm} layout="vertical" initialValues={{ sort_order: 0 }}>
          <Form.Item name="name" label="类目名称" rules={[{ required: true, whitespace: true, message: '请输入类目名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} precision={0} style={{ width: 160 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`课程工作台 · ${activeCourse?.title ?? ''}`}
        open={detailDrawer}
        onClose={() => setDetailDrawer(false)}
        width={920}
      >
        {activeCourse && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="状态"><Tag color={STATUS_META[activeCourse.status].color}>{STATUS_META[activeCourse.status].text}</Tag></Descriptions.Item>
              <Descriptions.Item label="价格">{activeCourse.price === 0 ? '免费' : formatPrice(activeCourse.price)}</Descriptions.Item>
              <Descriptions.Item label="类目">{activeCourse.category}</Descriptions.Item>
              <Descriptions.Item label="已购人数">{activeCourse.enrollment_count}</Descriptions.Item>
            </Descriptions>
            <Tabs
              items={[
                {
                  key: 'chapters',
                  label: '章节管理',
                  children: (
                    <>
                      <Button icon={<PlayCircleOutlined />} type="primary" onClick={() => { setEditingChapter(null); setChapterOpen(true) }}>新增章节</Button>
                      <Table<CourseChapter> rowKey="id" columns={chapterColumns} dataSource={chapters} pagination={false} style={{ marginTop: 12 }} />
                    </>
                  ),
                },
                {
                  key: 'assets',
                  label: '资料管理',
                  children: (
                    <>
                      <Upload
                        maxCount={1}
                        showUploadList={false}
                        accept={Object.keys(COURSE_ASSET_ACCEPT).join(',')}
                        beforeUpload={beforeAssetUpload}
                        customRequest={uploadCourseAsset as never}
                      >
                        <Button type="primary" icon={<FileTextOutlined />} loading={assetUploading}>上传资料</Button>
                      </Upload>
                      <Table<CourseAsset>
                        rowKey="id"
                        dataSource={assets}
                        pagination={false}
                        style={{ marginTop: 12 }}
                        columns={[
                          { title: '资料', dataIndex: 'title' },
                          { title: '类型', dataIndex: 'asset_type', width: 120 },
                          { title: '排序', dataIndex: 'sort_order', width: 80 },
                          { title: '试看', dataIndex: 'is_preview', width: 80, render: value => <Tag>{value ? '是' : '否'}</Tag> },
                          {
                            title: '操作',
                            width: 90,
                            render: (_, record) => (
                              <ConfirmButton
                                title="删除资料"
                                description="删除后用户无法再下载该资料。"
                                danger
                                type="link"
                                size="small"
                                onConfirm={async () => {
                                  if (!activeCourse) return
                                  await courseManagementService.deleteAsset(activeCourse.id, record.id)
                                  setAssets(await courseManagementService.listAssets(activeCourse.id))
                                }}
                              >删除</ConfirmButton>
                            ),
                          },
                        ]}
                      />
                    </>
                  ),
                },
                {
                  key: 'bindings',
                  label: '赠送题库',
                  children: (
                    <>
                      <Alert type="info" showIcon message="新增绑定会异步回补全部已购用户；解绑会撤销无其他有效来源的权益。" style={{ marginBottom: 12 }} />
                      <Space wrap>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder="选择已发布课程权益题库"
                          value={selectedLibraryId}
                          onChange={setSelectedLibraryId}
                          options={libraries.map(item => ({ value: item.id, label: `${item.name} (#${item.id})` }))}
                          style={{ width: 360 }}
                        />
                        <Button icon={<ApartmentOutlined />} onClick={previewImpact}>影响预览</Button>
                        {impact && (
                          <ConfirmButton
                            title="确认绑定并回补"
                            description={`将回补 ${impact.candidates_to_backfill} 位用户，请确认。`}
                            type="primary"
                            disabled={!impact.can_execute}
                            onConfirm={createBinding}
                          >确认绑定</ConfirmButton>
                        )}
                      </Space>
                      {impact && (
                        <Descriptions bordered size="small" column={2} style={{ marginTop: 12, marginBottom: 12 }}>
                          <Descriptions.Item label="课程已购">{impact.active_enrollment_count}</Descriptions.Item>
                          <Descriptions.Item label="待回补">{impact.candidates_to_backfill}</Descriptions.Item>
                          <Descriptions.Item label="已有权益">{impact.existing_entitlement_count}</Descriptions.Item>
                          <Descriptions.Item label="进行中题库会话">{impact.active_session_count}</Descriptions.Item>
                          <Descriptions.Item label="其他课程来源">{impact.other_active_source_count}</Descriptions.Item>
                          <Descriptions.Item label="阻断">{impact.blockers.join('、') || '无'}</Descriptions.Item>
                        </Descriptions>
                      )}
                      <Table<CourseQuizBinding>
                        rowKey="id"
                        dataSource={bindings}
                        pagination={false}
                        columns={[
                          { title: '题库', dataIndex: 'library_name', render: (_, record) => `${record.library_name} (#${record.library_id})` },
                          { title: '状态', dataIndex: 'status', width: 100, render: value => <Tag color={value === 'active' ? 'green' : 'default'}>{value === 'active' ? '有效' : '停用'}</Tag> },
                          { title: '更新时间', dataIndex: 'updated_at', width: 170, render: value => formatDate(value) },
                          {
                            title: '操作',
                            width: 110,
                            render: (_, record) => (
                              <span
                                onClick={async () => {
                                  const preview = await courseManagementService.previewBinding(
                                    record.course_id,
                                    record.library_id,
                                  )
                                  setBindingImpacts(current => ({ ...current, [record.id]: preview }))
                                }}
                              >
                              <ConfirmButton
                                title={record.status === 'active' ? '停用绑定' : '启用绑定'}
                                description={
                                  record.status === 'active'
                                    ? `当前活跃权益 ${bindingImpacts[record.id]?.existing_entitlement_count ?? '...'} 个，进行中题库会话 ${bindingImpacts[record.id]?.active_session_count ?? '...'} 个；仅撤销无其他有效来源的用户。`
                                    : `将为全部已购用户排队发放权益，当前已购 ${bindingImpacts[record.id]?.active_enrollment_count ?? '...'} 人。`
                                }
                                danger={record.status === 'active'}
                                type="link"
                                size="small"
                                onConfirm={() => setBindingStatus(record, record.status === 'active' ? 'inactive' : 'active')}
                              >
                                {record.status === 'active' ? '停用' : '启用'}
                              </ConfirmButton>
                              </span>
                            ),
                          },
                        ]}
                      />
                    </>
                  ),
                },
                {
                  key: 'jobs',
                  label: '权益任务',
                  children: <CourseJobs courseId={activeCourse.id} />,
                },
              ]}
            />
          </>
        )}
      </Drawer>

      <ChapterModal
        open={chapterOpen}
        courseId={activeCourse?.id}
        chapter={editingChapter}
        assets={assets}
        onClose={() => setChapterOpen(false)}
        onSuccess={async () => {
          setChapterOpen(false)
          if (activeCourse) setChapters((await courseManagementService.listChapters(activeCourse.id, { page: 1, page_size: 100 })).items)
        }}
      />
    </PageContainer>
  )
}

function CourseJobs({ courseId }: { courseId: number }) {
  const { data, loading, pagination, refresh } = usePagination(
    (page, signal) => courseManagementService.listJobs(courseId, page, signal),
    [courseId],
  )
  return (
    <>
      <Button icon={<BookOutlined />} onClick={refresh}>刷新任务</Button>
      <Table
        rowKey="id"
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        style={{ marginTop: 12 }}
        columns={[
          { title: '任务 ID', dataIndex: 'id', width: 90 },
          { title: '动作', dataIndex: 'action', width: 90 },
          { title: '状态', dataIndex: 'status', width: 100 },
          { title: '总数', dataIndex: 'total_count', width: 80 },
          { title: '成功', dataIndex: 'success_count', width: 80 },
          { title: '失败', dataIndex: 'failure_count', width: 80 },
          { title: '完成时间', dataIndex: 'finished_at', width: 170, render: value => value ? formatDate(value) : '-' },
          {
            title: '操作',
            width: 90,
            render: (_, record) => record.status === 'partial' || record.status === 'failed' ? (
              <Button type="link" size="small" onClick={async () => { await courseManagementService.retryJob(record.id); refresh() }}>重试</Button>
            ) : '-',
          },
        ]}
      />
    </>
  )
}
