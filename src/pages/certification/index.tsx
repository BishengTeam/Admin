import { useState } from 'react'
import { Table, Button, Input, Switch, Space, Modal, Form, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { certificationService } from '@/services/certification'
import { formatDate } from '@/utils/format'
import type { Certification } from '@/types/certification'

export default function CertificationManagement() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Certification | null>(null)
  const [form] = Form.useForm()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => certificationService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (item: Certification) => {
    setEditingItem(item)
    form.setFieldsValue(item)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await certificationService.delete(id)
    message.success('删除成功')
    refresh()
  }

  const handleToggleStatus = async (id: number, checked: boolean) => {
    await certificationService.update(id, { is_active: checked })
    message.success(checked ? '已启用' : '已禁用')
    refresh()
  }

  const handleModalOk = async () => {
    const values = await form.validateFields()
    if (editingItem) {
      await certificationService.update(editingItem.id, values)
      message.success('更新成功')
    } else {
      await certificationService.create(values)
      message.success('创建成功')
    }
    setModalOpen(false)
    refresh()
  }

  const columns: ColumnsType<Certification> = [
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '中文名', dataIndex: 'chinese_name', ellipsis: true },
    { title: '代码', dataIndex: 'code', width: 120 },
    { title: '厂商', dataIndex: 'vendor', width: 100 },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (is_active: boolean, record) => (
        <Switch
          checked={is_active}
          onChange={(checked) => handleToggleStatus(record.id, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
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
            title="删除认证"
            description="此操作不可撤销，确认删除？"
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
      title="认证管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增认证</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索名称/中文名/代码..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 240 }}
          onPressEnter={() => setSearchText(keyword)}
          allowClear
        />
        <Button type="primary" onClick={() => setSearchText(keyword)}>查询</Button>
        <Button onClick={() => { setKeyword(''); setSearchText(''); }}>重置</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
      />

      <Modal
        title={editingItem ? '编辑认证' : '新增认证'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：H3CNE" />
          </Form.Item>
          <Form.Item name="chinese_name" label="中文名" rules={[{ required: true, message: '请输入中文名' }]}>
            <Input placeholder="如：H3C认证网络工程师" />
          </Form.Item>
          <Form.Item name="code" label="代码" rules={[{ required: true, message: '请输入代码' }]}>
            <Input placeholder="如：h3cne" />
          </Form.Item>
          <Form.Item name="vendor" label="厂商" rules={[{ required: true, message: '请输入厂商' }]}>
            <Input placeholder="sangfor / nisp / renshe" />
          </Form.Item>
          <Form.Item name="requires_xuexin" label="需要学信网" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="pay_first" label="先付费" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
