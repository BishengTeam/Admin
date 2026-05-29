import { useState, useCallback } from 'react'
import { Table, Button, Input, Switch, Popconfirm, Space, Image, message } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { PageContainer } from '@/components/PageContainer'
import { usePagination } from '@/hooks/usePagination'
import { contentService } from '@/services/content'
import { formatDate } from '@/utils/format'
import type { ContentItem } from '@/types/content'
import ContentEditDrawer from './components/ContentEditDrawer'

export default function ContentManagement() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const { data, loading, pagination, refresh } = usePagination(
    (page) => contentService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  const handleSearch = () => {
    setSearchText(keyword)
  }

  const handleAdd = () => {
    setEditingItem(null)
    setDrawerOpen(true)
  }

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item)
    setDrawerOpen(true)
  }

  const handleDelete = async (id: number) => {
    await contentService.delete(id)
    message.success('删除成功')
    refresh()
  }

  const handleBatchDelete = async () => {
    await contentService.deleteZones(selectedRowKeys as number[])
    message.success(`成功删除 ${selectedRowKeys.length} 条内容`)
    setSelectedRowKeys([])
    refresh()
  }

  const rowSelection: TableRowSelection<ContentItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  }

  const handleToggleStatus = async (id: number, checked: boolean) => {
    await contentService.toggleStatus(id, checked ? 'online' : 'offline')
    message.success(checked ? '已上架' : '已下架')
    refresh()
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setEditingItem(null)
  }

  const handleDrawerSuccess = () => {
    handleDrawerClose()
    refresh()
  }

  const columns: ColumnsType<ContentItem> = [
    {
      title: '序号',
      width: 60,
      render: (_, __, idx) => idx + 1,
    },
    {
      title: '封面',
      dataIndex: 'cover_url',
      width: 80,
      render: (url: string) => url ? <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 48, height: 48, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>无</div>,
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    {
      title: '所属专区',
      dataIndex: 'zone',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string, record) => (
        <Switch
          checked={status === 'online'}
          onChange={(checked) => handleToggleStatus(record.id, checked)}
          checkedChildren="上架"
          unCheckedChildren="下架"
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_weight',
      width: 80,
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
          <Popconfirm title="确认删除此内容？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer
      title="内容管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增内容</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索标题..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 240 }}
          onPressEnter={handleSearch}
          allowClear
        />
        <Button type="primary" onClick={handleSearch}>查询</Button>
        <Button onClick={() => { setKeyword(''); setSearchText(''); }}>重置</Button>
        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`确认删除选中的 ${selectedRowKeys.length} 条内容？`}
            onConfirm={handleBatchDelete}
          >
            <Button danger icon={<DeleteOutlined />}>
              删除 ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
        )}
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
        rowSelection={rowSelection}
      />

      <ContentEditDrawer
        open={drawerOpen}
        item={editingItem}
        onClose={handleDrawerClose}
        onSuccess={handleDrawerSuccess}
      />
    </PageContainer>
  )
}
