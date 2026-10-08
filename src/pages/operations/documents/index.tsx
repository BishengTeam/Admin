import { useMemo, useState } from 'react'
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import {
  FilePdfOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { UploadFile } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { checkPermission } from '@/core/permission'
import { documentService } from '@/services/document'
import { formatDate } from '@/utils/format'
import type { DocumentResource } from '@/types/document'

const { Text } = Typography
const MAX_PDF_BYTES = 20 * 1024 * 1024

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
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DocumentResource | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [replacingItem, setReplacingItem] = useState<DocumentResource | null>(null)
  const [replaceFileList, setReplaceFileList] = useState<UploadFile[]>([])
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const { permissions } = useAuth()
  const canWrite = useMemo(
    () => checkPermission(permissions, 'document:write'),
    [permissions],
  )

  const { data, loading, pagination, refresh } = usePagination((page) =>
    documentService.list({ keyword: searchText || undefined, ...page }), [searchText])

  const openCreate = () => {
    setEditingItem(null)
    setFileList([])
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setModalOpen(true)
  }

  const openEdit = (item: DocumentResource) => {
    setEditingItem(item)
    setFileList([])
    form.setFieldsValue(item)
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
          title: values.title,
          description: values.description ?? null,
          is_active: values.is_active,
        })
        message.success('保存成功')
      } else {
        await documentService.create(
          {
            document_key: values.document_key,
            title: values.title,
            description: values.description ?? null,
            is_active: values.is_active,
          },
          getOriginFile(fileList[0]),
        )
        message.success('创建成功，新 PDF 已生效')
      }
      closeModal()
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
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: DocumentResource, checked: boolean) => {
    await documentService.update(item.id, { is_active: checked })
    message.success(checked ? '文档已启用' : '文档已停用')
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

  const columns: ColumnsType<DocumentResource> = [
    {
      title: '文档',
      dataIndex: 'title',
      render: (title: string, record) => (
        <Space direction="vertical" size={2}>
          <Space>
            <FilePdfOutlined style={{ color: '#F5222D' }} />
            <Text strong>{title}</Text>
          </Space>
          <Text type="secondary" copyable style={{ fontSize: 12 }}>
            {record.document_key}
          </Text>
        </Space>
      ),
    },
    {
      title: '当前文件',
      dataIndex: 'original_filename',
      ellipsis: true,
      render: (filename: string, record) => (
        <Space direction="vertical" size={2}>
          <Text>{filename}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            v{record.version_no} · {formatSize(record.size_bytes)}
          </Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 110,
      render: (active: boolean, record) =>
        canWrite ? (
          <Switch
            checked={active}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={(checked) => handleToggle(record, checked)}
          />
        ) : (
          <Tag color={active ? 'green' : 'default'}>{active ? '启用' : '停用'}</Tag>
        ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (value: string) => formatDate(value),
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => preview(record)}>
            预览
          </Button>
          {canWrite && (
            <>
              <Button type="link" size="small" onClick={() => openEdit(record)}>
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                icon={<SyncOutlined />}
                onClick={() => {
                  setReplacingItem(record)
                  setReplaceFileList([])
                }}
              >
                替换PDF
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer title="文档管理">
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
        {canWrite && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增文档
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
      />

      <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
        文档保存到私有 OSS，上传/替换后立即生效；小程序需登录后获取短期签名链接。
      </Text>

      <Modal
        title={editingItem ? `编辑文档 · ${editingItem.title}` : '新增文档'}
        open={modalOpen}
        onOk={submitModal}
        onCancel={closeModal}
        confirmLoading={saving}
        okText={editingItem ? '保存' : '创建并生效'}
        cancelText="取消"
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
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
