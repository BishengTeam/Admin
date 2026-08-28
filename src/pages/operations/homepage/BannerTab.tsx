import { useEffect, useMemo, useState } from 'react'
import { Table, Button, Input, Switch, Space, Modal, Form, Select, InputNumber, DatePicker, Tag, Image, Radio, message } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { usePagination } from '@/hooks/usePagination'
import { bannerService } from '@/services/banner'
import { courseManagementService } from '@/services/courseManagement'
import { activityService } from '@/services/activity'
import { jobService } from '@/services/job'
import { formatDate } from '@/utils/format'
import { requiredRule } from '@/utils/validator'
import { BANNER_PAGES, parseJumpMode, type Banner, type BannerJumpMode } from '@/types/banner'

const { RangePicker } = DatePicker

type FormValues = {
  image_url?: string
  jump_mode: BannerJumpMode
  page_path?: string
  course_id?: number
  activity_id?: number
  job_id?: number
  link_url?: string
  sort?: number
  time_range?: [dayjs.Dayjs | null, dayjs.Dayjs | null]
  is_active?: boolean
}

type ResourceTitles = {
  course: Map<number, string>
  activity: Map<number, string>
  job: Map<number, string>
}

const EMPTY_TITLES: ResourceTitles = {
  course: new Map(),
  activity: new Map(),
  job: new Map(),
}

const MODE_LABELS: Record<BannerJumpMode, string> = {
  none: '无',
  page: '页面',
  course: '课程',
  activity: '活动',
  job: '岗位',
  link: '链接',
}

const MODE_COLORS: Record<BannerJumpMode, string> = {
  none: 'default',
  page: 'geekblue',
  course: 'green',
  activity: 'purple',
  job: 'cyan',
  link: 'orange',
}

/** 列表展示用的跳转描述 */
function describeJump(jumpLink: string | null, titles: ResourceTitles) {
  const parsed = parseJumpMode(jumpLink)
  const tag = <Tag color={MODE_COLORS[parsed.mode]}>{MODE_LABELS[parsed.mode]}</Tag>
  switch (parsed.mode) {
    case 'none':
      return { tag, text: '-' }
    case 'page':
      return { tag, text: BANNER_PAGES.find((p) => p.value === parsed.path)?.label ?? parsed.path }
    case 'course':
      return {
        tag,
        text: parsed.resourceId
          ? titles.course.get(parsed.resourceId) ?? `课程 #${parsed.resourceId}`
          : '无效链接',
      }
    case 'activity':
      return {
        tag,
        text: parsed.resourceId
          ? titles.activity.get(parsed.resourceId) ?? `活动 #${parsed.resourceId}`
          : '无效链接',
      }
    case 'job':
      return {
        tag,
        text: parsed.resourceId
          ? titles.job.get(parsed.resourceId) ?? `岗位 #${parsed.resourceId}`
          : '无效链接',
      }
    case 'link':
      return { tag, text: parsed.url ?? '' }
  }
}

export default function BannerTab() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Banner | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [form] = Form.useForm<FormValues>()

  const jumpMode = Form.useWatch('jump_mode', form)
  const [courseOptions, setCourseOptions] = useState<{ label: string; value: number }[]>([])
  const [activityOptions, setActivityOptions] = useState<{ label: string; value: number }[]>([])
  const [jobOptions, setJobOptions] = useState<{ label: string; value: number }[]>([])
  const [titles, setTitles] = useState<ResourceTitles>(EMPTY_TITLES)

  const { data, loading, pagination, refresh } = usePagination(
    (page) => bannerService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  /** 为列表回显拉资源标题映射 */
  useEffect(() => {
    Promise.all([
      courseManagementService.listCourses({ page: 1, page_size: 100 }).catch(() => null),
      activityService.list({ page: 1, page_size: 100 }).catch(() => null),
      jobService.list({ page: 1, page_size: 100 }).catch(() => null),
    ]).then(([courses, activities, jobs]) => {
      setTitles({
        course: new Map(courses?.items.map((c) => [c.id, c.title]) ?? []),
        activity: new Map(activities?.items.map((a) => [a.id, a.title]) ?? []),
        job: new Map(jobs?.items.map((j) => [j.id, `${j.title}（${j.company}）`]) ?? []),
      })
    })
  }, [data])

  const SEARCHERS: Record<'course' | 'activity' | 'job', (query: string) => void> = {
    course: (query) => {
      courseManagementService
        .listCourses({ keyword: query || undefined, page: 1, page_size: 20 })
        .then((res) => setCourseOptions(res.items.map((c) => ({ label: c.title, value: c.id }))))
        .catch(() => setCourseOptions([]))
    },
    activity: (query) => {
      activityService
        .list({ keyword: query || undefined, page: 1, page_size: 20 })
        .then((res) => setActivityOptions(res.items.map((a) => ({ label: a.title, value: a.id }))))
        .catch(() => setActivityOptions([]))
    },
    job: (query) => {
      jobService
        .list({ keyword: query || undefined, page: 1, page_size: 20 })
        .then((res) => setJobOptions(res.items.map((j) => ({ label: `${j.title}（${j.company}）`, value: j.id }))))
        .catch(() => setJobOptions([]))
    },
  }

  useEffect(() => {
    if (!modalOpen) return
    if (jumpMode === 'course' && courseOptions.length === 0) SEARCHERS.course('')
    if (jumpMode === 'activity' && activityOptions.length === 0) SEARCHERS.activity('')
    if (jumpMode === 'job' && jobOptions.length === 0) SEARCHERS.job('')
  }, [modalOpen, jumpMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, sort: 0, jump_mode: 'none' })
    setModalOpen(true)
  }

  const handleEdit = (item: Banner) => {
    setEditingItem(item)
    const parsed = parseJumpMode(item.jump_link)
    form.setFieldsValue({
      image_url: item.image_url || '',
      jump_mode: parsed.mode,
      page_path: parsed.path,
      course_id: parsed.mode === 'course' ? parsed.resourceId : undefined,
      activity_id: parsed.mode === 'activity' ? parsed.resourceId : undefined,
      job_id: parsed.mode === 'job' ? parsed.resourceId : undefined,
      link_url: parsed.url,
      sort: item.sort,
      is_active: item.is_active,
      time_range: [
        item.start_time ? dayjs(item.start_time) : null,
        item.end_time ? dayjs(item.end_time) : null,
      ],
    })
    // 资源模式回显标题
    if (parsed.mode === 'course' && parsed.resourceId) {
      const known = titles.course.get(parsed.resourceId)
      setCourseOptions([{ label: known ?? `课程 #${parsed.resourceId}`, value: parsed.resourceId }])
    }
    if (parsed.mode === 'activity' && parsed.resourceId) {
      const known = titles.activity.get(parsed.resourceId)
      setActivityOptions([{ label: known ?? `活动 #${parsed.resourceId}`, value: parsed.resourceId }])
    }
    if (parsed.mode === 'job' && parsed.resourceId) {
      const known = titles.job.get(parsed.resourceId)
      setJobOptions([{ label: known ?? `岗位 #${parsed.resourceId}`, value: parsed.resourceId }])
    }
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await bannerService.delete(id)
    message.success('已删除')
    setSelectedRowKeys((prev) => prev.filter((k) => k !== id))
    refresh()
  }

  const handleBatchDelete = async () => {
    await bannerService.batchDelete(selectedRowKeys)
    message.success(`已删除 ${selectedRowKeys.length} 个 Banner`)
    setSelectedRowKeys([])
    refresh()
  }

  const rowSelection: TableRowSelection<Banner> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys as number[]),
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    let jumpLink: string | null = null
    switch (values.jump_mode) {
      case 'page':
        jumpLink = values.page_path ?? null
        break
      case 'course':
        jumpLink = values.course_id ? `/pages/course/detail?id=${values.course_id}` : null
        break
      case 'activity':
        jumpLink = values.activity_id ? `/pages/activity-zone/detail?id=${values.activity_id}` : null
        break
      case 'job':
        jumpLink = values.job_id ? `/pages/employment-zone/detail?id=${values.job_id}` : null
        break
      case 'link':
        jumpLink = values.link_url?.trim() || null
        break
      case 'none':
        jumpLink = null
    }
    const [start, end] = values.time_range || []
    const payload = {
      image_url: values.image_url,
      jump_link: jumpLink,
      sort: values.sort ?? 0,
      start_time: start ? start.toISOString() : null,
      end_time: end ? end.toISOString() : null,
      is_active: values.is_active,
    }

    if (editingItem) {
      await bannerService.update(editingItem.id, payload)
      message.success('更新成功')
    } else {
      await bannerService.create(payload)
      message.success('添加成功')
    }
    setModalOpen(false)
    refresh()
  }

  const handleToggleStatus = async (id: number, checked: boolean) => {
    await bannerService.update(id, { is_active: checked })
    message.success(checked ? '已上架' : '已下架')
    refresh()
  }

  const columns: ColumnsType<Banner> = useMemo(
    () => [
      {
        title: '封面',
        dataIndex: 'image_url',
        width: 80,
        render: (url: string) =>
          url ? (
            <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />
          ) : (
            <div style={{ width: 48, height: 48, background: '#f0f0f0', borderRadius: 4 }} />
          ),
      },
      {
        title: '跳转',
        width: 80,
        render: (_, r) => describeJump(r.jump_link, titles).tag,
      },
      {
        title: '跳转目标',
        width: 180,
        ellipsis: true,
        render: (_, r) => {
          const d = describeJump(r.jump_link, titles)
          return typeof d.text === 'string' && d.text.startsWith('http') ? (
            <a href={r.jump_link ?? undefined} target="_blank" rel="noreferrer">{d.text}</a>
          ) : (
            d.text
          )
        },
      },
      {
        title: '排序',
        dataIndex: 'sort',
        width: 60,
        align: 'center',
      },
      {
        title: '展示时间',
        width: 220,
        render: (_, r) => {
          const s = r.start_time?.slice(0, 16) || '-'
          const e = r.end_time?.slice(0, 16) || '-'
          return `${s} ~ ${e}`
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (is_active: boolean, record) => (
          <Switch
            checked={is_active}
            onChange={(checked) => handleToggleStatus(record.id, checked)}
            checkedChildren="上架"
            unCheckedChildren="下架"
          />
        ),
      },
      { title: '创建时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
      {
        title: '操作',
        width: 120,
        render: (_, record) => (
          <Space>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              编辑
            </Button>
            <ConfirmButton
              title="删除 Banner"
              description="确认删除此 Banner？"
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
    ],
    [titles], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const resourceField = (mode: 'course' | 'activity' | 'job') => {
    const names = { course: 'course_id', activity: 'activity_id', job: 'job_id' } as const
    const labels = { course: '选择课程', activity: '选择活动', job: '选择岗位' } as const
    const options = { course: courseOptions, activity: activityOptions, job: jobOptions }[mode]
    return (
      <Form.Item name={names[mode]} label={labels[mode]} rules={[{ required: true, message: `请选择${labels[mode].slice(2)}` }]}>
        <Select
          placeholder={`输入关键词搜索${labels[mode].slice(2)}`}
          showSearch
          filterOption={false}
          onSearch={SEARCHERS[mode]}
          options={options}
          notFoundContent={options.length === 0 ? '输入关键词搜索' : undefined}
        />
      </Form.Item>
    )
  }

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索图片地址/链接..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 240 }}
          onPressEnter={() => setSearchText(keyword)}
          allowClear
        />
        <Button type="primary" onClick={() => setSearchText(keyword)}>
          查询
        </Button>
        <Button
          onClick={() => {
            setKeyword('')
            setSearchText('')
          }}
        >
          重置
        </Button>
        {selectedRowKeys.length > 0 && (
          <ConfirmButton
            title="批量删除"
            description={`确认删除选中的 ${selectedRowKeys.length} 个 Banner？`}
            danger
            icon={<DeleteOutlined />}
            onConfirm={handleBatchDelete}
          >
            删除 ({selectedRowKeys.length})
          </ConfirmButton>
        )}
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增 Banner
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
        rowSelection={rowSelection}
      />

      <Modal
        title={editingItem ? '编辑 Banner' : '新增 Banner'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="image_url" label="封面图（每条 Banner 独立上传）" rules={[requiredRule('封面图')]}>
            <ImageUpload />
          </Form.Item>

          <Form.Item name="jump_mode" label="点击跳转" initialValue="none">
            <Radio.Group
              options={[
                { label: '不跳转', value: 'none' },
                { label: '页面', value: 'page' },
                { label: '课程', value: 'course' },
                { label: '活动', value: 'activity' },
                { label: '岗位', value: 'job' },
                { label: '链接', value: 'link' },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>

          {jumpMode === 'page' && (
            <Form.Item name="page_path" label="选择页面" rules={[{ required: true, message: '请选择页面' }]}>
              <Select placeholder="选择要跳转的页面" options={BANNER_PAGES} showSearch optionFilterProp="label" />
            </Form.Item>
          )}

          {jumpMode === 'course' && resourceField('course')}
          {jumpMode === 'activity' && resourceField('activity')}
          {jumpMode === 'job' && resourceField('job')}

          {jumpMode === 'link' && (
            <Form.Item
              name="link_url"
              label="跳转链接"
              rules={[
                { required: true, message: '请输入链接' },
                {
                  validator: (_, value: string) =>
                    !value || value.startsWith('http') || value.startsWith('/pages/')
                      ? Promise.resolve()
                      : Promise.reject(new Error('链接需以 http(s):// 或 /pages/ 开头')),
                },
              ]}
            >
              <Input placeholder="https://example.com 或 /pages/xxx/index" />
            </Form.Item>
          )}

          <Form.Item name="sort" label="排序（数字越小越靠前）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="time_range" label="展示时间">
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="is_active" label="状态" valuePropName="checked">
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
