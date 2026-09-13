import { useEffect, useState } from 'react'
import {
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { EditOutlined, HistoryOutlined, InboxOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { agreementTemplateService } from '@/services/agreementTemplate'
import { formatDate } from '@/utils/format'
import RichEditor from '@/components/RichEditor'
import ProtocolCard from './ProtocolCard'
import styles from './index.module.css'
import type {
  AgreementTemplateItem,
  AgreementTemplateType,
} from '@/types/agreementTemplate'

const { Text } = Typography

const TYPE_ORDER: AgreementTemplateType[] = [
  'user_terms',
  'privacy',
  'identity_auth',
  'cert_registration',
]

const TYPE_CONFIG: Record<AgreementTemplateType, { text: string; desc: string }> = {
  user_terms: { text: '用户服务协议', desc: '用户登录时签署' },
  privacy: { text: '隐私政策', desc: '用户登录时签署' },
  identity_auth: { text: '实名信息授权', desc: '实名认证前签署' },
  cert_registration: { text: '认证报名授权', desc: '认证报名前签署' },
}

const HISTORY_PAGE_SIZE = 8

interface FormValues {
  type: AgreementTemplateType
  title: string
  content: string
}

export default function AgreementTemplateManagement() {
  const canWrite = usePermission('content:write')
  const [activeItems, setActiveItems] = useState<AgreementTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AgreementTemplateItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState<AgreementTemplateItem | null>(null)
  const [historyType, setHistoryType] = useState<AgreementTemplateType | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyItems, setHistoryItems] = useState<AgreementTemplateItem[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [form] = Form.useForm<FormValues>()

  const load = () => {
    setLoading(true)
    agreementTemplateService
      .list({ status: 'active', page: 1, page_size: 20 })
      .then((page) => setActiveItems(page.items))
      .catch(() => setActiveItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const loadHistory = async (type: AgreementTemplateType, page = 1) => {
    setHistoryLoading(true)
    try {
      const result = await agreementTemplateService.list({
        type,
        status: 'archived',
        page,
        page_size: HISTORY_PAGE_SIZE,
      })
      setHistoryItems(result.items)
      setHistoryTotal(result.total)
      setHistoryPage(page)
    } catch {
      setHistoryItems([])
      setHistoryTotal(0)
    } finally {
      setHistoryLoading(false)
    }
  }

  const openHistory = async (type: AgreementTemplateType) => {
    setHistoryType(type)
    setHistoryOpen(true)
    await loadHistory(type)
  }

  const openCreate = (type: AgreementTemplateType) => {
    form.resetFields()
    form.setFieldsValue({ type })
    setCreating(true)
  }

  const openEdit = (record: AgreementTemplateItem) => {
    form.setFieldsValue({
      type: record.type,
      title: record.title,
      content: record.content,
    })
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
        message.success(`已生成新版本 v${created.version}，旧版本已自动归档`)
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
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        同一类型仅一条生效版本；编辑保存会自动生成新版本并归档旧版，已签署用户保留其签署时的内容快照。
      </Text>

      <Spin spinning={loading}>
        <div className={styles.shelf}>
          {TYPE_ORDER.map((type) => {
            const config = TYPE_CONFIG[type]
            const active = activeItems.find((item) => item.type === type)

            return (
              <ProtocolCard
                key={type}
                type={type}
                typeText={config.text}
                item={active}
                canWrite={canWrite}
                onPreview={setPreviewing}
                onCreate={openCreate}
                onHistory={(value) => void openHistory(value)}
              />
            )
          })}
        </div>
      </Spin>

      <Modal
        title={previewing?.title}
        open={previewing !== null}
        onCancel={() => setPreviewing(null)}
        footer={
          previewing ? (
            previewing.status === 'active' ? (
              <Space wrap>
                {canWrite && (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => {
                      const record = previewing
                      setPreviewing(null)
                      openEdit(record)
                    }}
                  >
                    编辑协议
                  </Button>
                )}
                {canWrite && (
                  <Popconfirm
                    title="归档后该类型无生效模板，对应业务拦截自动放行。确定归档？"
                    onConfirm={() => {
                      const record = previewing
                      setPreviewing(null)
                      void archive(record)
                    }}
                  >
                    <Button danger icon={<InboxOutlined />}>
                      归档
                    </Button>
                  </Popconfirm>
                )}
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => {
                    const recordType = previewing.type
                    setPreviewing(null)
                    void openHistory(recordType)
                  }}
                >
                  历史版本
                </Button>
                <Button onClick={() => setPreviewing(null)}>关闭</Button>
              </Space>
            ) : (
              <Space>
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => {
                    const recordType = previewing.type
                    setPreviewing(null)
                    void openHistory(recordType)
                  }}
                >
                  历史版本
                </Button>
                <Button onClick={() => setPreviewing(null)}>关闭</Button>
              </Space>
            )
          ) : null
        }
        width={860}
        destroyOnHidden
      >
        {previewing && (
          <>
            <Space wrap style={{ marginBottom: 14 }}>
              <Tag color={previewing.status === 'active' ? 'green' : 'default'}>
                {previewing.status === 'active' ? '生效中' : '已归档'}
              </Tag>
              <Text type="secondary">版本 v{previewing.version}</Text>
              <Text type="secondary">更新于 {formatDate(previewing.updated_at)}</Text>
            </Space>
            <div
              className={styles.previewContent}
              dangerouslySetInnerHTML={{ __html: previewing.content }}
            />
          </>
        )}
      </Modal>

      <Drawer
        title={`${historyType ? TYPE_CONFIG[historyType].text : ''}历史版本`}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        width="min(720px, 100%)"
        destroyOnHidden
      >
        <div className={styles.historyDrawerBody}>
          <Spin spinning={historyLoading}>
            {historyItems.length === 0 && !historyLoading ? (
              <Empty className={styles.emptyHistory} description="暂无历史版本" />
            ) : (
              <div className={styles.historyGrid}>
                {historyItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.historyCard}
                    onClick={() => setPreviewing(item)}
                    aria-label={`预览 ${item.title} 第 ${item.version} 版全文`}
                  >
                    <span className={styles.historyCover} data-type={item.type}>
                      <span className={styles.bookSpine} aria-hidden="true" />
                      <strong className={styles.historyBookTitle}>{item.title}</strong>
                      <span className={styles.historyBookFoot}>v{item.version}</span>
                      <span className={styles.archivedBadge}>已归档</span>
                    </span>
                    <span className={styles.historyInfo}>
                      <span className={styles.historyTitle}>{item.title}</span>
                      <span className={styles.historyMeta}>
                        v{item.version} · {formatDate(item.updated_at)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Spin>

          {historyTotal > HISTORY_PAGE_SIZE && (
            <Pagination
              className={styles.drawerPagination}
              current={historyPage}
              pageSize={HISTORY_PAGE_SIZE}
              total={historyTotal}
              showSizeChanger={false}
              onChange={(page) => {
                if (historyType) void loadHistory(historyType, page)
              }}
            />
          )}
        </div>
      </Drawer>

      <Modal
        title={editing ? `编辑模板（当前 v${editing.version}）` : '新建协议模板'}
        open={creating || editing !== null}
        onCancel={closeModals}
        onOk={() => void submit()}
        okText={editing ? '保存并生成新版本' : '创建并生效'}
        okButtonProps={{ loading: saving }}
        width={860}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="type" label="协议类型" rules={[{ required: true }]}>
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
