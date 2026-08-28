import { useState } from 'react'
import { Table, Button, Input, Switch, Space, Modal, Form, Row, Col, Divider, Tag, Typography, message } from 'antd'
import { PlusOutlined, SearchOutlined, IdcardOutlined, EnvironmentOutlined, WalletOutlined, PhoneOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { jobService } from '@/services/job'
import { formatDate } from '@/utils/format'
import type { Job } from '@/types/job'

const { TextArea } = Input
const { Text } = Typography

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
    form.setFieldsValue({ is_active: true })
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
    { title: '薪资', dataIndex: 'salary_range', width: 130, render: (v: string | null) => v ? <Tag color='cyan'>{v}</Tag> : '-' },
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
    <PageContainer title="招聘管理">
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
        title={
          <Space>
            <IdcardOutlined style={{ color: '#13C2C2' }} />
            <span>{editingItem ? `编辑职位 · ${editingItem.title}` : '新增职位'}</span>
          </Space>
        }
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        okText={editingItem ? '保存' : '创建'}
        cancelText='取消'
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }} requiredMark='optional'>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '4px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>基本信息</Text>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="职位名称" rules={[{ required: true, message: '请输入职位名称' }]}>
                <Input placeholder="如：网络工程师" maxLength={256} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="company" label="公司" rules={[{ required: true, message: '请输入公司' }]}>
                <Input placeholder="如：新华三集团" maxLength={128} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="location" label='工作地点'
              >
                <Input prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} placeholder="如：杭州" maxLength={128} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="salary_range" label='薪资范围'
                tooltip='展示给求职者的薪资文案，如 15k-25k、面议'
              >
                <Input prefix={<WalletOutlined style={{ color: '#bfbfbf' }} />} placeholder="如：15k-25k" maxLength={64} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '8px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>职位详情</Text>
          </Divider>

          <Form.Item name="description" label="职位描述">
            <TextArea rows={4} placeholder="岗位职责、工作内容等" maxLength={2000} showCount />
          </Form.Item>

          <Form.Item name="requirements" label="任职要求">
            <TextArea rows={4} placeholder="学历、技能、经验要求等" maxLength={2000} showCount />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '8px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>联系方式与上架</Text>
          </Divider>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="contact_info"
                label={<Space size={4}><PhoneOutlined style={{ color: '#13C2C2' }} />联系方式</Space>}
                rules={[{ required: true, message: '请输入联系方式' }]}
                tooltip='求职者通过此方式联系企业（投递功能已下线）'
              >
                <Input placeholder="邮箱或电话" maxLength={256} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="is_active" label='上架状态' valuePropName='checked' initialValue={true}>
                <Switch checkedChildren='上架' unCheckedChildren='下架' />
              </Form.Item>
            </Col>
          </Row>

          <Text type='secondary' style={{ fontSize: 12 }}>
            上架后职位立即展示在小程序就业专区；求职者点击卡片可查看详情并复制联系方式。
          </Text>
        </Form>
      </Modal>
    </PageContainer>
  )
}
