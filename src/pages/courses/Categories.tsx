import { useCallback, useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Switch, Table, Tag, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { courseManagementService } from '@/services/courseManagement'
import type { CourseCategory } from '@/types/course'

export default function CourseCategoriesPage() {
  const [rows, setRows] = useState<CourseCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<{ name: string; sort_order: number; is_active: boolean }>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await courseManagementService.listCategories())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const columns: ColumnsType<CourseCategory> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '类目名称', dataIndex: 'name' },
    { title: '排序', dataIndex: 'sort_order', width: 100 },
    { title: '状态', dataIndex: 'is_active', width: 100, render: value => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag> },
    { title: '更新时间', dataIndex: 'updated_at', width: 180 },
    {
      title: '操作',
      width: 130,
      render: (_, record) => (
        <ConfirmButton
          title={record.is_active ? '停用类目' : '启用类目'}
          description="已有课程保留原类目；新编辑课程只能选择启用类目。"
          type="link"
          size="small"
          onConfirm={async () => {
            await courseManagementService.updateCategory(record.id, { is_active: !record.is_active })
            await load()
          }}
        >
          {record.is_active ? '停用' : '启用'}
        </ConfirmButton>
      ),
    },
  ]

  return (
    <PageContainer
      title="类目管理"
      extra={(
        <>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true) }}>新增类目</Button>
        </>
      )}
    >
      <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={false} />
      <Modal
        title="新增课程类目"
        open={open}
        onOk={async () => {
          const values = await form.validateFields()
          await courseManagementService.createCategory(values)
          message.success('类目已创建')
          setOpen(false)
          await load()
        }}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ sort_order: 0, is_active: true }}>
          <Form.Item name="name" label="类目名称" rules={[{ required: true, whitespace: true, message: '请输入类目名称' }]}>
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" rules={[{ required: true }]}>
            <InputNumber min={0} precision={0} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
