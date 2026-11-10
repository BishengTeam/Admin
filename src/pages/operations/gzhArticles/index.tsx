import { useState } from 'react'
import {
  Table, Button, Input, Space, Modal, Form, DatePicker, Tag, Typography, message, Alert,
} from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined, ImportOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import type { Rule } from 'antd/es/form'
import dayjs from 'dayjs'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { PageContainer } from '@/components/PageContainer'
import { usePagination } from '@/hooks/usePagination'
import { useAuth } from '@/hooks/useAuth'
import { checkPermission } from '@/core/permission'
import { gzhArticleService } from '@/services/gzhArticle'
import { formatDate } from '@/utils/format'
import { requiredRule } from '@/utils/validator'
import type { GzhArticle, GzhArticleImportItem } from '@/types/gzhArticle'

const { Text } = Typography

// 小程序 web-view 仅允许 https，手动录入与批量导入统一卡 https
const httpsUrlRule: Rule = {
  validator: (_, value?: string) => {
    if (!value) return Promise.resolve()
    return /^https:\/\/\S+$/i.test(value.trim())
      ? Promise.resolve()
      : Promise.reject(new Error('链接须以 https:// 开头（小程序 web-view 仅允许 https）'))
  },
}

/** 封面双入口：直接贴微信图床 URL，或本地上传，写入同一表单字段 */
function ThumbField({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Input
        placeholder="粘贴推文封面图 URL（如 mmbiz.qpic.cn/...），或下方本地上传"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        allowClear
      />
      <ImageUpload value={value} onChange={onChange} />
      {value && (
        <img
          src={value}
          alt="封面预览"
          style={{ maxHeight: 120, borderRadius: 4, border: '1px solid #f0f0f0' }}
        />
      )}
    </Space>
  )
}

interface ParsedRow extends Partial<GzhArticleImportItem> {
  error?: string
}

/** 解析批量粘贴文本：每行「标题 | 链接 [| 封面URL [| 发布时间]]」 */
function parseImportText(text: string): ParsedRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim())
      const [title = '', url = '', thumb = '', time = ''] = parts
      if (parts.length < 2 || !title || !url) {
        return { title, url, error: '每行至少为「标题 | 链接」' }
      }
      if (!/^https:\/\//i.test(url)) {
        return { title, url, error: '链接须以 https:// 开头' }
      }
      let publish_time: string | undefined
      if (time) {
        const d = dayjs(time)
        if (!d.isValid()) return { title, url, thumb_url: thumb || undefined, error: '发布时间无法解析' }
        publish_time = d.toISOString()
      }
      return { title, url, thumb_url: thumb || undefined, publish_time }
    })
}

export default function GzhArticles() {
  const noun = '资讯'
  const { permissions } = useAuth()
  const canWrite = checkPermission(permissions, 'homepage:write')
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GzhArticle | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [form] = Form.useForm()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => gzhArticleService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  const parsedRows = parseImportText(importText)
  const validRows = parsedRows.filter((r) => !r.error)
  // 前端先按链接去重预览；后端 batch-import 还有兜底去重
  const dedupedRows = validRows.filter(
    (r, i) => validRows.findIndex((x) => x.url === r.url) === i,
  )
  const dupCount = validRows.length - dedupedRows.length

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ publish_time: dayjs() })
    setModalOpen(true)
  }

  const handleEdit = (item: GzhArticle) => {
    setEditingItem(item)
    form.setFieldsValue({
      title: item.title,
      url: item.url,
      thumb_url: item.thumb_url || '',
      publish_time: item.publish_time ? dayjs(item.publish_time) : undefined,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await gzhArticleService.delete(id)
    message.success('已删除，30 天内可在回收站恢复')
    setSelectedRowKeys((prev) => prev.filter((k) => k !== id))
    refresh()
  }

  const handleBatchDelete = async () => {
    await gzhArticleService.batchDelete(selectedRowKeys)
    message.success(`已删除 ${selectedRowKeys.length} 条，30 天内可在回收站恢复`)
    setSelectedRowKeys([])
    refresh()
  }

  const handleImport = async () => {
    if (dedupedRows.length === 0) return
    setImporting(true)
    try {
      const items: GzhArticleImportItem[] = dedupedRows.map((r) => ({
        title: r.title as string,
        url: r.url as string,
        thumb_url: r.thumb_url || null,
        publish_time: r.publish_time || null,
      }))
      const result = await gzhArticleService.batchImport(items)
      message.success(`导入完成：新增 ${result.created} 条，跳过 ${result.skipped} 条`)
      setImportOpen(false)
      setImportText('')
      refresh()
    } finally {
      setImporting(false)
    }
  }

  const rowSelection: TableRowSelection<GzhArticle> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys as number[]),
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const payload = {
      title: values.title.trim(),
      url: values.url.trim(),
      thumb_url: values.thumb_url?.trim() || null,
      publish_time: values.publish_time ? values.publish_time.toISOString() : null,
    }
    if (editingItem) {
      await gzhArticleService.update(editingItem.id, payload)
      message.success('更新成功，该条已转为手动维护（同步不再覆盖）')
    } else {
      await gzhArticleService.create(payload)
      message.success('添加成功')
    }
    setModalOpen(false)
    refresh()
  }

  const columns: ColumnsType<GzhArticle> = [
    {
      title: '封面',
      dataIndex: 'thumb_url',
      width: 100,
      render: (thumb: string | null) =>
        thumb ? (
          <img src={thumb} alt="封面" style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <Text type="secondary">无</Text>
        ),
    },
    { title: '标题', dataIndex: 'title', width: 240, ellipsis: true },
    {
      title: '链接',
      dataIndex: 'url',
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noreferrer">{url}</a>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publish_time',
      width: 160,
      render: (t: string | null) => (t ? formatDate(t) : <Text type="secondary">-</Text>),
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 90,
      render: (source: string) =>
        source === 'manual' ? <Tag color="blue">手动</Tag> : <Tag>同步</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Space>
          {canWrite && (
            <>
              <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
              <ConfirmButton
                title={`删除${noun}`}
                description="删除后进回收站，30 自然日内可恢复；小程序端即刻不再展示。"
                danger
                type="link"
                size="small"
                onConfirm={() => handleDelete(record.id)}
              >
                删除
              </ConfirmButton>
            </>
          )}
        </Space>
      ),
    },
  ]

  const importColumns: ColumnsType<ParsedRow> = [
    {
      title: '状态',
      width: 80,
      render: (_, r) => (r.error ? <Tag color="red">错误</Tag> : <Tag color="green">可导入</Tag>),
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '链接', dataIndex: 'url', ellipsis: true },
    { title: '错误', dataIndex: 'error', ellipsis: true, render: (e?: string) => e || '-' },
  ]

  return (
    <PageContainer
      title="公众号资讯"
      extra={
        canWrite && (
          <Space>
            <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>批量导入</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增{noun}</Button>
          </Space>
        )
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索标题..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 240 }}
          onPressEnter={() => setSearchText(keyword)}
          allowClear
        />
        <Button type="primary" onClick={() => setSearchText(keyword)}>查询</Button>
        <Button onClick={() => { setKeyword(''); setSearchText('') }}>重置</Button>
        {canWrite && selectedRowKeys.length > 0 && (
          <ConfirmButton
            title="批量删除"
            description={`将删除选中的 ${selectedRowKeys.length} 条${noun}，删除后进回收站，30 自然日内可恢复。`}
            danger
            icon={<DeleteOutlined />}
            onConfirm={handleBatchDelete}
          >
            删除 ({selectedRowKeys.length})
          </ConfirmButton>
        )}
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
        rowSelection={canWrite ? rowSelection : undefined}
      />

      <Modal
        title={editingItem ? `编辑${noun}` : `新增${noun}`}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="title" label="标题" rules={[requiredRule('标题')]}>
            <Input placeholder="公众号推文标题" maxLength={256} showCount />
          </Form.Item>
          <Form.Item
            name="url"
            label="文章链接"
            rules={[requiredRule('链接'), httpsUrlRule]}
            tooltip="微信推文的分享链接（https://mp.weixin.qq.com/s/...）；小程序点击资讯后经 web-view 打开"
          >
            <Input placeholder="https://mp.weixin.qq.com/s/..." maxLength={512} />
          </Form.Item>
          <Form.Item
            name="thumb_url"
            label="封面图"
            tooltip="首页资讯卡片以大图展示；无封面时显示占位图"
          >
            <ThumbField />
          </Form.Item>
          <Form.Item name="publish_time" label="发布时间" tooltip="决定资讯排序（最新在前）">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          {editingItem && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              编辑保存后该条转为「手动」来源，定时同步不会再覆盖它。
            </Text>
          )}
        </Form>
      </Modal>

      <Modal
        title="批量导入"
        open={importOpen}
        onOk={handleImport}
        onCancel={() => setImportOpen(false)}
        okButtonProps={{ disabled: dedupedRows.length === 0, loading: importing }}
        okText={`导入 ${dedupedRows.length} 条`}
        width={720}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="每行一条：标题 | 链接 [| 封面URL [| 发布时间]]"
          description="发布时间格式 YYYY-MM-DD HH:mm，可省略；封面 URL 可直接贴微信图床地址。链接已存在的行会被跳过。"
        />
        <Input.TextArea
          rows={8}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={'跨省连评名单 | https://mp.weixin.qq.com/s/abc | https://mmbiz.qpic.cn/x.jpg | 2026-11-10 09:00\n第二篇 | https://mp.weixin.qq.com/s/def'}
        />
        {parsedRows.length > 0 && (
          <>
            <div style={{ margin: '12px 0 8px' }}>
              <Space>
                <Text>解析结果：{parsedRows.length} 行</Text>
                <Tag color="green">可导入 {dedupedRows.length}</Tag>
                {dupCount > 0 && <Tag>本轮重复 {dupCount}</Tag>}
                {parsedRows.length - validRows.length > 0 && (
                  <Tag color="red">错误 {parsedRows.length - validRows.length}</Tag>
                )}
              </Space>
            </div>
            <Table
              size="small"
              rowKey={(r) => `${r.url}-${r.title}`}
              columns={importColumns}
              dataSource={parsedRows}
              pagination={false}
              scroll={{ y: 240 }}
            />
          </>
        )}
      </Modal>
    </PageContainer>
  )
}
