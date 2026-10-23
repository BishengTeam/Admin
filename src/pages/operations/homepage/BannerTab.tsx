import { useEffect, useMemo, useState } from 'react'
import { Table, Button, Input, Switch, Space, Modal, Form, InputNumber, DatePicker, Tag, Image, message } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { usePagination } from '@/hooks/usePagination'
import { bannerService } from '@/services/banner'
import { activityService } from '@/services/activity'
import { jobService } from '@/services/job'
import { formatDate } from '@/utils/format'
import { requiredRule } from '@/utils/validator'
import { buildJumpLink, pageTargetLabel, pageTargetError, parseJumpMode, type JumpTargetValues, type Banner, type BannerJumpMode } from '@/types/banner'
import { JumpTargetFields } from './JumpTargetFields'

const { RangePicker } = DatePicker

type FormValues = JumpTargetValues & {
  image_url?: string
  sort?: number
  time_range?: [dayjs.Dayjs | null, dayjs.Dayjs | null]
  is_active?: boolean
}

type ResourceTitles = {
  activity: Map<number, string>
  job: Map<number, string>
}

const EMPTY_TITLES: ResourceTitles = {
  activity: new Map(),
  job: new Map(),
}

const MODE_LABELS: Record<BannerJumpMode, string> = {
  none: '无',
  page: '页面',
  activity: '活动',
  job: '岗位',
  link: '链接',
}

const MODE_COLORS: Record<BannerJumpMode, string> = {
  none: 'default',
  page: 'geekblue',
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
      return { tag, text: pageTargetLabel(parsed.path) ?? pageTargetError(parsed.path) }
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
      activityService.list({ page: 1, page_size: 100 }).catch(() => null),
      jobService.list({ page: 1, page_size: 100 }).catch(() => null),
    ]).then(([activities, jobs]) => {
      setTitles({
        activity: new Map(activities?.items.map((a) => [a.id, a.title]) ?? []),
        job: new Map(jobs?.items.map((j) => [j.id, j.company ? `${j.title}（${j.company}）` : j.title]) ?? []),
      })
    })
  }, [data])

  const SEARCHERS: Record<'activity' | 'job', (query: string) => void> = {
    activity: (query) => {
      activityService
        .list({ keyword: query || undefined, page: 1, page_size: 20 })
        .then((res) => setActivityOptions(res.items.map((a) => ({ label: a.title, value: a.id }))))
        .catch(() => setActivityOptions([]))
    },
    job: (query) => {
      jobService
        .list({ keyword: query || undefined, page: 1, page_size: 20 })
        .then((res) => setJobOptions(res.items.map((j) => ({ label: j.company ? `${j.title}（${j.company}）` : j.title, value: j.id }))))
        .catch(() => setJobOptions([]))
    },
  }

  useEffect(() => {
    if (!modalOpen) return
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
    let values: FormValues
    let jumpLink: string | null
    try {
      values = await form.validateFields()
      jumpLink = buildJumpLink(values)
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
      return
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
            <ImageUpload
              crop={{ width: 1404, height: 640, title: '首页 Banner' }}
              hint={'小程序首页轮播图\n固定裁剪输出：1404 × 640 px（约 2.2 : 1）\n上传后可拖动/缩放调整裁剪区域\n输出 JPG，单张 ≤ 5MB'}
            />
          </Form.Item>

          <JumpTargetFields options={{ activity: activityOptions, job: jobOptions }} onSearch={SEARCHERS} />

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
