import { useState } from 'react'
import { Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { usePagination } from '@/hooks/usePagination'
import { agreementTemplateService } from '@/services/agreementTemplate'
import { formatDate } from '@/utils/format'
import type {
  AgreementTemplateItem,
  AgreementTemplateType,
} from '@/types/agreementTemplate'

const { Text } = Typography

const TYPE_CONFIG: Record<string, { text: string; color: string }> = {
  user_terms: { text: '用户服务协议', color: 'blue' },
  privacy: { text: '隐私政策', color: 'purple' },
  identity_auth: { text: '实名信息授权', color: 'cyan' },
}

interface FormValues {
  type: AgreementTemplateType
  title: string
  content: string
}

export default function AgreementTemplateManagement() {
  const canWrite = usePermission('content:write')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [editing, setEditing] = useState<AgreementTemplateItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<FormValues>()

  const { data, loading, pagination, refresh } = usePagination(
    page =>
      agreementTemplateService.list({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        ...page,
      }),
    [typeFilter, statusFilter],
  )

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ type: 'user_terms' })
    setCreating(true)
  }

  const openEdit = (record: AgreementTemplateItem) => {
    form.setFieldsValue({ type: record.type, title: record.title, content: record.content })
    setEditing(record)
  }

  const closeModals = () => {
    setCreating(false)
    setEditing(null)
  }

  const submit = async () => {
    if (saving) return
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editing) {
        const created = await agreementTemplateService.update(editing.id, {
          title: values.title,
          content: values.content,
        })
        message.success(`已生成新版本 v${created.version}，旧版本已归档`)
      } else {
        const created = await agreementTemplateService.create(values)
        message.success(`模板已创建并生效（v${created.version}）`)
      }
      closeModals()
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const archive = async (record: AgreementTemplateItem) => {
    try {
      await agreementTemplateService.archive(record.id)
      message.success('模板已归档；该类型拦截自动放行，历史签署记录保留')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '归档失败，请重试')
    }
  }

  const columns: ColumnsType<AgreementTemplateItem> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 130,
      render: (value: string) => {
        const config = TYPE_CONFIG[value]
        return <Tag color={config?.color}>{config?.text ?? value}</Tag>
      },
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '版本', dataIndex: 'version', width: 80, render: (value: number) => `v${value}` },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) =>
        value === 'active' ? <Tag color="green">生效中</Tag> : <Tag>已归档</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (value: string) => formatDate(value) },
    { title: '更新时间', dataIndex: 'updated_at', width: 170, render: (value: string) => formatDate(value) },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      render: (_, record) => (
        <Space>
          {canWrite && (
            <a onClick={() => openEdit(record)}>编辑</a>
          )}
          {canWrite && record.status === 'active' && (
            <Popconfirm
              title="归档后该类型无生效模板，对应业务拦截自动放行；历史签署记录保留。确定归档？"
              onConfirm={() => void archive(record)}
            >
              <a>归档</a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer title="协议模板管理">
      <Tabs
        activeKey={typeFilter}
        onChange={key => setTypeFilter(key)}
        items={[
          { key: '', label: '全部' },
          { key: 'user_terms', label: '用户服务协议' },
          { key: 'privacy', label: '隐私政策' },
          { key: 'identity_auth', label: '实名信息授权' },
        ]}
        style={{ marginBottom: 8 }}
      />
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 140 }}
          options={[
            { value: '', label: '全部状态' },
            { value: 'active', label: '生效中' },
            { value: 'archived', label: '已归档' },
          ]}
        />
        {canWrite && (
          <a onClick={openCreate} style={{ fontSize: 14 }}>
            + 新建模板
          </a>
        )}
      </Space>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        同一类型仅一条生效版本；编辑保存会自动生成新版本并归档旧版，已签署用户保留其签署时的内容快照。
      </Text>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
      />

      <Modal
        title={editing ? `编辑模板（当前 v${editing.version}）` : '新建协议模板'}
        open={creating || editing !== null}
        onCancel={closeModals}
        onOk={() => void submit()}
        okText={editing ? '保存并生成新版本' : '创建并生效'}
        okButtonProps={{ loading: saving }}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="type"
            label="协议类型"
            rules={[{ required: true }]}
          >
            <Select
              disabled={editing !== null}
              options={[
                { value: 'user_terms', label: '用户服务协议（登录时签署）' },
                { value: 'privacy', label: '隐私政策（登录时签署）' },
                { value: 'identity_auth', label: '实名信息授权协议（实名认证前签署）' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入协议标题' }, { max: 128, message: '标题不超过 128 字' }]}
          >
            <Input placeholder="如：智天远优学用户服务协议" maxLength={128} />
          </Form.Item>
          <Form.Item
            name="content"
            label="协议正文"
            rules={[{ required: true, message: '请输入协议正文' }]}
            extra={editing ? '保存后旧版本自动归档，生成新版本号；已签署用户不受影响' : undefined}
          >
            <Input.TextArea rows={12} placeholder="粘贴协议全文；支持多段文本" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
