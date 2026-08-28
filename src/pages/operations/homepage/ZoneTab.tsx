import { useState, useCallback } from 'react'
import { Table, Button, Input, Select, Switch, Space, Image, message } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { contentService } from '@/services/content'
import { formatDate } from '@/utils/format'
import type { ContentItem } from '@/types/content'
import ContentEditDrawer from './components/ContentEditDrawer'

/** 仅保留首页实际渲染卡片的专区类型；study/activity/training 首页直接展示实体数据，不读卡片 */
const ZONE_OPTIONS = [
  { label: '认证专区', value: 'cert' },
  { label: '竞赛专区', value: 'competition' },
  { label: '就业专区', value: 'employment' },
]

export default function ZoneTab() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [zoneType, setZoneType] = useState<string | undefined>(undefined)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const canWrite = usePermission('content:write')

  const { data, loading, pagination, refresh } = usePagination(
    (page) => contentService.list({ keyword: searchText || undefined, zone_type: zoneType, ...page }),
    [searchText, zoneType],
  )

  const handleSearch = () => {
    setSearchText(keyword)
  }

  const handleAdd = () => {
    if (!canWrite) return
    setEditingItem(null)
    setDrawerOpen(true)
  }

  const handleEdit = (item: ContentItem) => {
    if (!canWrite) return
    setEditingItem(item)
    setDrawerOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!canWrite) return
    await contentService.delete(id)
    message.success('删除成功')
    refresh()
  }

  const handleBatchDelete = async () => {
    if (!canWrite || selectedRowKeys.length === 0) return
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
    if (!canWrite) return
    await contentService.update(id, { is_active: checked })
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
      dataIndex: 'zone_type',
      width: 120,
      render: (v: string) => ZONE_OPTIONS.find((o) => o.value === v)?.label ?? v,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (is_active: boolean, record) => (
        <Switch
          checked={is_active}
          disabled={!canWrite}
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
          {canWrite && <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>}
          {canWrite && (
            <ConfirmButton
              title="删除内容"
              description="此操作不可撤销，确认删除此内容？"
              danger
              type="link"
              size="small"
              onConfirm={() => handleDelete(record.id)}
            >
              删除
            </ConfirmButton>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        {canWrite && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增内容</Button>}
      </Space>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索标题..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 200 }}
          onPressEnter={handleSearch}
          allowClear
        />
        <Select
          value={zoneType}
          onChange={(val) => setZoneType(val)}
          style={{ width: 140 }}
          options={ZONE_OPTIONS}
          allowClear
        />
        <Button type="primary" onClick={handleSearch}>查询</Button>
        <Button onClick={() => { setKeyword(''); setSearchText(''); }}>重置</Button>
        {canWrite && selectedRowKeys.length > 0 && (
          <ConfirmButton
            title="批量删除"
            description={`确认删除选中的 ${selectedRowKeys.length} 条内容？此操作不可撤销。`}
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

      <ContentEditDrawer
        open={drawerOpen}
        item={editingItem}
        onClose={handleDrawerClose}
        onSuccess={handleDrawerSuccess}
      />
    </>
  )
}
