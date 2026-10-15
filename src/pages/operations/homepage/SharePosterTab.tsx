import { useState } from 'react'
import { Button, Form, Image, Modal, Space, Switch, Table, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { usePagination } from '@/hooks/usePagination'
import { sharePosterService } from '@/services/sharePoster'
import { formatDate } from '@/utils/format'
import { requiredRule } from '@/utils/validator'
import type { SharePoster } from '@/types/sharePoster'

type FormValues = {
  image_url?: string
  is_active?: boolean
}

export default function SharePosterTab() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SharePoster | null>(null)
  const [form] = Form.useForm<FormValues>()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => sharePosterService.list({ ...page }),
    [],
  )

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setModalOpen(true)
  }

  const handleEdit = (item: SharePoster) => {
    setEditingItem(item)
    form.setFieldsValue({
      image_url: item.image_url || '',
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await sharePosterService.delete(id)
    message.success('已删除')
    refresh()
  }

  const handleToggleStatus = async (id: number, checked: boolean) => {
    await sharePosterService.update(id, { is_active: checked })
    message.success(checked ? '已上架' : '已下架')
    refresh()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const payload = {
      image_url: values.image_url,
      is_active: values.is_active ?? true,
    }
    if (editingItem) {
      await sharePosterService.update(editingItem.id, payload)
      message.success('更新成功')
    } else {
      await sharePosterService.create(payload)
      message.success('添加成功')
    }
    setModalOpen(false)
    refresh()
  }

  const columns: ColumnsType<SharePoster> = [
    {
      title: '海报',
      dataIndex: 'image_url',
      width: 100,
      render: (url: string) =>
        url ? (
          <Image src={url} width={54} height={72} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div style={{ width: 54, height: 72, background: '#f0f0f0', borderRadius: 4 }} />
        ),
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
            title="删除分享海报"
            description="确认删除此分享海报？删除后小程序端入口将置灰。"
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
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          上传分享海报
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
      />

      <Modal
        title={editingItem ? '编辑分享海报' : '上传分享海报'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="image_url" label="海报图" rules={[requiredRule('海报图')]}>
            <ImageUpload
              crop={{ width: 1200, height: 1600, title: '分享海报', fixed: true }}
              hint={'小程序「分享好友」页推广海报（竖版）\n固定裁剪输出：1200 × 1600 px（3 : 4）\n裁剪框大小固定，拖动选择截取位置\n用户在小程序预览后长按可保存到相册\n输出 JPG，单张 ≤ 5MB'}
            />
          </Form.Item>

          <Form.Item name="is_active" label="状态" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
