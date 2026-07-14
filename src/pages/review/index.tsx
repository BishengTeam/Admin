import { useState, useEffect, useCallback, useMemo } from 'react'
import { Table, Tag, Button, Space, Tabs, message, Modal, Input, Descriptions, Image, Popover } from 'antd'
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { usePagination } from '@/hooks/usePagination'
import { userService } from '@/services/users'
import { orderService } from '@/services/orders'
import { usePermission } from '@/hooks/usePermission'
import { fetchAllPages } from '@/utils/pagination'
import { formatDate, formatPrice } from '@/utils/format'
import type { ReviewRecord, ReviewTargetType, User, UserRealnameInfo, UserStudentInfo, UserEnterpriseInfo } from '@/types/user'
import type { Order, OrderDetail } from '@/types/order'

// ─── 待审核项 ───

interface PendingItem {
  key: string
  target_type: string
  target_id: number
  types: ReviewTargetType[]
  summary: string
  detail: string
  created_at: string
}

const TARGET_LABELS: Record<string, string> = {
  identity: '实名',
  student: '学生',
  enterprise: '企业',
  order: '订单',
}

const TYPE_COLORS: Record<string, string> = {
  identity: 'orange',
  student: 'blue',
  enterprise: 'purple',
  order: 'cyan',
}

// ─── 审核历史列 ───

const ACTION_MAP: Record<string, { text: string; color: string }> = {
  approve: { text: '通过', color: 'green' },
  reject: { text: '驳回', color: 'red' },
}

const historyColumns: ColumnsType<ReviewRecord> = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
  { title: '对象', dataIndex: 'target_type', width: 80, render: (t: string) => <Tag>{TARGET_LABELS[t] ?? t}</Tag> },
  { title: '对象ID', dataIndex: 'target_id', width: 70 },
  { title: '操作', dataIndex: 'action', width: 70, render: (a: string) => <Tag color={ACTION_MAP[a]?.color}>{ACTION_MAP[a]?.text ?? a}</Tag> },
  { title: '备注', dataIndex: 'comment', ellipsis: true, render: (c: string | null) => c || '-' },
]

// ─── 详情弹窗 ───

interface DetailModalProps {
  item: PendingItem
  canReview: boolean
  onClose: () => void
  onReviewed: () => Promise<void> | void
}

function DetailModal({ item, canReview, onClose, onReviewed }: DetailModalProps) {
  type DetailMap = {
    identity?: UserRealnameInfo
    student?: UserStudentInfo
    enterprise?: UserEnterpriseInfo
    order?: OrderDetail
  }
  const [details, setDetails] = useState<DetailMap>({})
  const [loading, setLoading] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [activeType, setActiveType] = useState(item.types[0])
  const [remainingTypes, setRemainingTypes] = useState<ReviewTargetType[]>(item.types)

  useEffect(() => {
    setRemainingTypes(item.types)
    setActiveType(item.types[0])
    setLoading(true)
    ;(async () => {
      const map: DetailMap = {}
      try {
        for (const t of item.types) {
          if (t === 'identity') map.identity = await userService.getIdentity(item.target_id)
          else if (t === 'student') map.student = await userService.getStudent(item.target_id)
          else if (t === 'enterprise') map.enterprise = await userService.getEnterprise(item.target_id)
          else map.order = await orderService.detail(item.target_id)
        }
      } catch {
        message.error('加载详情失败')
      } finally {
        setLoading(false)
        setDetails(map)
      }
    })()
  }, [item])

  const doAction = async (type: ReviewTargetType, action: 'approve' | 'reject', comment?: string) => {
    setReviewing(true)
    try {
      await userService.review({ target_type: type, target_id: item.target_id, action, comment })
      message.success(action === 'approve' ? '已通过' : '已驳回')
      const remaining = remainingTypes.filter((t) => t !== type)
      await onReviewed()
      if (remaining.length === 0) {
        onClose()
        return
      }
      setRemainingTypes(remaining)
      setActiveType(remaining[0])
    } finally {
      setReviewing(false)
    }
  }
  const renderIdentity = (d: UserRealnameInfo) => (
    <>
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 12 }}>
        <Descriptions.Item label="用户类型">{d.user_type === 'student' ? '学生' : '企业'}</Descriptions.Item>
        <Descriptions.Item label="真实姓名">{d.real_name}</Descriptions.Item>
        <Descriptions.Item label="拼音(姓)">{d.last_name_zh || '-'}</Descriptions.Item>
        <Descriptions.Item label="拼音(名)">{d.first_name_zh || '-'}</Descriptions.Item>
        <Descriptions.Item label="英文(姓)">{d.last_name_en || '-'}</Descriptions.Item>
        <Descriptions.Item label="英文(名)">{d.first_name_en || '-'}</Descriptions.Item>
        <Descriptions.Item label="身份证号" span={2}>{d.id_card_number}</Descriptions.Item>
        <Descriptions.Item label="性别">{d.gender || '-'}</Descriptions.Item>
        <Descriptions.Item label="出生日期">{d.birth_date || '-'}</Descriptions.Item>
        <Descriptions.Item label="年龄">{d.age ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="民族">{d.ethnicity || '-'}</Descriptions.Item>
        <Descriptions.Item label="户籍地">{d.census_register || '-'}</Descriptions.Item>
        <Descriptions.Item label="政治面貌">{d.political_status || '-'}</Descriptions.Item>
        <Descriptions.Item label="邮编">{d.zip_code || '-'}</Descriptions.Item>
        <Descriptions.Item label="审核状态">{d.status}</Descriptions.Item>
        <Descriptions.Item label="身份证正面" span={2}>
          {d.id_card_front_oss ? <Image src={d.id_card_front_oss} style={{ maxHeight: 200 }} /> : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="身份证背面" span={2}>
          {d.id_card_back_oss ? <Image src={d.id_card_back_oss} style={{ maxHeight: 200 }} /> : '—'}
        </Descriptions.Item>
      </Descriptions>
    </>
  )
  const renderStudent = (d: UserStudentInfo) => (
    <Descriptions column={2} bordered size="small" style={{ marginBottom: 12 }}>
      <Descriptions.Item label="学历">{d.education || '-'}</Descriptions.Item>
      <Descriptions.Item label="学校">{d.school || '-'}</Descriptions.Item>
      <Descriptions.Item label="专业">{d.major || '-'}</Descriptions.Item>
      <Descriptions.Item label="审核状态">{d.status}</Descriptions.Item>
      <Descriptions.Item label="学生证照片" span={2}>
        {d.student_card_oss ? <Image src={d.student_card_oss} style={{ maxHeight: 200 }} /> : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="学信网电子注册表" span={2}>
        {d.enrollment_pdf_oss ? <Image src={d.enrollment_pdf_oss} style={{ maxHeight: 200 }} /> : '—'}
      </Descriptions.Item>
      <Descriptions.Item label="学信网学历证明" span={2}>
        {d.degree_cert_oss ? <Image src={d.degree_cert_oss} style={{ maxHeight: 200 }} /> : '—'}
      </Descriptions.Item>
    </Descriptions>
  )

  const renderEnterprise = (d: UserEnterpriseInfo) => (
    <Descriptions column={1} bordered size="small" style={{ marginBottom: 12 }}>
      <Descriptions.Item label="单位名称">{d.organization || '-'}</Descriptions.Item>
      <Descriptions.Item label="审核状态">{d.status}</Descriptions.Item>
    </Descriptions>
  )

  const renderOrder = (d: OrderDetail) => (
    <Descriptions column={2} bordered size="small" style={{ marginBottom: 12 }}>
      <Descriptions.Item label="订单号">{d.out_trade_no}</Descriptions.Item>
      <Descriptions.Item label="商品类型">{d.product_type}</Descriptions.Item>
      <Descriptions.Item label="考生">{d.candidate_name || '-'}</Descriptions.Item>
      <Descriptions.Item label="手机号">{d.candidate_phone || '-'}</Descriptions.Item>
      <Descriptions.Item label="金额">{formatPrice(d.price)}</Descriptions.Item>
      <Descriptions.Item label="状态">{d.status}</Descriptions.Item>
      <Descriptions.Item label="下单时间" span={2}>{formatDate(d.created_at)}</Descriptions.Item>
      {d.extra_data && (
        <Descriptions.Item label="报名信息" span={2}>
          <pre style={{ margin: 0, fontSize: 12, maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(d.extra_data, null, 2)}</pre>
        </Descriptions.Item>
      )}
    </Descriptions>
  )

  const renderContent = () => {
    const t = activeType
    if (t === 'identity' && details.identity) return renderIdentity(details.identity)
    if (t === 'student' && details.student) return renderStudent(details.student)
    if (t === 'enterprise' && details.enterprise) return renderEnterprise(details.enterprise)
    if (t === 'order' && details.order) return renderOrder(details.order)
    return null
  }

  return (
    <Modal
      title={`${TARGET_LABELS[item.target_type] ?? item.target_type}审核详情`}
      open
      width={680}
      onCancel={onClose}
      loading={loading}
      footer={
        <Space>
          <Button onClick={onClose}>{canReview ? '取消' : '关闭'}</Button>
          {canReview && (
            <>
              <Button danger loading={reviewing} onClick={() => {
                let comment = ''
                Modal.confirm({
                  title: '驳回原因',
                  content: <Input.TextArea rows={3} placeholder="驳回原因（选填）" maxLength={256} onChange={(e) => (comment = e.target.value)} />,
                  onOk: () => doAction(activeType, 'reject', comment || undefined),
                })
              }}>驳回</Button>
              <Button type="primary" loading={reviewing} onClick={() => doAction(activeType, 'approve')}>通过</Button>
            </>
          )}
        </Space>
      }
    >
      {remainingTypes.length > 1 && (
        <Tabs
          activeKey={activeType}
          onChange={(key) => setActiveType(key as ReviewTargetType)}
          items={remainingTypes.map((t) => ({ key: t, label: TARGET_LABELS[t] ?? t }))}
          style={{ marginBottom: 8 }}
        />
      )}
      {!loading && renderContent()}
    </Modal>
  )
}

// ─── 从 API 构建待审核项 ───

function buildUserItems(users: User[], statusField: string, targetType: ReviewTargetType): PendingItem[] {
  return users
    .filter((u) => {
      const key = statusField as keyof User
      return u[key] === 'pending'
    })
    .map((u) => ({
      key: `${targetType}-${u.id}`,
      target_type: targetType,
      target_id: u.id,
      types: [targetType],
      summary: `用户 #${u.id}`,
      detail: u.openid,
      created_at: u.created_at,
    }))
}

function buildOrderItems(orders: Order[]): PendingItem[] {
  return orders.map((o) => ({
    key: `order-${o.id}`,
    target_type: 'order',
    target_id: o.id,
    types: ['order'],
    summary: o.product_type,
    detail: `${o.candidate_name || '-'} · ${formatPrice(o.price)} · ${o.out_trade_no}`,
    created_at: o.created_at,
  }))
}

/** 将同一用户的多个待审项合并为一条 */
function mergeItems(items: PendingItem[]): PendingItem[] {
  const userMap = new Map<number, PendingItem>()
  const orderItems: PendingItem[] = []
  for (const item of items) {
    if (item.target_type === 'order') {
      orderItems.push(item)
      continue
    }
    const existing = userMap.get(item.target_id)
    if (existing) {
      existing.types.push(item.types[0])
      // 保留最新的时间
      if (new Date(item.created_at) > new Date(existing.created_at)) {
        existing.created_at = item.created_at
      }
    } else {
      userMap.set(item.target_id, { ...item })
    }
  }
  const merged = [...userMap.values(), ...orderItems]
  // 更新合并项的 key 和 target_type
  for (const item of merged) {
    if (item.types.length > 1) {
      item.key = `user-${item.target_id}`
      const order = ['identity', 'student', 'enterprise']
      item.types.sort((a, b) => order.indexOf(a) - order.indexOf(b))
      item.target_type = item.types.join('-')
    }
  }
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return merged
}

// ─── 页面 ───

export default function ReviewList() {
  const [tab, setTab] = useState('pending')
  const [rawItems, setRawItems] = useState<PendingItem[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingType, setPendingType] = useState('all')
  const [viewItem, setViewItem] = useState<PendingItem | null>(null)
  const canReview = usePermission('user:write')

  const { data: historyData, loading: historyLoading, pagination: historyPagination } = usePagination(
    (page) => userService.reviewHistory(page),
    [],
  )

  const fetchPending = useCallback(async () => {
    setPendingLoading(true)
    try {
      const [identityUsers, studentUsers, enterpriseUsers, orders] = await Promise.all([
        fetchAllPages((page, pageSize) => userService.list({ identity_status: 'pending', page, page_size: pageSize })),
        fetchAllPages((page, pageSize) => userService.list({ student_status: 'pending', page, page_size: pageSize })),
        fetchAllPages((page, pageSize) => userService.list({ enterprise_status: 'pending', page, page_size: pageSize })),
        fetchAllPages((page, pageSize) => orderService.list({ status: 'paid', page, page_size: pageSize })),
      ])
      const items: PendingItem[] = [
        ...buildUserItems(identityUsers, 'identity_status', 'identity'),
        ...buildUserItems(studentUsers, 'student_status', 'student'),
        ...buildUserItems(enterpriseUsers, 'enterprise_status', 'enterprise'),
        ...buildOrderItems(orders),
      ]
      setRawItems(items)
    } finally {
      setPendingLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'pending') fetchPending()
  }, [tab, fetchPending])

  // 「全部」Tab 聚合展示，「实名/学生/企业/订单」Tab 扁平展示
  const mergedItems = useMemo(() => mergeItems(rawItems), [rawItems])

  const displayItems = pendingType === 'all'
    ? mergedItems
    : rawItems.filter((i) => i.target_type === pendingType)

  const pendingColumns = useMemo<ColumnsType<PendingItem>>(() => [
    {
      title: '摘要',
      dataIndex: 'summary',
      render: (summary: string, record) => (
        <Space size={4}>
          <span>{summary}</span>
          {record.types.map((type) => (
            <Tag key={type} color={TYPE_COLORS[type]} style={{ margin: 0, fontSize: 11 }}>
              {TARGET_LABELS[type]}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '详情',
      dataIndex: 'detail',
      ellipsis: true,
      render: (detail: string) => <span style={{ color: '#666', fontSize: 13 }}>{detail}</span>,
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewItem(record)}>
          查看
        </Button>
      ),
    },
  ], [])

  const typeTabs = [
    { key: 'all', label: `全部 (${mergedItems.length})` },
    { key: 'identity', label: `实名 (${rawItems.filter((i) => i.target_type === 'identity').length})` },
    { key: 'student', label: `学生 (${rawItems.filter((i) => i.target_type === 'student').length})` },
    { key: 'enterprise', label: `企业 (${rawItems.filter((i) => i.target_type === 'enterprise').length})` },
    { key: 'order', label: `订单 (${rawItems.filter((i) => i.target_type === 'order').length})` },
  ]

  return (
    <PageContainer title="审核管理">
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'pending',
            label: '待审核',
            children: (
              <>
                <Tabs
                  activeKey={pendingType}
                  onChange={setPendingType}
                  items={typeTabs.map((t) => ({ key: t.key, label: t.label }))}
                  style={{ marginBottom: 8 }}
                />
                <Table
                  rowKey="key"
                  columns={pendingColumns}
                  dataSource={displayItems}
                  loading={pendingLoading}
                  pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                  onRow={(record) => ({
                    style: { cursor: 'pointer' },
                    onDoubleClick: () => setViewItem(record),
                  })}
                />
              </>
            ),
          },
          {
            key: 'history',
            label: '审核历史',
            children: (
              <Table
                rowKey="id"
                columns={historyColumns}
                dataSource={historyData?.items}
                loading={historyLoading}
                pagination={historyPagination}
              />
            ),
          },
        ]}
      />

      {viewItem && (
        <DetailModal
          item={viewItem}
          canReview={canReview}
          onClose={() => setViewItem(null)}
          onReviewed={fetchPending}
        />
      )}
    </PageContainer>
  )
}
