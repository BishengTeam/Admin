import { useState } from 'react'
import { Table, Button, Input, Switch, Space, Image, message, Select } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { contentService } from '@/services/content'
import { formatDate } from '@/utils/format'
import { ZONE_OPTIONS } from '@/core/constants'
import type { ContentItem } from '@/types/content'
import ContentEditDrawer from '@/pages/content/components/ContentEditDrawer'

export default function ActivityManagement() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const { data, loading, pagination, refresh } = usePagination(
    (page) => contentService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

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
    message.success(`成功删除 ${selectedRowKeys.length} 条活动`)
    setSelectedRowKeys([])
    refresh()
  }

  const rowSelection: TableRowSelection<ContentItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  }

  const handleToggleStatus = async (id: number, checked: boolean) => {
    await contentService.update(id, { is_active: checked })
    message.success(checked ? '已上架' : '已下架')
    refresh()
  }

  const columns: ColumnsType<ContentItem> = [
    {
      title: '封面',
      dataIndex: 'cover_url',
      width: 80,
      render: (url: string) => url ? <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 48, height: 48, background: '#f0f0f0', borderRadius: 4 }} />,
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    {
      title: '外链',
      dataIndex: 'link_url',
      width: 200,
      ellipsis: true,
      render: (url: string) => url || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (is_active: boolean, record) => (
        <Switch
          checked={is_active}
          onChange={(checked) => handleToggleStatus(record.id, checked)}
          checkedChildren="上架"
          unCheckedChildren="下架"
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
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
          <ConfirmButton
            title="删除活动"
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
    <PageContainer
      title="活动管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增活动</Button>}
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
        <Button onClick={() => { setKeyword(''); setSearchText(''); }}>重置</Button>
        {selectedRowKeys.length > 0 && (
          <ConfirmButton
            title="批量删除"
            description={`确认删除选中的 ${selectedRowKeys.length} 条活动？`}
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
        rowSelection={rowSelection}
      />

      <ContentEditDrawer
        open={drawerOpen}
        item={editingItem}
        hideZoneType
        defaultValues={{ zone_type: 'activity' }}
        onClose={() => { setDrawerOpen(false); setEditingItem(null); }}
        onSuccess={() => { setDrawerOpen(false); setEditingItem(null); refresh(); }}
      />
    </PageContainer>
  )
}