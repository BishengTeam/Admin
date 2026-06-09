import { useState, useCallback, useRef } from 'react'
import { Table, Input, DatePicker, Button, Space, Tag, message } from 'antd'
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { SearchForm, type SearchField } from '@/components/SearchForm'
import { StatusTag } from '@/components/StatusTag'
import { usePagination } from '@/hooks/usePagination'
import { useExport } from '@/hooks/useExport'
import { userService } from '@/services/users'
import { USER_STATUS_MAP } from '@/core/constants'
import { formatDate, formatPhone } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import type { User, UserFilter, UserDetail } from '@/types/user'
import { IDENTITY_STATUS_MAP } from '@/types/user'
import UserDetailDrawer from './components/UserDetailDrawer'

const { RangePicker } = DatePicker

const searchFields: SearchField[] = [
  { name: 'openid', label: '用户名', span: 6, render: () => <Input placeholder="用户名" /> },
  { name: 'phone', label: '手机号', span: 6, render: () => <Input placeholder="手机号" /> },
  { name: 'created_at_range', label: '注册时间', span: 8, render: () => <RangePicker /> },
]

export default function UserList() {
  const [filters, setFilters] = useState<UserFilter>({})
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const viewingUserId = useRef<number | null>(null)
  const { exporting, startExport, finishExport } = useExport()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => userService.list({ ...filters, ...page }),
    [filters],
  )

  const handleSearch = useCallback((values: Record<string, unknown>) => {
    const { openid, phone, created_at_range } = values
    const rangeArr = created_at_range as [string, string] | undefined
    setFilters({
      openid: openid as string | undefined,
      phone: phone as string | undefined,
      created_at_start: (rangeArr?.filter(Boolean).length === 2) ? rangeArr![0] : undefined,
      created_at_end: (rangeArr?.filter(Boolean).length === 2) ? rangeArr![1] : undefined,
    })
  }, [])

  const handleReset = useCallback(() => {
    setFilters({})
  }, [])

  const handleRowClick = async (record: User) => {
    viewingUserId.current = record.id
    setDrawerOpen(true)
    setSelectedUser(null) // 先清空旧数据，避免展示脏数据
    const [detail, profile, identity, orders, conversations] = await Promise.all([
      userService.detail(record.id),
      userService.getProfile(record.id),
      userService.getIdentity(record.id),
      userService.getOrders(record.id),
      userService.getConversations(record.id),
    ])
    setSelectedUser({ ...detail, profile, identity, orders, conversations })
  }

  const handleRefreshDetail = useCallback(async () => {
    const id = viewingUserId.current
    if (!id) return
    const [detail, profile, identity, orders, conversations] = await Promise.all([
      userService.detail(id),
      userService.getProfile(id),
      userService.getIdentity(id),
      userService.getOrders(id),
      userService.getConversations(id),
    ])
    setSelectedUser({ ...detail, profile, identity, orders, conversations })
  }, [])

  const handleToggleStatus = async (record: User) => {
    const newStatus = !record.is_active
    await userService.updateStatus(record.id, newStatus)
    message.success(newStatus ? '已启用' : '已禁用')
    refresh()
  }

  const handleDelete = async (id: number) => {
    await userService.deleteUsers([id])
    message.success('删除成功')
    refresh()
  }

  const handleBatchDelete = async () => {
    await userService.deleteUsers(selectedRowKeys)
    message.success(`成功删除 ${selectedRowKeys.length} 个用户`)
    setSelectedRowKeys([])
    refresh()
  }

  const handleExport = async () => {
    startExport()
    try {
      const blob = await userService.exportUsers(filters)
      downloadBlob(blob, '用户数据.csv')
    } finally {
      finishExport()
    }
  }

  const rowSelection: TableRowSelection<User> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys as number[]),
  }

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'openid', width: 120 },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 150,
      render: (phone: string) => formatPhone(phone),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      width: 180,
      render: (t: string) => formatDate(t),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (v: boolean) => <StatusTag status={v} map={USER_STATUS_MAP} />,
    },
    {
      title: '审核',
      dataIndex: 'identity_status',
      width: 80,
      render: (s: string | null) => {
        const k = s || 'unsubmitted'
        const cfg = IDENTITY_STATUS_MAP[k]
        return <Tag color={cfg?.color}>{cfg?.text ?? k}</Tag>
      },
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}>
            查看
          </Button>
           <ConfirmButton
            title={record.is_active ? '禁用用户' : '启用用户'}
            description={`确认${record.is_active ? '禁用' : '启用'}此用户？`}
            type="link"
            size="small"
            onConfirm={() => handleToggleStatus(record)}
          >
            {record.is_active ? '禁用' : '启用'}
          </ConfirmButton>
           <ConfirmButton
            title="删除用户"
            description="此操作不可撤销，确认删除此用户？"
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
    <PageContainer title="用户管理">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <SearchForm fields={searchFields} onSearch={handleSearch} onReset={handleReset} />
        <Space style={{ flexShrink: 0 }}>
          {selectedRowKeys.length > 0 && (
             <ConfirmButton
              title="批量删除"
              description={`确认删除选中的 ${selectedRowKeys.length} 个用户？此操作不可撤销。`}
              danger
              icon={<DeleteOutlined />}
              onConfirm={handleBatchDelete}
            >
              删除 ({selectedRowKeys.length})
            </ConfirmButton>
          )}
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
            导出
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
        rowSelection={rowSelection}
      />

      <UserDetailDrawer
        user={selectedUser}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleRefreshDetail}
      />
    </PageContainer>
  )
}
