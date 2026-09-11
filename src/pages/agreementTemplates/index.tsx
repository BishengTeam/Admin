import { useEffect, useState } from 'react'
import { Button, Card, Col, Collapse, Empty, Form, Input, Modal, Popconfirm, Row, Select, Space, Spin, Tag, Typography, message } from 'antd'
import { EditOutlined, FileTextOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { agreementTemplateService } from '@/services/agreementTemplate'
import { formatDate } from '@/utils/format'
import RichEditor from '@/components/RichEditor'
import type {
  AgreementTemplateItem,
  AgreementTemplateType,
} from '@/types/agreementTemplate'

const { Text, Title } = Typography

const TYPE_ORDER: AgreementTemplateType[] = ['user_terms', 'privacy', 'identity_auth']

const TYPE_CONFIG: Record<string, { text: string; color: string; desc: string }> = {
  user_terms: { text: '用户服务协议', color: 'blue', desc: '用户登录时签署' },
  privacy: { text: '隐私政策', color: 'purple', desc: '用户登录时签署' },
  identity_auth: { text: '实名信息授权', color: 'cyan', desc: '实名认证前签署' },
}

interface FormValues {
  type: AgreementTemplateType
  title: string
  content: string
}

export default function AgreementTemplateManagement() {
  const canWrite = usePermission('content:write')
  const [allItems, setAllItems] = useState<AgreementTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AgreementTemplateItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<FormValues>()

  const load = () => {
    setLoading(true)
    agreementTemplateService.list({ page: 1, page_size: 100 })
      .then((page) => setAllItems(page.items))
      .catch(() => setAllItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = (type: AgreementTemplateType) => {
    form.resetFields()
    form.setFieldsValue({ type })
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
      load()
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
      load()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '归档失败，请重试')
    }
  }

  return (
    <PageContainer title="协议模板管理">
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        同一类型仅一条生效版本；编辑保存会自动生成新版本并归档旧版，已签署用户保留其签署时的内容快照。
      </Text>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          {TYPE_ORDER.map((type) => {
            const config = TYPE_CONFIG[type]
            const items = allItems.filter((item) => item.type === type)
            const active = items.find((item) => item.status === 'active')
            const archived = items.filter((item) => item.status !== 'active')

            return (
              <Col key={type} xs={24} lg={12}>
                <Card
                  style={{ height: '100%' }}
                  title={
                    <Space>
                      <FileTextOutlined style={{ color: config.color === 'blue' ? '#1677ff' : config.color === 'purple' ? '#722ed1' : '#13c2c2' }} />
                      <span>{config.text}</span>
                      <Tag color={config.color}>{config.desc}</Tag>
                    </Space>
                  }
                  extra={
                    canWrite && (
                      <Space size={4}>
                        {active ? (
                          <>
                            <Button
                              type='text' size='small' icon={<EditOutlined />}
                              onClick={() => openEdit(active)}
                            >
                              编辑
                            </Button>
                            <Popconfirm
                              title="归档后该类型无生效模板，对应业务拦截自动放行。确定归档？"
                              onConfirm={() => void archive(active)}
                            >
                              <Button type='text' size='small' danger>归档</Button>
                            </Popconfirm>
                          </>
                        ) : (
                          <Button
                            type='link' size='small' icon={<PlusOutlined />}
                            onClick={() => openCreate(type)}
                          >
                            新建
                          </Button>
                        )}
                      </Space>
                    )
                  }
                >
                  {active ? (
                    <>
                      <Title level={5} style={{ marginBottom: 8 }}>{active.title}</Title>
                      <Space size={16} wrap style={{ marginBottom: 12 }}>
                        <Tag color="green">生效中</Tag>
                        <Text type="secondary">版本 v{active.version}</Text>
                        <Text type="secondary">更新于 {formatDate(active.updated_at)}</Text>
                      </Space>
                      <div
                        style={{
                          maxHeight: 120,
                          overflow: 'hidden',
                          lineHeight: 1.6,
                          fontSize: 13,
                          color: '#666',
                          position: 'relative',
                        }}
                        dangerouslySetInnerHTML={{ __html: active.content }}
                      />
                      <Text
                        type="secondary"
                        style={{
                          display: 'block',
                          marginTop: 8,
                          fontSize: 12,
                          textAlign: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={() => openEdit(active)}
                      >
                        点击编辑查看完整内容
                      </Text>
                    </>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span>
                          暂无生效版本
                          {canWrite && (
                            <Button
                              type='link' size='small'
                              onClick={() => openCreate(type)}
                            >
                              点击创建
                            </Button>
                          )}
                        </span>
                      }
                      style={{ padding: '20px 0' }}
                    />
                  )}

                  {archived.length > 0 && (
                    <Collapse
                      ghost
                      size="small"
                      style={{ marginTop: 12, borderTop: '1px solid #f0f0f0' }}
                      items={[
                        {
                          key: 'history',
                          label: (
                            <Space size={4}>
                              <HistoryOutlined />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                历史版本（{archived.length}）
                              </Text>
                            </Space>
                          ),
                          children: (
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              {archived.map((item) => (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '4px 8px',
                                    background: '#fafafa',
                                    borderRadius: 4,
                                    fontSize: 12,
                                  }}
                                >
                                  <Space size={8}>
                                    <Tag style={{ fontSize: 11 }}>v{item.version}</Tag>
                                    <Text type="secondary" ellipsis style={{ maxWidth: 200 }}>{item.title}</Text>
                                  </Space>
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    {formatDate(item.updated_at)}
                                  </Text>
                                </div>
                              ))}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  )}
                </Card>
              </Col>
            )
          })}
        </Row>
      </Spin>

      <Modal
        title={editing ? `编辑模板（当前 v${editing.version}）` : '新建协议模板'}
        open={creating || editing !== null}
        onCancel={closeModals}
        onOk={() => void submit()}
        okText={editing ? '保存并生成新版本' : '创建并生效'}
        okButtonProps={{ loading: saving }}
        width={860}
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
              options={TYPE_ORDER.map((type) => ({
                value: type,
                label: `${TYPE_CONFIG[type].text}（${TYPE_CONFIG[type].desc}）`,
              }))}
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
            <RichEditor height={360} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
