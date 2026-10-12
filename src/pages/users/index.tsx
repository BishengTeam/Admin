import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Alert, Card, Table, Input, DatePicker, Button, Radio, Space, Tag, Typography, message } from 'antd'
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { SearchForm, type SearchField } from '@/components/SearchForm'
import { StatusTag } from '@/components/StatusTag'
import { usePagination } from '@/hooks/usePagination'
import { useExport } from '@/hooks/useExport'
import { usePermission } from '@/hooks/usePermission'
import { userService } from '@/services/users'
import { USER_STATUS_MAP } from '@/core/constants'
import { formatDate, formatPhone } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import type { User, UserFilter, UserDetail, UserProfileDetail, UserOrderSummary, UserConversationSummary, UserReviewSummary } from '@/types/user'
import { LEVEL2_STATUS_MAP } from '@/types/user'
import UserDetailDrawer from './components/UserDetailDrawer'

/** 将平铺的 profile 响应映射为嵌套结构供抽屉使用 */
function mapProfileToDetail(
  flat: UserProfileDetail,
  base: User,
  orders: UserOrderSummary[],
  conversations: UserConversationSummary[],
): UserDetail {
  const detail: UserDetail = {
    ...base,
    phone: flat.phone || base.phone,
    orders,
    conversations,
    profile: {
      nickname: flat.nickname,
      email: flat.email,
      phone: flat.phone,
    },
  }
  // 实名字段存在则构建 realname 对象
  if (flat.user_type || flat.real_name) {
    detail.realname = {
      user_id: flat.id,
      user_type: 'student',
      last_name_zh: flat.last_name_zh,
      first_name_zh: flat.first_name_zh,
      last_name_en: flat.last_name_en,
      first_name_en: flat.first_name_en,
      real_name: flat.real_name || '',
      id_card_number: flat.id_card_raw || flat.id_card || '',
      id_card_front_oss: flat.id_card_front_oss,
      id_card_back_oss: flat.id_card_back_oss,
      avatar_oss: flat.avatar_oss,
      birth_date: flat.birth_date,
      gender: flat.gender,
      age: flat.age,
      census_register: flat.census_register,
      zip_code: flat.zip_code,
      political_status: flat.political_status,
      ethnicity: flat.ethnicity,
      status: (flat.identity_status as 'unsubmitted' | 'pending' | 'verified' | 'rejected') || 'unsubmitted',
      verified_at: null,
      reject_reason: flat.identity_reject_reason,
      created_at: flat.created_at,
      updated_at: flat.created_at,
    }
  }
  // 学生字段存在则构建 student 对象
  if (flat.student_status || flat.education || flat.school) {
    detail.student = {
      user_id: flat.id,
      education: flat.education,
      school: flat.school,
      major: flat.major,
      student_card_oss: flat.student_card_oss,
      enrollment_pdf_oss: flat.enrollment_pdf_oss,
      degree_cert_oss: flat.degree_cert_oss,
      status: (flat.student_status as 'unsubmitted' | 'pending' | 'verified' | 'rejected') || 'unsubmitted',
      verified_at: null,
      reject_reason: flat.student_reject_reason,
      created_at: flat.created_at,
      updated_at: flat.created_at,
    }
  }
  return detail
}

const { RangePicker } = DatePicker
const { Text } = Typography

type ReviewQuickFilter =
  | 'all'
  | 'pending'
  | 'identity_pending'
  | 'student_pending'
  | 'approved'
  | 'rejected'

const searchFields: SearchField[] = [
  { name: 'openid', label: '用户名', span: 6, render: () => <Input placeholder="用户名" /> },
  { name: 'phone', label: '手机号', span: 6, render: () => <Input placeholder="手机号" /> },
  { name: 'created_at_range', label: '注册时间', span: 8, render: () => <RangePicker /> },
]

export default function UserList() {
  const [searchFilters, setSearchFilters] = useState<UserFilter>({})
  const [reviewQuickFilter, setReviewQuickFilter] = useState<ReviewQuickFilter>('all')
  const [reviewSummary, setReviewSummary] = useState<UserReviewSummary | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const viewingUserId = useRef<number | null>(null)
  const { exporting, startExport, finishExport } = useExport()
  const canWrite = usePermission('user:write')
  const canDelete = usePermission('user:delete')

  const filters = useMemo<UserFilter>(() => {
    if (reviewQuickFilter === 'all') return searchFilters
    if (reviewQuickFilter === 'pending') return { ...searchFilters, review_status: 'pending' }
    if (reviewQuickFilter === 'identity_pending') return { ...searchFilters, identity_status: 'pending' }
    if (reviewQuickFilter === 'student_pending') return { ...searchFilters, student_status: 'pending' }
    if (reviewQuickFilter === 'approved') return { ...searchFilters, review_status: 'approved' }
    return { ...searchFilters, review_status: 'rejected' }
  }, [reviewQuickFilter, searchFilters])

  const { data, loading, pagination, refresh } = usePagination(
    (page) => userService.list({ ...filters, ...page }),
    [filters],
  )

  // 审核状态由列表接口直接返回（identity_status / student_status）

  const refreshReviewSummary = useCallback(async () => {
    try {
      setReviewSummary(await userService.reviewSummary(10))
    } catch {
      setReviewSummary({
        identity_pending_count: 0,
        student_pending_count: 0,
        latest_pending: [],
      })
    }
  }, [])

  useEffect(() => {
    void refreshReviewSummary()
  }, [refreshReviewSummary])

  const handleSearch = useCallback((values: Record<string, unknown>) => {
    const { openid, phone, created_at_range } = values
    const rangeArr = created_at_range as [string, string] | undefined
    setSearchFilters({
      openid: openid as string | undefined,
      phone: phone as string | undefined,
      created_at_start: (rangeArr?.filter(Boolean).length === 2) ? rangeArr![0] : undefined,
      created_at_end: (rangeArr?.filter(Boolean).length === 2) ? rangeArr![1] : undefined,
    })
  }, [])

  const handleReset = useCallback(() => {
    setSearchFilters({})
  }, [])

  const handleRowClick = async (record: User) => {
    viewingUserId.current = record.id
    setDrawerOpen(true)
    setSelectedUser(null)
    const [flat, orders, conversations] = await Promise.all([
      userService.getProfile(record.id),
      userService.getOrders(record.id),
      userService.getConversations(record.id),
    ])
    setSelectedUser(mapProfileToDetail(flat, record, orders, conversations))
  }

  const handleRefreshDetail = useCallback(async () => {
    const id = viewingUserId.current
    if (!id) return
    const [flat, orders, conversations] = await Promise.all([
      userService.getProfile(id),
      userService.getOrders(id),
      userService.getConversations(id),
    ])
    // 复用列表中的基本信息
    const base = data?.items?.find((u) => u.id === id)
    setSelectedUser(mapProfileToDetail(flat, base || { id, openid: '', phone: '', is_active: false, created_at: '' }, orders, conversations))
  }, [data?.items])

  const handleReviewSaved = useCallback(async () => {
    await handleRefreshDetail()
    await refreshReviewSummary()
    refresh()
  }, [handleRefreshDetail, refresh, refreshReviewSummary])

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
      title: '实名审核',
      dataIndex: 'identity_status',
      width: 90,
      render: (s: string | null) => {
        const k = s || 'unsubmitted'
        const cfg = LEVEL2_STATUS_MAP[k]
        return <Tag color={cfg?.color}>{cfg?.text ?? k}</Tag>
      },
    },
    {
      title: '学生审核',
      dataIndex: 'student_status',
      width: 110,
      render: (_: unknown, record: User) => {
        const s = record.student_status || 'unsubmitted'
        const cfg = LEVEL2_STATUS_MAP[s]
        return <Tag color={cfg?.color}>{cfg?.text ?? s}</Tag>
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
          {canWrite && (
            <ConfirmButton
              title={record.is_active ? '禁用用户' : '启用用户'}
              description={`确认${record.is_active ? '禁用' : '启用'}此用户？`}
              type="link"
              size="small"
              onConfirm={() => handleToggleStatus(record)}
            >
              {record.is_active ? '禁用' : '启用'}
            </ConfirmButton>
          )}
          {canDelete && (
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
          )}
        </Space>
      ),
    },
  ]

  const nextPending = useMemo(() => {
    const currentId = selectedUser?.id
    return reviewSummary?.latest_pending.find(item => item.user_id !== currentId) ?? null
  }, [reviewSummary, selectedUser?.id])

  const openNextPending = useCallback(() => {
    if (!nextPending) {
      message.info('暂无待审核用户')
      return
    }
    void handleRowClick({
      id: nextPending.user_id,
      openid: nextPending.openid,
      phone: nextPending.phone || '',
      is_active: nextPending.is_active,
      identity_status: nextPending.identity_status,
      student_status: nextPending.student_status,
      created_at: nextPending.created_at,
    })
  }, [handleRowClick, nextPending])

  return (
    <PageContainer title="用户管理">
      <Space size={16} style={{ marginBottom: 16 }} wrap>
        <Card
          size='small'
          hoverable
          onClick={() => setReviewQuickFilter('identity_pending')}
          style={{ minWidth: 210, borderColor: reviewQuickFilter === 'identity_pending' ? '#1677ff' : undefined }}
        >
          <Text type='secondary'>待实名审核</Text>
          <div style={{ fontSize: 24, fontWeight: 600, margin: '6px 0' }}>
            {reviewSummary?.identity_pending_count ?? 0}
          </div>
          <Text type='secondary'>
            {(reviewSummary?.identity_pending_count ?? 0) === 0 ? '暂无待审核用户' : '点击查看待审列表'}
          </Text>
        </Card>
        <Card
          size='small'
          hoverable
          onClick={() => setReviewQuickFilter('student_pending')}
          style={{ minWidth: 210, borderColor: reviewQuickFilter === 'student_pending' ? '#1677ff' : undefined }}
        >
          <Text type='secondary'>待学生审核</Text>
          <div style={{ fontSize: 24, fontWeight: 600, margin: '6px 0' }}>
            {reviewSummary?.student_pending_count ?? 0}
          </div>
          <Text type='secondary'>
            {(reviewSummary?.student_pending_count ?? 0) === 0 ? '暂无待审核用户' : '点击查看待审列表'}
          </Text>
        </Card>
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <SearchForm fields={searchFields} onSearch={handleSearch} onReset={handleReset} />
        <Space style={{ flexShrink: 0 }}>
          {canDelete && selectedRowKeys.length > 0 && (
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

      <Space direction='vertical' size={12} style={{ width: '100%', marginBottom: 16 }}>
        <Radio.Group
          optionType='button'
          buttonStyle='solid'
          value={reviewQuickFilter}
          onChange={(event) => setReviewQuickFilter(event.target.value as ReviewQuickFilter)}
          options={[
            { value: 'all', label: '全部' },
            { value: 'pending', label: '待审核' },
            { value: 'identity_pending', label: '待实名审核' },
            { value: 'student_pending', label: '待学生审核' },
            { value: 'approved', label: '已通过' },
            { value: 'rejected', label: '已驳回' },
          ]}
        />
        {(reviewSummary?.identity_pending_count ?? 0) === 0
          && (reviewSummary?.student_pending_count ?? 0) === 0 && (
          <Alert type='success' showIcon message='暂无待审核用户' />
        )}
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        rowSelection={canDelete ? rowSelection : undefined}
      />

      <UserDetailDrawer
        user={selectedUser}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleReviewSaved}
        nextPending={nextPending}
        onNextPending={openNextPending}
      />
    </PageContainer>
  )
}
