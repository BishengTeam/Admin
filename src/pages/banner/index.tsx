import { useState } from 'react'
import { Table, Button, Input, Switch, Space, Modal, Form, Select, InputNumber, DatePicker, Tag, Image, message } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { usePagination } from '@/hooks/usePagination'
import { bannerService } from '@/services/banner'
import { formatDate } from '@/utils/format'
import { requiredRule } from '@/utils/validator'
import type { Banner, BannerTargetType } from '@/types/banner'
import { BANNER_TARGET_LABELS } from '@/types/banner'

const { RangePicker } = DatePicker

const TARGET_TYPE_OPTIONS: { label: string; value: BannerTargetType }[] = (
  Object.entries(BANNER_TARGET_LABELS) as [BannerTargetType, string][]
).map(([value, label]) => ({ label, value }))

export default function BannerManagement() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Banner | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [form] = Form.useForm()

  const targetType = Form.useWatch('target_type', form)

  const { data, loading, pagination, refresh } = usePagination(
    (page) => bannerService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, sort: 0 })
    setModalOpen(true)
  }

  const handleEdit = (item: Banner) => {
    setEditingItem(item)
    form.setFieldsValue({
      image_url: item.image_url || '',
      jump_link: item.jump_link || '',
      target_type: item.target_type || undefined,
      target_id: item.target_id ?? undefined,
      sort: item.sort,
      is_active: item.is_active,
      time_range: [
        item.start_time ? dayjs(item.start_time) : null,
        item.end_time ? dayjs(item.end_time) : null,
      ],
    })
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
    const [start, end] = values.time_range || []
    const payload: Record<string, unknown> = {
      image_url: values.image_url,
      jump_link: values.jump_link || null,
      target_type: values.target_type || null,
      target_id: values.target_type && values.target_type !== 'url' ? (values.target_id ?? null) : null,
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

  const columns: ColumnsType<Banner> = [
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
      title: '跳转类型',
      dataIndex: 'target_type',
      width: 90,
      render: (t: BannerTargetType | null) =>
        t ? <Tag color="blue">{BANNER_TARGET_LABELS[t]}</Tag> : <Tag>无</Tag>,
    },
    {
      title: '跳转目标',
      width: 150,
      ellipsis: true,
      render: (_, r) => {
        if (r.target_type === 'url') return r.jump_link ? <a>{r.jump_link}</a> : '-'
        if (r.target_type && r.target_id) return `ID: ${r.target_id}`
        return '-'
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
  ]

  return (
    <PageContainer
      title="Banner 管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增 Banner
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索 Banner..."
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
          <Form.Item name="image_url" label="封面图" rules={[requiredRule('封面图')]}>
            <ImageUpload />
          </Form.Item>

          <Form.Item name="target_type" label="跳转类型">
            <Select
              placeholder="选择跳转类型"
              options={TARGET_TYPE_OPTIONS}
              allowClear
            />
          </Form.Item>

          {targetType && targetType !== 'url' && (
            <Form.Item name="target_id" label="目标资源 ID">
              <InputNumber min={1} style={{ width: '100%' }} placeholder="输入资源 ID" />
            </Form.Item>
          )}

          {targetType === 'url' && (
            <Form.Item name="jump_link" label="外链地址">
              <Input placeholder="https://..." />
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
    </PageContainer>
  )
}
