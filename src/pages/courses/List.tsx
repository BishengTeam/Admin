import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Image, Input, InputNumber, Modal, Select, Space, Table, Tag, Upload, message } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useAuth } from '@/hooks/useAuth'
import { courseManagementService, type CourseFilter } from '@/services/courseManagement'
import type { CourseCategory, CourseItem, CourseUpload } from '@/types/course'

const STATUS_META: Record<CourseItem['status'], { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  offline: { text: '已下线', color: 'orange' },
  archived: { text: '已归档', color: 'default' },
}

type CreateForm = {
  title: string
  category: string
  description?: string
  price_yuan: string
  preview_chapter_count: number
  teacher_name?: string
  teacher_contact?: string
}

export default function CourseListPage() {
  const navigate = useNavigate()
  const { admin } = useAuth()
  const canWrite = usePermission('course:write')
  const canPublish = usePermission('course:publish')
  const isSuper = admin?.role === 'super_admin'
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [searchForm] = Form.useForm()
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<CreateForm>()
  const [cover, setCover] = useState<CourseUpload | null>(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverPreview, setCoverPreview] = useState('')
  const { data, loading, pagination, refresh } = usePagination(
    (page, signal) => courseManagementService.listCourses({ ...filters, ...page } as CourseFilter, signal),
    [JSON.stringify(filters)],
  )

  const loadCategories = useCallback(async () => {
    setCategories(await courseManagementService.listCategories())
  }, [])
  useEffect(() => { void loadCategories() }, [loadCategories])

  const submit = async () => {
    if (!cover) {
      message.error('请先上传 16:9 课程封面')
      return
    }
    const values = await form.validateFields()
    const course = await courseManagementService.createCourse({ ...values, cover_upload_id: cover.id })
    message.success('课程草稿已创建')
    setOpen(false)
    setCover(null)
    setCoverPreview('')
    navigate(`/admin/courses/${course.id}`)
  }

  const columns: ColumnsType<CourseItem> = useMemo(() => [
    {
      title: '封面',
      dataIndex: 'cover_url',
      width: 96,
      render: value => value ? <Image src={value} width={72} height={40} preview={false} /> : null,
    },
    { title: '课程', dataIndex: 'title', ellipsis: true },
    { title: '类目', dataIndex: 'category', width: 120 },
    { title: '价格（元）', dataIndex: 'price_yuan', width: 110 },
    { title: '试看集数', dataIndex: 'preview_chapter_count', width: 100 },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: CourseItem['status']) => <Tag color={STATUS_META[value].color}>{STATUS_META[value].text}</Tag> },
    { title: '报名', dataIndex: 'enrollment_count', width: 80 },
    { title: '题库', dataIndex: 'bound_quiz_library_count', width: 80 },
    { title: '更新时间', dataIndex: 'updated_at', width: 180 },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => navigate(`/admin/courses/${record.id}`)}>管理</Button>
          {canPublish && record.status === 'draft' && (
            <ConfirmButton title="发布课程" description="发布前会校验封面、章节和试看集数。" type="link" size="small" onConfirm={async () => { await courseManagementService.changeLifecycle(record.id, 'publish'); message.success('课程已发布'); refresh() }}>发布</ConfirmButton>
          )}
          {canPublish && record.status === 'published' && (
            <ConfirmButton title="下线课程" description="下线后不能新购，已购用户继续学习。" danger type="link" size="small" onConfirm={async () => { await courseManagementService.changeLifecycle(record.id, 'offline'); refresh() }}>下线</ConfirmButton>
          )}
          {isSuper && record.status === 'draft' && (
            <ConfirmButton title="删除草稿" description="仅无业务关联的草稿课程可删除。" danger type="link" size="small" onConfirm={async () => { await courseManagementService.deleteCourse(record.id); refresh() }}>删除</ConfirmButton>
          )}
        </Space>
      ),
    },
  ], [canPublish, isSuper, navigate, refresh])

  return (
    <PageContainer
      title="课程列表"
      extra={canWrite ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>创建课程</Button> : undefined}
    >
      <Form form={searchForm} layout="inline" onFinish={values => setFilters({
        keyword: values.keyword?.trim() || undefined,
        category: values.category,
        status: values.status,
        price_type: values.price_type,
      })} style={{ marginBottom: 16, rowGap: 12 }}>
        <Form.Item name="keyword"><Input prefix={<SearchOutlined />} placeholder="课程标题" allowClear style={{ width: 220 }} /></Form.Item>
        <Form.Item name="category"><Select allowClear placeholder="类目" options={categories.map(item => ({ value: item.name, label: item.name }))} style={{ width: 140 }} /></Form.Item>
        <Form.Item name="status"><Select allowClear placeholder="状态" options={Object.entries(STATUS_META).map(([value, item]) => ({ value, label: item.text }))} style={{ width: 110 }} /></Form.Item>
        <Form.Item name="price_type"><Select allowClear placeholder="价格" options={[{ value: 'free', label: '免费' }, { value: 'paid', label: '付费' }]} style={{ width: 100 }} /></Form.Item>
        <Form.Item><Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={() => { searchForm.resetFields(); setFilters({}) }}>重置</Button></Space></Form.Item>
      </Form>
      <Table rowKey="id" columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} scroll={{ x: 1250 }} />

      <Modal title="创建课程草稿" open={open} onOk={submit} onCancel={() => setOpen(false)} width={720} okText="保存并进入" cancelText="取消" destroyOnClose>
        <Alert type="info" showIcon message="保存草稿后进入课程工作台，再批量上传章节视频。" style={{ marginBottom: 16 }} />
        <Form form={form} layout="vertical" initialValues={{ price_yuan: '0.00', preview_chapter_count: 0 }}>
          <Space style={{ width: '100%' }} size={16} wrap>
            <Form.Item name="title" label="课程标题" rules={[{ required: true, whitespace: true }]} style={{ minWidth: 360 }}><Input maxLength={256} /></Form.Item>
            <Form.Item name="category" label="类目" rules={[{ required: true }]} style={{ width: 180 }}>
              <Select options={categories.filter(item => item.is_active).map(item => ({ value: item.name, label: item.name }))} />
            </Form.Item>
          </Space>
          <Form.Item label="课程封面（强制 16:9，自动裁剪）" required>
            <Space direction="vertical">
              <Upload
                maxCount={1}
                accept=".jpg,.jpeg,.png,.webp"
                showUploadList={false}
                beforeUpload={async file => {
                  setCoverUploading(true)
                  try {
                    setCover(await courseManagementService.uploadCover(file))
                    setCoverPreview(URL.createObjectURL(file))
                    message.success('封面上传完成')
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : '封面上传失败')
                  } finally {
                    setCoverUploading(false)
                  }
                  return false
                }}
              >
                <Button icon={<UploadOutlined />} loading={coverUploading}>{cover ? '重新上传封面' : '上传封面'}</Button>
              </Upload>
              {coverPreview && <Image src={coverPreview} width={160} height={90} preview={false} />}
            </Space>
          </Form.Item>
          <Form.Item name="description" label="课程简介"><Input.TextArea rows={4} maxLength={2000} /></Form.Item>
          <Space size={16} wrap>
            <Form.Item name="price_yuan" label="价格（元）" rules={[{ required: true, pattern: /^\d+(\.\d{1,2})?$/, message: '最多两位小数' }]}>
              <Input style={{ width: 140 }} placeholder="0.00" />
            </Form.Item>
            <Form.Item name="preview_chapter_count" label="试看集数（仅付费课程生效）" rules={[{ required: true }]}>
              <InputNumber min={0} precision={0} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="teacher_name" label="讲师"><Input style={{ width: 160 }} /></Form.Item>
            <Form.Item name="teacher_contact" label="联系方式"><Input style={{ width: 160 }} /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  )
}
