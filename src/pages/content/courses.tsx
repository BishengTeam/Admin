import { useState, useCallback } from 'react'
import { Table, Button, Input, Select, Space, Tag, Image, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { StatusTag } from '@/components/StatusTag'
import { usePagination } from '@/hooks/usePagination'
import { contentService } from '@/services/content'
import { CONTENT_STATUS_MAP, COURSE_CATEGORIES, COURSE_CATEGORY_COLOR_MAP } from '@/core/constants'
import { formatDate, formatPrice } from '@/utils/format'
import type { Course } from '@/types/content'
import CourseModal from './components/CourseModal'

export default function CourseList() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [category, setCategory] = useState<string | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const { data, loading, pagination, refresh } = usePagination(
    (page) => contentService.listCourses({ keyword: searchText || undefined, category, ...page }),
    [searchText, category],
  )

  const handleAdd = () => {
    setEditingCourse(null)
    setModalOpen(true)
  }

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await contentService.deleteCourse(id)
    message.success('删除成功')
    refresh()
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingCourse(null)
  }

  const columns: ColumnsType<Course> = [
    {
      title: '封面',
      dataIndex: 'cover_url',
      width: 80,
      render: (url: string) => url ? <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 48, height: 48, background: '#f0f0f0', borderRadius: 4 }} />,
    },
    { title: '课程名称', dataIndex: 'title', width: 200 },
    {
      title: '类目',
      dataIndex: 'category',
      width: 100,
      render: (c: string) => {
        const cat = COURSE_CATEGORIES.find((item) => item.value === c)
        return <Tag color={COURSE_CATEGORY_COLOR_MAP[c] || 'default'}>{cat?.label || c}</Tag>
      },
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 100,
      render: (p: number) => formatPrice(p),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (v: boolean) => <StatusTag status={v} map={CONTENT_STATUS_MAP} />,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (t: string) => formatDate(t),
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <ConfirmButton
            title="删除课程"
            description="此操作不可撤销，确认删除此课程？"
            danger
            type="link"
            size="small"
            onConfirm={() => handleDelete(record.id)}
          >
            删除
          </ConfirmButton>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer
      title="课程管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增课程</Button>}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索课程..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 220 }}
          onPressEnter={() => setSearchText(keyword)}
          allowClear
        />
        <Select
          placeholder="选择类目"
          allowClear
          style={{ width: 150 }}
          options={COURSE_CATEGORIES}
          onChange={(val) => setCategory(val)}
        />
        <Button type="primary" onClick={() => setSearchText(keyword)}>查询</Button>
        <Button onClick={() => { setKeyword(''); setSearchText(''); setCategory(undefined); }}>重置</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
      />

      <CourseModal
        open={modalOpen}
        course={editingCourse}
        onClose={handleModalClose}
        onSuccess={() => { handleModalClose(); refresh(); }}
      />
    </PageContainer>
  )
}
