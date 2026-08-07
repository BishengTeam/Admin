import { useState, useCallback, useEffect } from 'react'
import { Table, Tabs, Input, Select, DatePicker, Button, Avatar, Space, message } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { AccountBookOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { StatusTag } from '@/components/StatusTag'
import { usePagination } from '@/hooks/usePagination'
import { useExport } from '@/hooks/useExport'
import { orderService } from '@/services/orders'
import { ORDER_STATUS_MAP } from '@/core/constants'
import { formatDate, formatPrice } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import type { Order, OrderFilter, OrderStatus, OrderDetail } from '@/types/order'
import OrderDetailDrawer from './components/OrderDetailDrawer'
import ReconciliationModal from './components/ReconciliationModal'

const { RangePicker } = DatePicker

const statusTabs: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待支付' },
  { key: 'paid', label: '已支付' },
  { key: 'completed', label: '已完成' },
  { key: 'refunded', label: '已退款' },
  { key: 'closed', label: '已关闭' },
]

const productOptions = [
  { label: 'H3CNE-RS+', value: 'H3CNE-RS+' },
  { label: 'H3CSE-RS+', value: 'H3CSE-RS+' },
  { label: 'H3CIE-RS+', value: 'H3CIE-RS+' },
  { label: '深信服安全', value: '深信服安全' },
  { label: 'NISP一级', value: 'NISP一级' },
  { label: '人社 RS-ZY', value: 'RS-ZY' },
]

// ── 商品类型 → 列表摘要字段 ──
// 每个 product_type 取 2-3 个最关键的 extra_data 字段在列表中展示
const productSummaryKeys: Record<string, string[]> = {
  h3c: ['first_name', 'last_name', 'education'],
  sangfor: ['email', 'exam_direction'],
  nisp1: ['school', 'province'],
  nisp2: ['school', 'province'],
  renshe: ['branch'],
}

// ── 字段 key → 中文标签 ──
const extraFieldLabels: Record<string, string> = {
  first_name: 'FirstName',
  last_name: 'LastName',
  education: '学历',
  exam_date: '考试日期',
  email: '邮箱',
  exam_direction: '考试方向',
  school: '学校',
  province: '省份',
  branch: '分院',
}

function renderExtraSummary(record: Order): string {
  const d = record.extra_data as Record<string, unknown> | null
  if (!d) return '-'
  const keys = productSummaryKeys[record.product_type]
  if (!keys?.length) return '-'
  const parts = keys
    .map((k) => d[k])
    .filter(Boolean)
    .map((v) => String(v))
  return parts.length > 0 ? parts.join(' · ') : '-'
}

export default function OrderList() {
  const [filters, setFilters] = useState<OrderFilter>({})
  const [activeTab, setActiveTab] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [reconciliationOpen, setReconciliationOpen] = useState(false)
  const { exporting, startExport, finishExport } = useExport()
  const location = useLocation()
  const navigate = useNavigate()

  const { data, loading, pagination } = usePagination(
    (page) => orderService.list({ ...filters, ...page }),
    [filters],
  )

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    setFilters((f) => ({ ...f, status: (key || undefined) as OrderStatus | undefined }))
  }

  const handleSearch = useCallback(() => {
    setFilters((f) => ({ ...f, phone: searchPhone || undefined }))
  }, [searchPhone])

  const handleReset = useCallback(() => {
    setSearchPhone('')
    setFilters({})
    setActiveTab('')
  }, [])

  const handleExport = async () => {
    startExport()
    try {
      const blob = await orderService.export(filters)
      downloadBlob(blob, `订单导出_${new Date().toISOString().slice(0, 10)}.xlsx`)
      message.success('导出成功')
    } finally {
      finishExport()
    }
  }

  const handleViewDetail = async (record: Order) => {
    const detail = await orderService.detail(record.id)
    setDetailOrder(detail)
    setDrawerOpen(true)
  }

  useEffect(() => {
    const orderId = (location.state as { orderId?: number } | null)?.orderId
    if (!orderId) return

    orderService.detail(orderId).then((detail) => {
      setDetailOrder(detail)
      setDrawerOpen(true)
    })
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'out_trade_no',
      width: 160,
      render: (text: string) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
    },
    {
      title: '用户',
      dataIndex: 'candidate_name',
      width: 100,
      render: (name: string | null) => {
        const display = name || '-'
        return (
          <Space>
            <Avatar size="small">{display[0]}</Avatar>
            <span>{display}</span>
          </Space>
        )
      },
    },
    {
      title: '手机号',
      dataIndex: 'candidate_phone',
      width: 140,
      render: (phone: string | null) => phone || '-',
    },
    {
      title: '类型',
      dataIndex: 'order_kind',
      width: 100,
      render: (k: string) => (k === 'course' ? '课程' : '认证报名'),
    },
    {
      title: '商品类型',
      dataIndex: 'product_type',
      width: 120,
    },
    {
      title: '报名信息',
      width: 100,
      ellipsis: true,
      render: (_, record) => (
        <span style={{ color: '#666', fontSize: 13 }}>{renderExtraSummary(record)}</span>
      ),
    },
    {
      title: '金额',
      dataIndex: 'price',
      width: 100,
      render: (a: number) => <span style={{ fontWeight: 500 }}>{formatPrice(a)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => <StatusTag status={s} map={ORDER_STATUS_MAP} />,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (t: string) => formatDate(t),
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            查看
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer
      title="订单管理"
      extra={
        <Space>
          <Button icon={<AccountBookOutlined />} onClick={() => setReconciliationOpen(true)}>
            对账
          </Button>
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
            导出
          </Button>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={handleTabChange} items={statusTabs} style={{ marginBottom: 16 }} />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="用户手机号"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          style={{ width: 160 }}
          onPressEnter={handleSearch}
        />
        <Select
          placeholder="商品类型"
          allowClear
          style={{ width: 150 }}
          options={productOptions}
          value={filters.product_type}
          onChange={(val) => setFilters((f) => ({ ...f, product_type: val || undefined }))}
        />
        <RangePicker
          value={filters.date_range?.length === 2 ? [dayjs(filters.date_range[0]), dayjs(filters.date_range[1])] : undefined}
          onChange={(_, dateStrings) =>
            setFilters((f) => ({
              ...f,
              date_range: dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : undefined,
            }))
          }
        />
        <Button type="primary" onClick={handleSearch}>查询</Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
      />

      <OrderDetailDrawer
        order={detailOrder}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <ReconciliationModal
        open={reconciliationOpen}
        onClose={() => setReconciliationOpen(false)}
      />
    </PageContainer>
  )
}
