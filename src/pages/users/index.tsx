import { useState, useCallback } from 'react'
import { Table, Input, DatePicker, Button, Space, Popconfirm, message } from 'antd'
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { PageContainer } from '@/components/PageContainer'
import { SearchForm, type SearchField } from '@/components/SearchForm'
import { StatusTag } from '@/components/StatusTag'
import { usePagination } from '@/hooks/usePagination'
import { useExport } from '@/hooks/useExport'
import { userService } from '@/services/users'
import { USER_STATUS_MAP } from '@/core/constants'
import { formatDate, formatPhone } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import type { User, UserFilter, UserDetail } from '@/types/user'
import UserDetailDrawer from './components/UserDetailDrawer'

const { RangePicker } = DatePicker

const searchFields: SearchField[] = [
  { name: 'username', label: '用户名', span: 6, render: () => <Input placeholder="用户名" /> },
  { name: 'phone', label: '手机号', span: 6, render: () => <Input placeholder="手机号" /> },
  { name: 'register_date_range', label: '注册时间', span: 8, render: () => <RangePicker /> },
]

export default function UserList() {
  const [filters, setFilters] = useState<UserFilter>({})
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const { exporting, startExport, finishExport } = useExport()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => userService.list({ ...filters, ...page }),
    [filters],
  )

  const handleSearch = useCallback((values: Record<string, unknown>) => {
    const { username, phone, register_date_range } = values
    setFilters({
      username: username as string | undefined,
      phone: phone as string | undefined,
      register_date_range: (register_date_range as [string, string] | undefined)?.filter(Boolean).length === 2
        ? register_date_range as [string, string]
        : undefined,
    })
  }, [])

  const handleReset = useCallback(() => {
    setFilters({})
  }, [])

  const handleRowClick = async (record: User) => {
    const detail = await userService.detail(record.id)
    setSelectedUser(detail)
    setDrawerOpen(true)
  }

  const handleToggleStatus = async (record: User) => {
    const newStatus = record.status === 'active' ? 'banned' : 'active'
    await userService.updateStatus(record.id, newStatus)
    message.success(newStatus === 'banned' ? '已禁用' : '已启用')
    refresh()
  }

  const handleDelete = async (id: number) => {
    await userService.deleteUsers([id])
    message.success('删除成功')
    refresh()
  }

  const handleBatchDelete = async () => {
    await userService.deleteUsers(selectedRowKeys as number[])
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
    onChange: (keys) => setSelectedRowKeys(keys),
  }

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username', width: 120 },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 150,
      render: (phone: string) => formatPhone(phone),
    },
    {
      title: '注册时间',
      dataIndex: 'register_time',
      width: 180,
      render: (t: string) => formatDate(t),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => <StatusTag status={s} map={USER_STATUS_MAP} />,
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}>
            查看
          </Button>
          <Popconfirm
            title={`确认${record.status === 'active' ? '禁用' : '启用'}此用户？`}
            onConfirm={() => handleToggleStatus(record)}
          >
            <Button type="link" size="small" danger={record.status === 'active'}>
              {record.status === 'active' ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm title="确认删除此用户？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
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
            <Popconfirm
              title={`确认删除选中的 ${selectedRowKeys.length} 个用户？`}
              onConfirm={handleBatchDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
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
      />
    </PageContainer>
  )
}
