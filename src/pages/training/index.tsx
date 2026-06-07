import { useState } from 'react'
import { Table, Button, Input, Switch, Space, Image, Modal, Form, InputNumber, DatePicker, message } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { usePagination } from '@/hooks/usePagination'
import { trainingService } from '@/services/training'
import { formatDate } from '@/utils/format'
import { requiredRule } from '@/utils/validator'
import type { Training } from '@/types/training'

const { RangePicker } = DatePicker

export default function TrainingManagement() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Training | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [form] = Form.useForm()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => trainingService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, max_participants: 0 })
    setModalOpen(true)
  }

  const handleEdit = (item: Training) => {
    setEditingItem(item)
    form.setFieldsValue({
      ...item,
      time_range: [
        item.start_time ? dayjs(item.start_time) : null,
        item.end_time ? dayjs(item.end_time) : null,
      ],
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await trainingService.delete(id)
    message.success('已下架')
    setSelectedRowKeys((prev) => prev.filter((k) => k !== id))
    refresh()
  }

  const handleBatchDelete = async () => {
    await Promise.all(selectedRowKeys.map((id) => trainingService.delete(id)))
    message.success(`已下架 ${selectedRowKeys.length} 个培训`)
    setSelectedRowKeys([])
    refresh()
  }

  const rowSelection: TableRowSelection<Training> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys as number[]),
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const [start, end] = values.time_range || []
    const payload = {
      ...values,
      start_time: start ? start.toISOString() : null,
      end_time: end ? end.toISOString() : null,
    }
    delete payload.time_range

    if (editingItem) {
      await trainingService.update(editingItem.id, payload)
      message.success('更新成功')
    } else {
      await trainingService.create(payload)
      message.success('添加成功')
    }
    setModalOpen(false)
    refresh()
  }

  const handleToggleStatus = async (id: number, checked: boolean) => {
    await trainingService.update(id, { is_active: checked })
    message.success(checked ? '已上架' : '已下架')
    refresh()
  }

  const columns: ColumnsType<Training> = [
    {
      title: '封面',
      dataIndex: 'cover_url',
      width: 80,
      render: (url: string) => url ? <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 48, height: 48, background: '#f0f0f0', borderRadius: 4 }} />,
    },
    { title: '培训名称', dataIndex: 'title', width: 200, ellipsis: true },
    { title: '地点', dataIndex: 'location', width: 140 },
    {
      title: '时间',
      width: 220,
      render: (_, r) => {
        const s = r.start_time?.slice(0, 16) || '-'
        const e = r.end_time?.slice(0, 16) || '-'
        return `${s} ~ ${e}`
      },
    },
    { title: '名额', dataIndex: 'max_participants', width: 80 },
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
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <ConfirmButton
            title="下架培训"
            description="确认下架此培训？"
            danger
            type="link"
            size="small"
            onConfirm={() => handleDelete(record.id)}
          >
            下架
          </ConfirmButton>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer
      title="培训管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增培训</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索培训..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 240 }}
          onPressEnter={() => setSearchText(keyword)}
          allowClear
        />
        <Button type="primary" onClick={() => setSearchText(keyword)}>查询</Button>
        <Button onClick={() => { setKeyword(''); setSearchText(''); }}>重置</Button>
        {selectedRowKeys.length > 0 && (
          <ConfirmButton
            title="批量下架"
            description={`确认下架选中的 ${selectedRowKeys.length} 个培训？`}
            danger
            icon={<DeleteOutlined />}
            onConfirm={handleBatchDelete}
          >
            下架 ({selectedRowKeys.length})
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
        title={editingItem ? '编辑培训' : '新增培训'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="培训名称" rules={[requiredRule('培训名称')]}>
            <Input placeholder="请输入培训名称" />
          </Form.Item>
          <Form.Item name="cover_url" label="封面图">
            <ImageUpload />
          </Form.Item>
          <Form.Item name="description" label="培训描述">
            <Input.TextArea rows={3} placeholder="培训简介" />
          </Form.Item>
          <Space size={16}>
            <Form.Item name="location" label="地点">
              <Input placeholder="培训地点" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="max_participants" label="名额上限">
              <InputNumber min={0} style={{ width: 130 }} />
            </Form.Item>
          </Space>
          <Form.Item name="time_range" label="培训时间">
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
