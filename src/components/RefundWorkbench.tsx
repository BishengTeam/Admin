import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { ReloadOutlined } from '@ant-design/icons'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { h3cService } from '@/services/h3c'
import { nispService } from '@/services/nisp'
import { rensheService } from '@/services/renshe'
import {
  refundWorkbenchService,
  type RefundVendor,
  type RefundWorkbenchRecord,
} from '@/services/refundWorkbench'
import { formatDate, formatPrice } from '@/utils/format'
import { refundErrorText } from '@/utils/refund'

const { Text } = Typography
const { RangePicker } = DatePicker

type RefundGroup = 'pending' | 'processing' | 'abnormal' | 'all'

interface RefundWorkbenchProps {
  vendor: RefundVendor
  batchId?: number
  registrationId?: number
  embedded?: boolean
  onChanged?: () => void
}

const GROUP_STATUS: Record<Exclude<RefundGroup, 'all'>, string[]> = {
  pending: ['requested'],
  processing: ['approved', 'processing'],
  abnormal: ['failed'],
}

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  requested: { text: '待处理', color: 'orange' },
  approved: { text: '已确认', color: 'blue' },
  processing: { text: '处理中', color: 'processing' },
  succeeded: { text: '已退款', color: 'green' },
  rejected: { text: '已驳回', color: 'default' },
  failed: { text: '退款异常', color: 'red' },
}

const REASON_OPTIONS: Record<RefundVendor, Array<{ value: string; label: string }>> = {
  h3c: [
    { value: 'review_failed', label: '审核未通过' },
    { value: 'batch_cancelled', label: '批次取消' },
    { value: 'exception_close', label: '异常关闭' },
  ],
  nisp: [
    { value: 'review_failed', label: '审核未通过' },
    { value: 'batch_cancelled', label: '批次取消' },
    { value: 'exception_close', label: '异常关闭' },
  ],
  renshe: [
    { value: 'normal', label: '普通退款' },
    { value: 'exception', label: '例外退款' },
    { value: 'batch_cancel', label: '批次取消退款' },
    { value: 'batch_finalize', label: '批次终结退款' },
  ],
}

function statusTag(status: string) {
  const config = STATUS_CONFIG[status] ?? { text: status, color: 'default' }
  return <Tag color={config.color}>{config.text}</Tag>
}

function waitingText(row: RefundWorkbenchRecord): string {
  const milliseconds = Date.now() - new Date(row.requestedAt).getTime()
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '-'
  const hours = Math.floor(milliseconds / 3_600_000)
  if (hours < 1) return '<1小时'
  if (hours < 24) return `${hours}小时`
  return `${Math.floor(hours / 24)}天`
}

function nextStepText(row: RefundWorkbenchRecord): string {
  if (row.status === 'requested') return '等待管理员处理'
  if (row.status === 'approved') return '已确认，等待渠道处理'
  if (row.status === 'processing') return '渠道处理中，可查询结果确认'
  if (row.status === 'failed') return '退款异常，需要人工处理或重试'
  if (row.status === 'succeeded') return '退款已完成'
  if (row.status === 'rejected') return '退款已驳回'
  return '状态未知'
}

export function RefundWorkbench({
  vendor,
  batchId,
  registrationId,
  embedded = false,
  onChanged,
}: RefundWorkbenchProps) {
  const navigate = useNavigate()
  const { admin, permissions } = useAuth()
  const isSuperAdmin = admin?.role === 'super_admin' || permissions.includes('*')
  const canOpenRegistration = permissions.includes('*')
    || permissions.includes(vendor === 'h3c' ? 'h3c:review' : vendor === 'nisp' ? 'nisp:review' : 'user:list')
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const [group, setGroup] = useState<RefundGroup>(embedded ? 'all' : 'pending')
  const [keyword, setKeyword] = useState('')
  const [reason, setReason] = useState<string>()
  const [status, setStatus] = useState<string>()
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [batchFilter, setBatchFilter] = useState<number | undefined>(batchId)
  const [batchOptions, setBatchOptions] = useState<Array<{ value: number; label: string }>>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<RefundWorkbenchRecord | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [requestFailed, setRequestFailed] = useState(false)
  const [rejecting, setRejecting] = useState<RefundWorkbenchRecord | null>(null)
  const [rejectForm] = Form.useForm<{ reason: string }>()

  useEffect(() => {
    setBatchFilter(batchId)
  }, [batchId])

  useEffect(() => {
    if (embedded) return
    refundWorkbenchService.batchOptions(vendor)
      .then(setBatchOptions)
      .catch(() => setBatchOptions([]))
  }, [embedded, vendor])

  const { data, loading, pagination, refresh } = usePagination(
    async page => {
      try {
        const result = await refundWorkbenchService.list(vendor, {
          ...page,
          registration_id: registrationId,
          batch_id: batchFilter,
          group: group === 'all' ? undefined : group,
          keyword: keyword.trim() || undefined,
          request_kind: reason,
          requested_at_start: range?.[0]?.toISOString(),
          requested_at_end: range?.[1]?.toISOString(),
          status,
        })
        setRequestFailed(false)
        return result
      } catch (error) {
        setRequestFailed(true)
        throw error
      }
    },
    [batchFilter, group, keyword, range, reason, registrationId, status, vendor],
  )

  const selected = useMemo(
    () => data?.items.find(item => item.id === selectedId)
      ?? (selectedRecord?.id === selectedId ? selectedRecord : null),
    [data?.items, selectedId, selectedRecord],
  )
  const statusCounts = data?.status_counts ?? {}
  const groupCount = (value: RefundGroup) => {
    if (value === 'all') return Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
    return GROUP_STATUS[value].reduce(
      (sum, statusValue) => sum + (statusCounts[statusValue] ?? 0),
      0,
    )
  }

  const uncertain = useCallback((error: unknown) => {
    message.warning(
      error instanceof Error
        ? `请求结果待确认：${error.message}。请刷新或查询后再处理`
        : '请求结果待确认，请刷新或查询后再处理',
      4,
    )
  }, [])

  const refreshAfterChange = useCallback(() => {
    void refresh()
    onChanged?.()
  }, [onChanged, refresh])

  const openDetail = (row: RefundWorkbenchRecord) => {
    setSelectedId(row.id)
    setSelectedRecord(row)
  }

  const confirmH3c = (row: RefundWorkbenchRecord) => {
    Modal.confirm({
      title: '确认 H3C 退款',
      content: `人员：${row.candidateName || row.registrationNo || row.registrationId}，金额 ${formatPrice(row.amountCents)}。确认后将提交微信退款并关闭报名。`,
      okText: '重新验证并确认',
      okButtonProps: { danger: true },
      onOk: async () => {
        setProcessingId(row.id)
        try {
          const token = await ensureReauthenticated()
          if (!token) throw new Error('请重新验证管理员密码')
          const updated = await h3cService.confirmRefund(row.id, token)
          message.success('H3C 退款已确认提交')
          setSelectedRecord(refundWorkbenchService.normalize('h3c', updated))
          refreshAfterChange()
        } catch (error) {
          uncertain(error)
        } finally {
          setProcessingId(null)
        }
      },
    })
  }

  const confirmNisp = (row: RefundWorkbenchRecord) => {
    Modal.confirm({
      title: '确认 NISP 退款',
      content: `人员：${row.candidateName || row.registrationNo || row.registrationId}，金额 ${formatPrice(row.amountCents)}。确认后将提交微信退款。`,
      okText: '确认退款',
      okButtonProps: { danger: true },
      onOk: async () => {
        setProcessingId(row.id)
        try {
          const updated = await nispService.confirmRefund(row.id)
          message.success('NISP 退款已提交')
          setSelectedRecord(refundWorkbenchService.normalize('nisp', updated))
          refreshAfterChange()
        } catch (error) {
          uncertain(error)
        } finally {
          setProcessingId(null)
        }
      },
    })
  }

  const reconcileNisp = async (row: RefundWorkbenchRecord) => {
    setProcessingId(row.id)
    try {
      const updated = await nispService.reconcileRefund(row.id)
      message.success('NISP 退款查询完成')
      setSelectedRecord(refundWorkbenchService.normalize('nisp', updated))
      refreshAfterChange()
    } catch (error) {
      uncertain(error)
    } finally {
      setProcessingId(null)
    }
  }

  const approveRenshe = (row: RefundWorkbenchRecord, retry = false) => {
    Modal.confirm({
      title: retry ? '重试人社退款' : '批准人社退款',
      content: `人员：${row.candidateName || row.registrationNo || row.registrationId}，金额 ${formatPrice(row.amountCents)}。${
        retry ? '将使用原退款单号重新发起。' : '批准后将提交微信退款。'
      }`,
      okText: retry ? '确认重试' : '确认批准',
      onOk: async () => {
        setProcessingId(row.id)
        try {
          const updated = await rensheService.decideRefund(row.id, { decision: 'approved' })
          if (updated.status === 'failed') {
            message.error(updated.last_error || '退款发起失败')
          } else {
            message.success(retry ? '退款已重新发起' : '退款已批准')
          }
          setSelectedRecord(refundWorkbenchService.normalize('renshe', updated))
          refreshAfterChange()
        } catch (error) {
          uncertain(error)
        } finally {
          setProcessingId(null)
        }
      },
    })
  }

  const rejectRenshe = async () => {
    if (!rejecting) return
    const values = await rejectForm.validateFields()
    setProcessingId(rejecting.id)
    try {
      const updated = await rensheService.decideRefund(rejecting.id, {
        decision: 'rejected',
        reason: values.reason.trim(),
      })
      message.success('退款申请已驳回')
      setSelectedRecord(refundWorkbenchService.normalize('renshe', updated))
      setRejecting(null)
      rejectForm.resetFields()
      refreshAfterChange()
    } catch (error) {
      uncertain(error)
    } finally {
      setProcessingId(null)
    }
  }

  const primaryAction = (row: RefundWorkbenchRecord) => {
    if (vendor === 'h3c' && ['requested', 'failed'].includes(row.status)) {
      return (
        <Button danger loading={processingId === row.id} onClick={() => confirmH3c(row)}>
          确认退款
        </Button>
      )
    }
    if (vendor === 'nisp' && ['requested', 'approved', 'processing', 'failed'].includes(row.status)) {
      return (
        <Space size={4}>
          {row.status !== 'processing' && (
            <Button type='primary' loading={processingId === row.id} onClick={() => confirmNisp(row)}>
              确认退款
            </Button>
          )}
          {['approved', 'processing', 'failed'].includes(row.status) && (
            <Button loading={processingId === row.id} onClick={() => void reconcileNisp(row)}>
              查询结果
            </Button>
          )}
        </Space>
      )
    }
    if (vendor === 'renshe' && isSuperAdmin && row.status === 'requested') {
      return <Button type='primary' onClick={() => approveRenshe(row)}>批准</Button>
    }
    if (vendor === 'renshe' && isSuperAdmin && row.status === 'failed') {
      return <Button onClick={() => approveRenshe(row, true)}>重试</Button>
    }
    return null
  }

  const columns: ColumnsType<RefundWorkbenchRecord> = [
    {
      title: '报名人员',
      width: 180,
      ellipsis: true,
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <Text strong>{row.candidateName || '-'}</Text>
          <Text type='secondary' copyable={Boolean(row.registrationNo)}>
            {row.registrationNo || `#${row.registrationId}`}
          </Text>
        </Space>
      ),
    },
    ...(!embedded ? [{
      title: '所属批次',
      width: 210,
      ellipsis: true,
      render: (_: RefundWorkbenchRecord, row: RefundWorkbenchRecord) => (
        <Space direction='vertical' size={0}>
          <Text>{row.batchName || '-'}</Text>
          <Text type='secondary'>{row.productLabel || '-'}</Text>
        </Space>
      ),
    }] : []),
    { title: '金额', width: 105, render: (_, row) => formatPrice(row.amountCents) },
    {
      title: '原因',
      width: 145,
      ellipsis: true,
      render: (_, row) => REASON_OPTIONS[vendor].find(item => item.value === row.requestKind)?.label || row.reasonCode,
    },
    { title: '状态', width: 100, render: (_, row) => statusTag(row.status) },
    {
      title: '申请 / 等待',
      width: 175,
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <Text>{formatDate(row.requestedAt)}</Text>
          {!['succeeded', 'rejected'].includes(row.status) && (
            <Text type={waitingText(row) === '-' ? 'secondary' : 'warning'} style={{ fontSize: 12 }}>
              等待 {waitingText(row)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '异常摘要',
      ellipsis: true,
      render: (_, row) => row.lastError
        ? <Text type='danger'>{refundErrorText(row.lastError)}</Text>
        : row.rejectionReason || row.reasonDetail || '-',
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' onClick={() => openDetail(row)}>详情</Button>
          {primaryAction(row)}
          {vendor === 'renshe' && isSuperAdmin && row.status === 'requested' && (
            <Button size='small' danger onClick={() => setRejecting(row)}>驳回</Button>
          )}
        </Space>
      ),
    },
  ]

  const content = (
    <>
      {registrationId && (
        <Alert
          style={{ marginBottom: 12 }}
          type='info'
          showIcon
          message='已按报名人员筛选退款记录'
          description='当前列表来自人员详情的退款摘要入口，仅显示该人员的退款历史。'
        />
      )}
      <Tabs
        activeKey={group}
        onChange={value => {
          setGroup(value as RefundGroup)
          setStatus(undefined)
        }}
        items={[
          { key: 'pending', label: `待处理（${groupCount('pending')}）` },
          { key: 'processing', label: `处理中（${groupCount('processing')}）` },
          { key: 'abnormal', label: `异常（${groupCount('abnormal')}）` },
          { key: 'all', label: `全部记录（${groupCount('all')}）` },
        ]}
      />
      <Space style={{ marginBottom: 16 }} wrap>
        {!embedded && (
          <Select
            allowClear
            showSearch
            optionFilterProp='label'
            placeholder='所属批次'
            style={{ width: 220 }}
            value={batchFilter}
            onChange={setBatchFilter}
            options={batchOptions}
          />
        )}
        <Input.Search
          allowClear
          placeholder='姓名 / 订单号 / 退款单号'
          style={{ width: 260 }}
          defaultValue={keyword}
          onSearch={setKeyword}
        />
        <Select
          allowClear
          placeholder='退款原因'
          style={{ width: 155 }}
          value={reason}
          onChange={setReason}
          options={REASON_OPTIONS[vendor]}
        />
        <Select
          allowClear
          placeholder='具体状态'
          style={{ width: 135 }}
          value={status}
          onChange={value => {
            setStatus(value)
            setGroup('all')
          }}
          options={Object.entries(STATUS_CONFIG).map(([value, config]) => ({
            value,
            label: config.text,
          }))}
        />
        <RangePicker showTime value={range ?? undefined} onChange={setRange} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => refresh()}>刷新</Button>
      </Space>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: embedded ? 1250 : 1450 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                loading
                  ? '正在加载退款记录'
                  : requestFailed
                    ? '退款记录加载失败，请重试'
                    : '没有符合条件的退款记录'
              }
            />
          ),
        }}
      />

      <Drawer
        title={`退款详情 #${selected?.id ?? ''}`}
        open={Boolean(selected)}
        width={620}
        onClose={() => {
          setSelectedId(null)
          setSelectedRecord(null)
        }}
        extra={!embedded && selected?.batchId && (
          <Space>
            {canOpenRegistration && (
              <Button onClick={() => navigate(
                `/admin/certification/${vendor}/batches/${selected.batchId}?openRegistrationId=${selected.registrationId}`,
              )}>
                进入报名详情
              </Button>
            )}
            <Button onClick={() => navigate(`/admin/certification/${vendor}/batches/${selected.batchId}`)}>
              进入批次工作台
            </Button>
          </Space>
        )}
      >
        {selected && (
          <Space direction='vertical' size={20} style={{ width: '100%' }}>
            <Descriptions bordered size='small' column={1}>
              <Descriptions.Item label='当前状态'>
                <Space>{statusTag(selected.status)}<Text type='secondary'>{nextStepText(selected)}</Text></Space>
              </Descriptions.Item>
              <Descriptions.Item label='报名人员'>
                {selected.candidateName || '-'} / {selected.registrationNo || `#${selected.registrationId}`}
              </Descriptions.Item>
              <Descriptions.Item label='批次'>
                {selected.batchName || '-'} / {selected.productLabel || '-'}
              </Descriptions.Item>
              <Descriptions.Item label='退款金额'>{formatPrice(selected.amountCents)}</Descriptions.Item>
              <Descriptions.Item label='退款原因'>
                {REASON_OPTIONS[vendor].find(item => item.value === selected.requestKind)?.label || selected.reasonCode}
                {selected.reasonDetail ? ` · ${selected.reasonDetail}` : ''}
              </Descriptions.Item>
              <Descriptions.Item label='申请时间'>{formatDate(selected.requestedAt)}</Descriptions.Item>
              <Descriptions.Item label='关联订单'>{selected.outTradeNo || `#${selected.orderId}`}</Descriptions.Item>
              <Descriptions.Item label='退款单号'>{selected.outRefundNo || '-'}</Descriptions.Item>
              {selected.approvedAt && (
                <Descriptions.Item label='决策时间'>{formatDate(selected.approvedAt)}</Descriptions.Item>
              )}
              {selected.processingAt && (
                <Descriptions.Item label='提交时间'>{formatDate(selected.processingAt)}</Descriptions.Item>
              )}
              {selected.succeededAt && (
                <Descriptions.Item label='成功时间'>{formatDate(selected.succeededAt)}</Descriptions.Item>
              )}
              {selected.dueAt && (
                <Descriptions.Item label='处理截止'>{formatDate(selected.dueAt)}</Descriptions.Item>
              )}
            </Descriptions>

            {(selected.lastError || selected.retryCount > 0) && (
              <Card size='small' title='恢复信息'>
                {selected.lastError && (
                  <Text type='danger' style={{ display: 'block', marginBottom: 8 }}>
                    {refundErrorText(selected.lastError)}
                  </Text>
                )}
                <Text type='secondary'>已重试 {selected.retryCount} 次</Text>
              </Card>
            )}

            <Space wrap>
              {primaryAction(selected)}
              {vendor === 'renshe' && isSuperAdmin && selected.status === 'requested' && (
                <Button danger onClick={() => setRejecting(selected)}>驳回</Button>
              )}
            </Space>
          </Space>
        )}
      </Drawer>

      <Modal
        title='驳回退款申请'
        open={Boolean(rejecting)}
        okText='确认驳回'
        okButtonProps={{ danger: true, loading: processingId === rejecting?.id }}
        onOk={() => void rejectRenshe()}
        onCancel={() => {
          setRejecting(null)
          rejectForm.resetFields()
        }}
        destroyOnClose
      >
        <Form form={rejectForm} layout='vertical'>
          <Form.Item
            name='reason'
            label='驳回原因'
            rules={[{ required: true, whitespace: true, message: '请填写驳回原因' }]}
          >
            <Input.TextArea rows={4} maxLength={2000} showCount />
          </Form.Item>
        </Form>
      </Modal>
      {reauthDialog}
    </>
  )

  return embedded ? content : <Card>{content}</Card>
}
