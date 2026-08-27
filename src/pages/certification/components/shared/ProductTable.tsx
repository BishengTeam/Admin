import { useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { certProductService } from '@/services/certProduct'
import type { CertProduct, CertProductCreatePayload, CertProductUpdatePayload } from '@/types/certProduct'
import type { CertType } from '../vendors/type-registry'

const { Text } = Typography

interface ProductTableProps {
  type: CertType
}

const defaultFormValues: CertProductCreatePayload = {
  type: '',
  code: '',
  name: '',
  chinese_name: '',
  description: '',
  is_active: true,
  sort_order: 0,
}

export default function ProductTable({ type }: ProductTableProps) {
  const canWrite = usePermission('content:write')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CertProduct | null>(null)
  const [form] = Form.useForm<CertProductCreatePayload & CertProductUpdatePayload>()

  const { data, loading, pagination, refresh } = usePagination(
    (params) => certProductService.list({ type, ...params }),
    [type],
  )

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ ...defaultFormValues, type })
    setModalOpen(true)
  }

  const handleEdit = (item: CertProduct) => {
    setEditingItem(item)
    form.setFieldsValue({
      code: item.code,
      name: item.name,
      chinese_name: item.chinese_name,
      description: item.description ?? '',
      is_active: item.is_active,
      sort_order: item.sort_order,
    })
    setModalOpen(true)
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    if (editingItem) {
      const { type: _t, ...updateData } = values
      await certProductService.update(editingItem.code, updateData)
      message.success('更新成功')
    } else {
      await certProductService.create(values as CertProductCreatePayload)
      message.success('创建成功')
    }
    setModalOpen(false)
    refresh()
  }

  const handleDeactivate = async (item: CertProduct) => {
    await certProductService.deactivate(item.code)
    message.success('已下架')
    refresh()
  }

  const columns: ColumnsType<CertProduct> = [
    { title: '产品编码', dataIndex: 'code', width: 140 },
    { title: '中文名', dataIndex: 'chinese_name', width: 160 },
    { title: '英文名', dataIndex: 'name', ellipsis: true },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (v: string | null) => v || '-' },
    { title: '排序', dataIndex: 'sort_order', width: 80, align: 'right' },
    {
      title: '状态', dataIndex: 'is_active', width: 90,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', width: canWrite ? 160 : 80,
      render: (_, record) => (
        <Space size={0}>
          {canWrite && <Button type='link' size='small' onClick={() => handleEdit(record)}>编辑</Button>}
          {canWrite && record.is_active && (
            <Button type='link' size='small' danger onClick={() => handleDeactivate(record)}>下架</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          {canWrite && <Button type='primary' icon={<PlusOutlined />} onClick={handleAdd}>新增产品</Button>}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>刷新</Button>
        </Space>
        <Text type='secondary'>共 {data?.total ?? 0} 个产品</Text>
      </div>
      <Table rowKey='id' columns={columns} dataSource={data?.items} loading={loading} pagination={pagination} scroll={{ x: 900 }} size='middle' />

      <Modal
        title={editingItem ? '编辑认证产品' : '新增认证产品'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout='vertical' initialValues={defaultFormValues} style={{ marginTop: 16 }}>
          {!editingItem && (
            <Form.Item name='type' label='认证类型'>
              <Input disabled />
            </Form.Item>
          )}
          <Form.Item name='code' label='产品编码' rules={[{ required: true, message: '请输入产品编码' }]}
            tooltip='唯一标识，如 H3CNE、RS-ZY'
          >
            <Input placeholder='如 H3CNE' maxLength={32} />
          </Form.Item>
          <Form.Item name='chinese_name' label='中文名' rules={[{ required: true, message: '请输入中文名' }]}>
            <Input placeholder='如 H3C 网络工程师' maxLength={128} />
          </Form.Item>
          <Form.Item name='name' label='英文名' rules={[{ required: true, message: '请输入英文名' }]}>
            <Input placeholder='如 H3CNE' maxLength={64} />
          </Form.Item>
          <Form.Item name='description' label='描述'>
            <Input.TextArea rows={3} placeholder='可选' maxLength={512} showCount />
          </Form.Item>
          <Space align='start' style={{ display: 'flex' }} size={24}>
            <Form.Item name='sort_order' label='排序' rules={[{ required: true }]}>
              <InputNumber min={0} precision={0} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name='is_active' label='上架状态' valuePropName='checked'>
              <Switch checkedChildren='上架' unCheckedChildren='下架' />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  )
}
