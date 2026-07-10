import { useState } from 'react'
import { Table, Button, Input, Switch, Space, Modal, Form, message, InputNumber } from 'antd'
import { DownloadOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { useExport } from '@/hooks/useExport'
import { certificationService } from '@/services/certification'
import { formatDate, formatPrice } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import type { Certification, CertificationPayload } from '@/types/certification'
import CertificationDetailDrawer from './components/CertificationDetailDrawer'

const defaultFormValues: CertificationPayload = {
  code: '',
  vendor: '',
  normal_price: 0,
  student_price: 0,
  is_active: true,
}

export default function CertificationManagement() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Certification | null>(null)
  const [detailItem, setDetailItem] = useState<Certification | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState('basic')
  const [form] = Form.useForm<CertificationPayload>()
  const { exporting, startExport, finishExport } = useExport()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => certificationService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue(defaultFormValues)
    setModalOpen(true)
  }

  const handleEdit = (item: Certification) => {
    setEditingItem(item)
    form.setFieldsValue({
      code: item.code,
      vendor: item.vendor,
      normal_price: item.normal_price,
      student_price: item.student_price,
      is_active: item.is_active,
    })
    setModalOpen(true)
  }

  const handleOpenDetail = (item: Certification, tab = 'basic') => {
    setDetailItem(item)
    setDetailTab(tab)
    setDetailOpen(true)
  }

  const handleDelete = async (id: number) => {
    await certificationService.delete(id)
    message.success('下架成功')
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

  const handleExport = async () => {
    startExport()
    try {
      const blob = await certificationService.export({ keyword: searchText || undefined })
      downloadBlob(blob, `认证数据_${new Date().toISOString().slice(0, 10)}.xlsx`)
      message.success('导出成功')
    } finally {
      finishExport()
    }
  }

  const columns: ColumnsType<Certification> = [
    { title: '认证代码', dataIndex: 'code', width: 140, ellipsis: true },
    { title: '厂商', dataIndex: 'vendor', width: 100 },
    {
      title: '普通价格',
      dataIndex: 'normal_price',
      width: 120,
      render: (price: number) => formatPrice(price),
    },
    {
      title: '学生价格',
      dataIndex: 'student_price',
      width: 120,
      render: (price: number) => formatPrice(price),
    },
    {
      title: '上架状态',
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
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (t: string) => formatDate(t),
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleOpenDetail(record)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => handleOpenDetail(record, 'plans')}>
            批次
          </Button>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <ConfirmButton
            title="下架认证"
            description="确认下架此认证？下架后不能再创建订单。"
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
      title="认证管理"
      extra={[
        <Button key="export" icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
            导出
        </Button>,
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增认证</Button>,
      ]}
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索认证代码/厂商..."
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
        <Form form={form} layout="vertical" initialValues={defaultFormValues}>
          <Form.Item
            name="code"
            label="认证代码"
            rules={[
              { required: true, message: '请输入认证代码' },
              { whitespace: true, message: '认证代码不能只包含空格' },
            ]}
          >
            <Input placeholder="如：H3C-NE" />
          </Form.Item>
          <Form.Item name="vendor" label="厂商" rules={[{ required: true, message: '请输入厂商' }]}>
            <Input placeholder="如：H3C" />
          </Form.Item>
          <Form.Item
            name="normal_price"
            label="普通价格"
            rules={[{ required: true, message: '请输入普通价格' }]}
          >
            <InputNumber min={0} precision={0} addonAfter="分" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="student_price"
            label="学生价格"
            rules={[{ required: true, message: '请输入学生价格' }]}
          >
            <InputNumber min={0} precision={0} addonAfter="分" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="上架状态" valuePropName="checked">
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Form>
      </Modal>

      <CertificationDetailDrawer
        open={detailOpen}
        certification={detailItem}
        activeKey={detailTab}
        onTabChange={setDetailTab}
        onClose={() => setDetailOpen(false)}
      />
    </PageContainer>
  )
}
