import { useState } from 'react'
import { Table, Button, Input, Switch, Space, Modal, Form, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { jobService } from '@/services/job'
import { formatDate } from '@/utils/format'
import type { Job } from '@/types/job'

const { TextArea } = Input

export default function JobManagement() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Job | null>(null)
  const [form] = Form.useForm()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => jobService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (item: Job) => {
    setEditingItem(item)
    form.setFieldsValue(item)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await jobService.delete(id)
    message.success('删除成功')
    refresh()
  }

  const handleToggleStatus = async (id: number, checked: boolean) => {
    await jobService.update(id, { is_active: checked })
    message.success(checked ? '已启用' : '已禁用')
    refresh()
  }

  const handleModalOk = async () => {
    const values = await form.validateFields()
    if (editingItem) {
      await jobService.update(editingItem.id, values)
      message.success('更新成功')
    } else {
      await jobService.create(values)
      message.success('创建成功')
    }
    setModalOpen(false)
    refresh()
  }

  const columns: ColumnsType<Job> = [
    { title: '职位', dataIndex: 'title', ellipsis: true },
    { title: '公司', dataIndex: 'company', ellipsis: true },
    { title: '地点', dataIndex: 'location', width: 120, render: (v: string | null) => v || '-' },
    { title: '薪资', dataIndex: 'salary_range', width: 150, render: (v: string | null) => v || '-' },
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
            title="删除职位"
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
      title="就业管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增职位</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索职位/公司..."
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
        title={editingItem ? '编辑职位' : '新增职位'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="职位" rules={[{ required: true, message: '请输入职位' }]}>
            <Input placeholder="如：前端开发工程师" />
          </Form.Item>
          <Form.Item name="company" label="公司" rules={[{ required: true, message: '请输入公司' }]}>
            <Input placeholder="如：字节跳动" />
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Input placeholder="如：北京" />
          </Form.Item>
          <Form.Item name="salary_range" label="薪资范围">
            <Input placeholder="如：15k-30k" />
          </Form.Item>
          <Form.Item name="description" label="职位描述">
            <TextArea rows={3} placeholder="职位描述..." />
          </Form.Item>
          <Form.Item name="requirements" label="任职要求">
            <TextArea rows={3} placeholder="任职要求..." />
          </Form.Item>
          <Form.Item name="contact_info" label="联系方式">
            <Input placeholder="邮箱或电话" />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
