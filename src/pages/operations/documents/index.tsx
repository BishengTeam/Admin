import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
  Upload,
  message,
} from 'antd'
import {
  EditOutlined,
  FileAddOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { checkPermission } from '@/core/permission'
import { documentService } from '@/services/document'
import { formatDate } from '@/utils/format'
import type { DocumentResource } from '@/types/document'
import styles from './index.module.css'

const { Text } = Typography
const MAX_PDF_BYTES = 20 * 1024 * 1024
const H3C_XUEXIN_GUIDE_SCENE = 'h3c_student_xuexin_guide'

const SCENE_OPTIONS = [
  {
    value: H3C_XUEXIN_GUIDE_SCENE,
    label: 'H3C报名表单 / 学生材料',
    defaultDocumentKey: 'h3c.xuexin_verification_guide',
    defaultTitle: '如何查询学籍在线验证码',
    defaultEntryText: '查看《如何查询学籍在线验证码》PDF',
  },
]

interface FormValues {
  scene?: string
  document_key: string
  title: string
  entry_text?: string
  description?: string
  is_active: boolean
}

function isPdfFile(file: File) {
  return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function validatePdf(file: File): string | null {
  if (!isPdfFile(file)) return '仅支持 PDF 文件'
  if (file.size <= 0) return 'PDF 文件不能为空'
  if (file.size > MAX_PDF_BYTES) return 'PDF 文件不能超过 20MB'
  return null
}

function getOriginFile(file: UploadFile): File {
  const origin = file.originFileObj
  if (!(origin instanceof File)) throw new Error('请选择 PDF 文件')
  return origin
}

export default function DocumentManagement() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [sceneItem, setSceneItem] = useState<DocumentResource | null>(null)
  const [sceneLoading, setSceneLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DocumentResource | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [replacingItem, setReplacingItem] = useState<DocumentResource | null>(null)
  const [replaceFileList, setReplaceFileList] = useState<UploadFile[]>([])
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<FormValues>()
  const selectedScene = Form.useWatch('scene', form)
  const { permissions } = useAuth()
  const canWrite = useMemo(
    () => checkPermission(permissions, 'document:write'),
    [permissions],
  )

  const { data, loading, pagination, refresh } = usePagination((page) =>
    documentService.list({ keyword: searchText || undefined, ...page }), [searchText])

  const loadSceneDocument = () => {
    setSceneLoading(true)
    documentService
      .list({ scene: H3C_XUEXIN_GUIDE_SCENE, page: 1, page_size: 1 })
      .then((page) => setSceneItem(page.items[0] || null))
      .catch(() => setSceneItem(null))
      .finally(() => setSceneLoading(false))
  }

  useEffect(loadSceneDocument, [])

  const unboundItems = (data?.items || []).filter(
    (item) => item.scene !== H3C_XUEXIN_GUIDE_SCENE,
  )

  const openCreate = (scene?: string) => {
    const config = SCENE_OPTIONS.find((item) => item.value === scene)
    setEditingItem(null)
    setFileList([])
    form.resetFields()
    form.setFieldsValue({
      scene,
      document_key: config?.defaultDocumentKey,
      title: config?.defaultTitle,
      entry_text: config?.defaultEntryText,
      is_active: true,
    })
    setModalOpen(true)
  }

  const openEdit = (item: DocumentResource) => {
    setEditingItem(item)
    setFileList([])
    form.setFieldsValue({
      ...item,
      scene: item.scene || undefined,
      entry_text: item.entry_text || undefined,
      description: item.description || undefined,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setFileList([])
  }

  const submitModal = async () => {
    const values = await form.validateFields()
    if (!editingItem && fileList.length !== 1) {
      message.error('请上传 PDF 文件')
      return
    }
    setSaving(true)
    try {
      if (editingItem) {
        await documentService.update(editingItem.id, {
          scene: values.scene || null,
          title: values.title,
          entry_text: values.scene ? values.entry_text : null,
          description: values.description ?? null,
          is_active: values.is_active,
        })
        message.success('保存成功')
      } else {
        await documentService.create(
          {
            scene: values.scene,
            document_key: values.document_key,
            title: values.title,
            entry_text: values.scene ? values.entry_text : undefined,
            description: values.description ?? null,
            is_active: values.is_active,
          },
          getOriginFile(fileList[0]),
        )
        message.success('创建成功，新 PDF 已生效')
      }
      closeModal()
      loadSceneDocument()
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const submitReplacement = async () => {
    if (!replacingItem || replaceFileList.length !== 1) {
      message.error('请选择要替换的 PDF 文件')
      return
    }
    setSaving(true)
    try {
      const updated = await documentService.replaceFile(
        replacingItem.id,
        getOriginFile(replaceFileList[0]),
      )
      message.success(`新 PDF 已生效（当前 v${updated.version_no}）`)
      setReplacingItem(null)
      setReplaceFileList([])
      loadSceneDocument()
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: DocumentResource, checked: boolean) => {
    await documentService.update(item.id, { is_active: checked })
    message.success(checked ? '文档已启用' : '文档已停用')
    loadSceneDocument()
    refresh()
  }

  const preview = async (item: DocumentResource) => {
    const detail = await documentService.detail(item.id)
    if (!detail.download_url) {
      message.warning('文档未启用，暂不能预览')
      return
    }
    window.open(detail.download_url, '_blank', 'noopener,noreferrer')
  }

  const uploadProps = {
    accept: '.pdf,application/pdf',
    maxCount: 1,
    beforeUpload: (file: File) => {
      const error = validatePdf(file)
      if (error) {
        message.error(error)
        return Upload.LIST_IGNORE
      }
      return false
    },
  }

  const renderCover = (
    item: DocumentResource | null,
    location: string,
    onCreate?: () => void,
  ) => (
    <article className={styles.documentCard} key={item?.id || location}>
      <div className={styles.coverRegion}>
        <span
          className={
            item?.is_active
              ? styles.statusBadge
              : `${styles.statusBadge} ${styles.inactiveBadge}`
          }
        >
          {item ? (item.is_active ? '已启用' : '已停用') : '未配置'}
        </span>
        <button
          type="button"
          className={styles.coverButton}
          onClick={() => {
            if (item) void preview(item)
            else if (canWrite) onCreate?.()
          }}
          disabled={!item && !canWrite}
          aria-label={item
            ? `预览 ${item.title} 第 ${item.version_no} 版 PDF`
            : canWrite ? `配置${location}文档` : `${location}尚未配置`}
        >
          {item ? (
            <span className={styles.bookCover}>
              <strong className={styles.bookTitle}>{item.title}</strong>
              <span className={styles.bookFoot}>
                {location} · v{item.version_no}
              </span>
            </span>
          ) : (
            <span className={styles.coverPlaceholder}>
              {canWrite ? <FileAddOutlined /> : <FilePdfOutlined />}
              <strong>{canWrite ? '点击配置' : '暂无生效版本'}</strong>
              <span>{`${location}尚未配置`}</span>
            </span>
          )}
        </button>
      </div>

      <div className={styles.cardMeta}>
        {item ? (
          <>
            <Text strong className={styles.entryText}>{item.entry_text || item.title}</Text>
            <Text type="secondary" className={styles.metaText}>{item.document_key}</Text>
            <Text type="secondary" className={styles.metaText}>
              {formatSize(item.size_bytes)} · {formatDate(item.updated_at)}
            </Text>
            {canWrite && (
              <Space size={4} wrap className={styles.actions}>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(item)}>
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<SyncOutlined />}
                  onClick={() => {
                    setReplacingItem(item)
                    setReplaceFileList([])
                  }}
                >
                  替换
                </Button>
                <Switch
                  checked={item.is_active}
                  checkedChildren="启用"
                  unCheckedChildren="停用"
                  onChange={(checked) => void handleToggle(item, checked)}
                />
              </Space>
            )}
          </>
        ) : (
          <>
            <Text strong className={styles.entryText}>{location}</Text>
            <Text type="secondary" className={styles.metaText}>小程序入口会保留并提示联系管理员</Text>
          </>
        )}
      </div>
    </article>
  )

  return (
    <PageContainer title="文档管理">
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        固定入口由小程序页面预置；后台控制当前绑定的 PDF、入口文案、启用状态和版本。
      </Text>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>小程序固定入口</span>
          {canWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openCreate(H3C_XUEXIN_GUIDE_SCENE)}
              disabled={!!sceneItem}
            >
              配置H3C教程
            </Button>
          )}
        </div>
        <Spin spinning={sceneLoading}>
          <div className={styles.shelf}>
            {renderCover(
              sceneItem,
              'H3C报名 / 学信网教程',
              () => openCreate(H3C_XUEXIN_GUIDE_SCENE),
            )}
          </div>
        </Spin>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>未绑定固定入口的文档</span>
          {canWrite && (
            <Button icon={<PlusOutlined />} onClick={() => openCreate()}>
              新增通用PDF
            </Button>
          )}
        </div>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索文档标题 / 键名 / 文件名"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => setSearchText(keyword)}
            allowClear
            style={{ width: 280 }}
          />
          <Button type="primary" onClick={() => setSearchText(keyword)}>查询</Button>
          <Button onClick={() => { setKeyword(''); setSearchText('') }}>重置</Button>
        </Space>
        <Spin spinning={loading}>
          {unboundItems.length ? (
            <div className={styles.shelf}>
              {unboundItems.map((item) => renderCover(item, '通用文档'))}
            </div>
          ) : (
            <Empty description="暂无通用PDF文档" />
          )}
        </Spin>
        {data && data.total > data.page_size && (
          <Pagination {...pagination} className={styles.pagination} />
        )}
      </section>

      <Modal
        title={editingItem ? `编辑文档 · ${editingItem.title}` : '配置文档'}
        open={modalOpen}
        onOk={submitModal}
        onCancel={closeModal}
        confirmLoading={saving}
        okText={editingItem ? '保存' : '创建并生效'}
        cancelText="取消"
        destroyOnClose
        width={680}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item
            name="scene"
            label="小程序展示位置"
            tooltip="固定入口必须由小程序版本预置；通用文档不会出现在固定入口"
          >
            <Select
              options={[
                ...SCENE_OPTIONS.map(({ value, label }) => ({ value, label })),
                { value: '', label: '不绑定固定入口' },
              ]}
              allowClear
              placeholder="不绑定固定入口"
            />
          </Form.Item>
          <Form.Item
            name="document_key"
            label="文档键名"
            rules={[
              { required: true, message: '请输入文档键名' },
              {
                pattern: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,7}$/,
                message: '例如 h3c.xuexin_verification_guide，创建后不可修改',
              },
            ]}
            extra={editingItem ? '键名是小程序集成标识，创建后不可修改。' : undefined}
          >
            <Input placeholder="h3c.xuexin_verification_guide" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="如何查询学籍在线验证码" maxLength={128} />
          </Form.Item>
          {selectedScene && (
            <Form.Item
              name="entry_text"
              label="小程序入口文案"
              rules={[
                { required: true, message: '请输入小程序入口文案' },
                { max: 30, message: '入口文案不能超过30个字符' },
              ]}
            >
              <Input maxLength={30} showCount placeholder="查看教程PDF" />
            </Form.Item>
          )}
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} maxLength={512} showCount placeholder="文档用途说明" />
          </Form.Item>
          <Form.Item name="is_active" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          {!editingItem && (
            <Form.Item label="PDF 文件" required>
              <Upload.Dragger
                {...uploadProps}
                fileList={fileList}
                onChange={({ fileList: files }) => setFileList(files)}
              >
                <p className="ant-upload-drag-icon"><FilePdfOutlined /></p>
                <p className="ant-upload-text">点击或拖拽 PDF 到此处</p>
                <p className="ant-upload-hint">仅支持 application/pdf，最大 20MB；上传后立即生效</p>
              </Upload.Dragger>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={replacingItem ? `替换 PDF · ${replacingItem.title}` : '替换 PDF'}
        open={!!replacingItem}
        onOk={submitReplacement}
        onCancel={() => {
          setReplacingItem(null)
          setReplaceFileList([])
        }}
        confirmLoading={saving}
        okText="上传并生效"
        cancelText="取消"
        destroyOnClose
      >
        <Upload.Dragger
          {...uploadProps}
          fileList={replaceFileList}
          onChange={({ fileList: files }) => setReplaceFileList(files)}
        >
          <p className="ant-upload-drag-icon"><FilePdfOutlined /></p>
          <p className="ant-upload-text">选择新的 PDF 文件</p>
          <p className="ant-upload-hint">替换后版本号 +1 并立即对小程序生效</p>
        </Upload.Dragger>
      </Modal>
    </PageContainer>
  )
}
