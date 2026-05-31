import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Switch, Space, Image, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { StatusTag } from '@/components/StatusTag'
import { contentService } from '@/services/content'
import { CONTENT_STATUS_MAP } from '@/core/constants'
import { requiredRule, urlRule } from '@/utils/validator'
import type { Banner } from '@/types/content'

const { RangePicker } = DatePicker

export default function BannerConfig() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [form] = Form.useForm()

  const loadBanners = async () => {
    setLoading(true)
    try {
      const data = await contentService.listBanners()
      setBanners(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBanners()
  }, [])

  const handleAdd = () => {
    setEditingBanner(null)
    setModalOpen(true)
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    form.setFieldsValue({
      ...banner,
      time_range: [banner.start_time, banner.end_time],
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await contentService.deleteBanner(id)
    message.success('删除成功')
    loadBanners()
  }

  const handleBatchDelete = async () => {
    await contentService.deleteBanners(selectedRowKeys as number[])
    message.success(`成功删除 ${selectedRowKeys.length} 个Banner`)
    setSelectedRowKeys([])
    loadBanners()
  }

  const rowSelection: TableRowSelection<Banner> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const [start_time, end_time] = values.time_range || []
    const data = {
      image_url: values.image_url,
      jump_link: values.jump_link,
      sort: values.sort || 0,
      start_time,
      end_time,
      is_active: values.is_active === true,
    }

    if (editingBanner) {
      await contentService.updateBanner(editingBanner.id, data)
      message.success('更新成功')
    } else {
      await contentService.createBanner(data)
      message.success('添加成功')
    }
    setModalOpen(false)
    loadBanners()
  }

  const columns: ColumnsType<Banner> = [
    {
      title: '图片',
      dataIndex: 'image_url',
      width: 120,
      render: (url: string) =>
        url ? <Image src={url} width={96} height={54} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 96, height: 54, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>无图片</div>,
    },
    { title: '跳转链接', dataIndex: 'jump_link', ellipsis: true },
    {
      title: '排序',
      dataIndex: 'sort',
      width: 80,
    },
    {
      title: '有效期',
      width: 240,
      render: (_, record) => `${record.start_time?.slice(0, 10) || '-'} ~ ${record.end_time?.slice(0, 10) || '-'}`,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (v: boolean) => <StatusTag status={v} map={CONTENT_STATUS_MAP} />,
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <ConfirmButton
            title="删除Banner"
            description="此操作不可撤销，确认删除此Banner？"
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
      title="Banner配置"
      extra={
        <Space>
          {selectedRowKeys.length > 0 && (
            <ConfirmButton
              title="批量删除"
              description={`确认删除选中的 ${selectedRowKeys.length} 个Banner？此操作不可撤销。`}
              danger
              icon={<DeleteOutlined />}
              onConfirm={handleBatchDelete}
            >
              删除 ({selectedRowKeys.length})
            </ConfirmButton>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增Banner</Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={banners} loading={loading} pagination={false} rowSelection={rowSelection} />

      <Modal
        title={editingBanner ? '编辑Banner' : '新增Banner'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ sort: 0, is_active: true }}>
          <Form.Item name="image_url" label="图片" rules={[requiredRule('图片')]}>
            <ImageUpload />
          </Form.Item>
          <Form.Item name="jump_link" label="跳转链接" rules={[urlRule]}>
            <Input placeholder="请输入跳转链接" />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="数字越大越靠前" />
          </Form.Item>
          <Form.Item name="time_range" label="有效期">
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
