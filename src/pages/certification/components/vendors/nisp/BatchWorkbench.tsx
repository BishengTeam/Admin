import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ArrowLeftOutlined,
  CheckSquareOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileZipOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { ConsultationGroupDialog } from '@/components/ConsultationGroupDialog'
import { RefundWorkbench } from '@/components/RefundWorkbench'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useReauthentication } from '@/hooks/useReauthentication'
import { nispService } from '@/services/nisp'
import type {
  NispBatch,
  NispBatchFinalReviewResult,
  NispBatchFinalReviewTarget,
  NispExportItem,
  NispExportJob,
  NispExportPrecheckResponse,
  NispRegistration,
} from '@/services/nisp'
import { formatDate } from '@/utils/format'
import { registrationRefundStatus, refundRetryDescription } from '@/utils/refund'
import RegistrationReviewDrawer from './RegistrationReviewDrawer'

const { Text } = Typography

const LEVEL_LABELS: Record<string, string> = {
  '1': 'NISP一级',
  '2': 'NISP二级',
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending_payment: { text: '待支付', color: 'orange' },
  pending_review: { text: '待初审', color: 'blue' },
  rejected_awaiting_resubmission: { text: '待补正', color: 'red' },
  pending_refund_confirmation: { text: '待退款确认', color: 'volcano' },
  refund_processing: { text: '退款中', color: 'processing' },
  approved: { text: '初审通过', color: 'green' },
  final_approved: { text: '终审通过', color: 'cyan' },
  refunded_closed: { text: '已退款关闭', color: 'default' },
  cancelled: { text: '已取消', color: 'default' },
}

const JOB_STATUS_LABELS: Record<string, { text: string; color: string }> = {
  queued: { text: '排队中', color: 'orange' },
  running: { text: '生成中', color: 'processing' },
  succeeded: { text: '已完成', color: 'green' },
  failed: { text: '失败', color: 'red' },
}

interface RegistrationFilters {
  keyword: string
  status: string | undefined
  has_valid_export: boolean | undefined
}

type PrecheckScope = 'selected' | 'filter'

export function mergeSelectedRegistrations(
  previous: Record<number, NispRegistration>,
  keys: readonly React.Key[],
  rows: readonly NispRegistration[],
) {
  const keySet = new Set(keys.map(Number))
  const next: Record<number, NispRegistration> = {}
  for (const row of rows) {
    if (keySet.has(row.id)) next[row.id] = row
  }
  for (const [id, row] of Object.entries(previous)) {
    const numericId = Number(id)
    if (keySet.has(numericId) && !next[numericId]) next[numericId] = row
  }
  return next
}

function parseInitialStatus(value: string | null) {
  return value && value in STATUS_LABELS ? value : 'pending_review'
}

export default function NispBatchWorkbench() {
  const { batchId } = useParams<{ batchId: string }>()
  const parsedBatchId = Number(batchId)
  const [searchParams] = useSearchParams()
  const openRegistrationId = Number(searchParams.get('openRegistrationId'))
  const refundRegistrationId = Number(searchParams.get('refundRegistrationId'))
  const navigate = useNavigate()
  const canExport = usePermission('nisp:export')
  const canRefund = usePermission('nisp:refund')
  const [batch, setBatch] = useState<NispBatch | null>(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [filters, setFilters] = useState<RegistrationFilters>(() => ({
    keyword: '',
    status: parseInitialStatus(searchParams.get('status')),
    has_valid_export: undefined,
  }))
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<Set<number>>(new Set())
  const [selectedRegistrations, setSelectedRegistrations] = useState<Record<number, NispRegistration>>({})
  const [precheck, setPrecheck] = useState<NispExportPrecheckResponse | null>(null)
  const [precheckScope, setPrecheckScope] = useState<PrecheckScope>('selected')
  const [prechecking, setPrechecking] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reviewRegistration, setReviewRegistration] = useState<NispRegistration | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [selectedListOpen, setSelectedListOpen] = useState(false)
  const [itemJob, setItemJob] = useState<NispExportJob | null>(null)
  const [itemRows, setItemRows] = useState<NispExportItem[]>([])
  const [itemLoading, setItemLoading] = useState(false)
  const [itemPage, setItemPage] = useState(1)
  const [itemTotal, setItemTotal] = useState(0)
  const [finalOpen, setFinalOpen] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewResults, setReviewResults] = useState<NispBatchFinalReviewResult[] | null>(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'refunds' ? 'refunds' : 'people')
  const [consultationOpen, setConsultationOpen] = useState(false)
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const activeJobRef = useRef(false)

  const registrations = usePagination<NispRegistration>(
    (page) => nispService.listRegistrations({
      ...page,
      batch_id: Number.isInteger(parsedBatchId) ? parsedBatchId : undefined,
      keyword: filters.keyword || undefined,
      status: filters.status,
      has_valid_export: filters.has_valid_export,
    }),
    [parsedBatchId, filters.keyword, filters.status, filters.has_valid_export],
  )

  const exportJobs = usePagination<NispExportJob>(
    (page) => nispService.listExportJobs({
      ...page,
      batch_id: Number.isInteger(parsedBatchId) ? parsedBatchId : undefined,
    }),
    [parsedBatchId],
  )

  useEffect(() => {
    if (!Number.isInteger(parsedBatchId)) return
    nispService.getBatch(parsedBatchId).then(setBatch).catch(() => setBatch(null))
  }, [parsedBatchId])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'refunds') setActiveTab('refunds')
  }, [searchParams])

  useEffect(() => {
    if (!Number.isInteger(openRegistrationId) || openRegistrationId <= 0) return
    let cancelled = false
    nispService.getRegistration(openRegistrationId)
      .then((row) => {
        if (!cancelled) {
          setReviewRegistration(row)
          setReviewOpen(true)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [openRegistrationId])

  useEffect(() => {
    setSelectedRegistrationIds(new Set())
    setSelectedRegistrations({})
  }, [filters.keyword, filters.status, filters.has_valid_export, parsedBatchId])

  useEffect(() => {
    const rows = registrations.data?.items ?? []
    setSelectedRegistrations((previous) => {
      let changed = false
      const next = { ...previous }
      for (const row of rows) {
        if (selectedRegistrationIds.has(row.id)) {
          if (next[row.id] !== row) {
            next[row.id] = row
            changed = true
          }
        } else if (next[row.id]) {
          delete next[row.id]
          changed = true
        }
      }
      return changed ? next : previous
    })
  }, [registrations.data, selectedRegistrationIds])

  const hasActiveJob = Boolean(
    exportJobs.data?.items.some((job) => job.status === 'queued' || job.status === 'running'),
  )
  useEffect(() => {
    if (!hasActiveJob) {
      if (activeJobRef.current) {
        activeJobRef.current = false
        registrations.refresh()
      }
      return
    }
    activeJobRef.current = true
    const timer = window.setInterval(() => exportJobs.refresh(), 3000)
    return () => window.clearInterval(timer)
  }, [hasActiveJob, exportJobs, registrations])

  const loadItems = useCallback(
    async (job: NispExportJob, page = 1) => {
      setItemLoading(true)
      try {
        const result = await nispService.listExportItems(job.id, { page, page_size: 20 })
        setItemRows(result.items)
        setItemTotal(result.total)
        setItemPage(result.page)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '获取导出人员失败')
      } finally {
        setItemLoading(false)
      }
    },
    [],
  )

  const openItems = async (job: NispExportJob) => {
    setItemJob(job)
    await loadItems(job)
  }

  const requestPrecheck = useCallback(
    async (scope: PrecheckScope, registrationIds?: number[]) => {
      if (!Number.isInteger(parsedBatchId)) return null
      const selectedIds = registrationIds ?? [...selectedRegistrationIds]
      if (scope === 'selected' && selectedIds.length === 0) {
        message.warning('请先选择报名人员')
        return null
      }
      setPrechecking(true)
      try {
        const result = await nispService.precheckExport({
          batch_id: parsedBatchId,
          registration_ids: scope === 'selected' ? selectedIds : undefined,
          status: scope === 'selected' ? undefined : filters.status,
          keyword: scope === 'selected' ? undefined : filters.keyword || undefined,
        })
        setPrecheck(result)
        setPrecheckScope(scope)
        return result
      } catch (error) {
        message.error(error instanceof Error ? error.message : '导出预检失败')
        return null
      } finally {
        setPrechecking(false)
      }
    },
    [filters.keyword, filters.status, parsedBatchId, selectedRegistrationIds],
  )

  const selectFilteredResult = async () => {
    setPrechecking(true)
    try {
      const result = await nispService.precheckExport({
        batch_id: parsedBatchId,
        status: filters.status,
        keyword: filters.keyword || undefined,
      })
      setSelectedRegistrationIds(new Set(result.exportable_registration_ids))
      setSelectedRegistrations({})
      message.success(`已选择当前筛选结果中的 ${result.exportable_count} 名可导出人员`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '选择筛选结果失败')
    } finally {
      setPrechecking(false)
    }
  }

  const confirmExport = async () => {
    if (!precheck) return
    const ids = precheck.exportable_registration_ids
    if (!ids.length) {
      message.warning('没有可导出人员')
      return
    }
    const selectedIdSet = new Set(ids)
    const statuses = [
      ...new Set(precheck.people
        .filter((person) => selectedIdSet.has(person.registration_id))
        .map((person) => person.status)),
    ]
    setExporting(true)
    try {
      await nispService.createExport(parsedBatchId, undefined, ids, statuses)
      message.success('完整资料包任务已创建')
      setPrecheck(null)
      setSelectedRegistrationIds(new Set())
      setSelectedRegistrations({})
      setActiveTab('records')
      exportJobs.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建导出任务失败')
    } finally {
      setExporting(false)
    }
  }

  const download = async (job: NispExportJob) => {
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      const result = await nispService.getExportSignedUrl(job.id)
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取下载链接失败')
    }
  }

  const updatePeopleSelection = (keys: React.Key[], rows: NispRegistration[]) => {
    const keySet = new Set(keys.map(Number))
    setSelectedRegistrationIds(keySet)
    setSelectedRegistrations((previous) => mergeSelectedRegistrations(previous, keys, rows))
  }

  const openDetail = (row: NispRegistration) => {
    setReviewRegistration(row)
    setReviewOpen(true)
  }

  const handleReviewed = (row: NispRegistration) => {
    setSelectedRegistrations((previous) => {
      const next = { ...previous }
      if (selectedRegistrationIds.has(row.id)) next[row.id] = row
      else delete next[row.id]
      return next
    })
    registrations.refresh()
  }

  const nextPending = () => {
    const rows = registrations.data?.items ?? []
    const currentIndex = reviewRegistration ? rows.findIndex((row) => row.id === reviewRegistration.id) : -1
    const candidate = rows.slice(currentIndex + 1).find((row) => row.status === 'pending_review')
      ?? rows.find((row) => row.status === 'pending_review')
    if (!candidate) {
      message.info('当前页没有其他待初审人员')
      return
    }
    setReviewRegistration(candidate)
  }

  const selectedRows = useMemo(() => Object.values(selectedRegistrations), [selectedRegistrations])
  const selectedTargetList = useMemo(
    () => selectedRows
      .filter((row) => selectedRegistrationIds.has(row.id) && row.final_review_ready && row.final_export_item_id)
      .map((row) => ({
        registration_id: row.id,
        export_item_id: row.final_export_item_id as number,
        row,
      })),
    [selectedRegistrationIds, selectedRows],
  )

  const submitFinalReview = async () => {
    const targets: NispBatchFinalReviewTarget[] = selectedTargetList.map((
      { registration_id, export_item_id },
    ) => ({ registration_id, export_item_id }))
    if (!targets.length) return
    setReviewSubmitting(true)
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      const result = await nispService.batchFinalReviewTargets(targets, token)
      setReviewResults(result.items)
      setFinalOpen(false)
      const failedRegistrations = new Set(
        result.items.filter((item) => item.status === 'failed').map((item) => item.registration_id),
      )
      setSelectedRegistrationIds(new Set(failedRegistrations))
      setSelectedRegistrations(() => Object.fromEntries(
        selectedTargetList
          .filter((item) => failedRegistrations.has(item.registration_id))
          .map((item) => [item.registration_id, item.row]),
      ))
      registrations.refresh()
      exportJobs.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量终审失败')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const registrationColumns: ColumnsType<NispRegistration> = [
    {
      title: '姓名 / 报名编号',
      key: 'name',
      width: 210,
      fixed: 'left',
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <Button type='link' size='small' style={{ padding: 0, height: 22 }} onClick={() => openDetail(row)}>
            {String(row.candidate_snapshot?.name ?? '-')}
          </Button>
          <Text type='secondary' copyable={{ text: row.registration_no }}>{row.registration_no}</Text>
        </Space>
      ),
    },
    { title: '级别', dataIndex: 'level', width: 85, render: (value: string) => <Tag color={value === '1' ? 'blue' : 'purple'}>{LEVEL_LABELS[value]}</Tag> },
    {
      title: '学校/单位',
      key: 'school',
      width: 170,
      ellipsis: true,
      render: (_, row) => String(row.candidate_snapshot?.school ?? '-'),
    },
    {
      title: '审核状态',
      dataIndex: 'status',
      width: 110,
      render: (_, row) => {
        const item = row.active_refund
          ? registrationRefundStatus(row.status, row.active_refund)
          : STATUS_LABELS[row.status] ?? { text: row.status, color: 'default' }
        const retryDescription = refundRetryDescription(row.active_refund)
        return (
          <Space direction='vertical' size={0}>
            <Tag color={item.color}>{item.text}</Tag>
            {retryDescription && (
              <Text type='danger' style={{ fontSize: 12 }}>{retryDescription}</Text>
            )}
          </Space>
        )
      },
    },
    {
      title: '导出情况',
      dataIndex: 'latest_valid_export_finished_at',
      width: 180,
      render: (value: string | null, row) => {
        if (row.status === 'final_approved') return <Text type='secondary'>已终审</Text>
        if (!value) return <Text type='secondary'>未导出</Text>
        return (
          <Space direction='vertical' size={0}>
            <span>{formatDate(value)}</span>
            <Text type={row.final_review_ready ? 'success' : 'warning'} style={{ fontSize: 12 }}>
              {row.final_review_ready ? '可终审' : row.final_review_block_reason ?? '暂不可终审'}
            </Text>
          </Space>
        )
      },
    },
    { title: '报名时间', dataIndex: 'created_at', width: 160, render: (value: string) => formatDate(value) },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0}>
          <Button type='link' size='small' icon={<EyeOutlined />} onClick={() => openDetail(row)}>详情</Button>
          {row.status === 'pending_review' && (
            <Button type='link' size='small' onClick={() => openDetail(row)}>初审</Button>
          )}
          {row.status === 'approved' && (
            <Button type='link' size='small' onClick={() => openDetail(row)}>补正 / 终审</Button>
          )}
        </Space>
      ),
    },
  ]

  const exportColumns: ColumnsType<NispExportJob> = [
    { title: '任务', dataIndex: 'id', width: 75 },
    { title: '级别', dataIndex: 'level', width: 85, render: (value: string) => LEVEL_LABELS[value] },
    { title: '产物', dataIndex: 'artifact_type', width: 105, render: (value: string) => (value === 'full_package' ? '完整资料包' : 'Excel') },
    {
      title: '人数',
      key: 'count',
      width: 145,
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <span>{row.registration_count} 人 / 有效 {row.valid_item_count} 人</span>
          {row.file_expired && <Text type='warning'>文件已过期</Text>}
        </Space>
      ),
    },
    { title: '操作人', dataIndex: 'requested_by_admin_name', width: 105, render: (value: string | null, row) => value ?? `#${row.requested_by_admin_id}` },
    {
      title: '状态',
      dataIndex: 'status',
      width: 95,
      render: (value: string) => {
        const item = JOB_STATUS_LABELS[value] ?? { text: value, color: 'default' }
        return <Tag color={item.color}>{item.text}</Tag>
      },
    },
    { title: '完成时间', dataIndex: 'finished_at', width: 160, render: (value: string | null) => value ? formatDate(value) : '-' },
    {
      title: '操作',
      width: 245,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0} wrap>
          <Button type='link' size='small' icon={<DownloadOutlined />} disabled={!row.download_available} onClick={() => download(row)}>
            下载
          </Button>
          <Button type='link' size='small' icon={<EyeOutlined />} onClick={() => openItems(row)}>
            查看人员
          </Button>
          <Button
            type='link'
            size='small'
            icon={<SyncOutlined />}
            disabled={!row.registration_ids.length}
            onClick={() => requestPrecheck('selected', row.registration_ids)}
          >
            重新生成
          </Button>
          {row.last_error && (
            <Text type='danger' ellipsis={{ tooltip: row.last_error }} style={{ maxWidth: 180 }}>{row.last_error}</Text>
          )}
        </Space>
      ),
    },
  ]

  const itemColumns: ColumnsType<NispExportItem> = [
    { title: '报名编号', dataIndex: 'registration_no', width: 190 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '级别', dataIndex: 'level', width: 85, render: (value: string) => LEVEL_LABELS[value] },
    { title: '当前版本', dataIndex: 'version_no', width: 90, render: (value: number | null) => value ? `v${value}` : '-' },
    {
      title: '导出版本',
      key: 'valid',
      width: 170,
      render: (_, row) => row.is_valid
        ? <Tag color='green'>有效 #{row.id}</Tag>
        : <Tag color='red'>失效：{row.invalidated_reason ?? '未知原因'}</Tag>,
    },
    { title: '终审', dataIndex: 'review_ready', width: 160, render: (value: boolean, row) => value ? <Tag color='cyan'>可回人员列表终审</Tag> : row.block_reason },
  ]

  const quickStatuses = [
    { value: 'pending_review', label: '待初审' },
    { value: 'rejected_awaiting_resubmission', label: '待补正' },
    { value: 'approved', label: '初审通过' },
    { value: 'final_approved', label: '终审通过' },
    { value: 'all', label: '全部' },
  ]

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/admin/certification/nisp')
  }

  const tabItems = [
    {
      key: 'people',
      label: '报名人员',
      children: (
        <Card
          title='报名人员'
          extra={canExport ? (
            <Space wrap>
              <Button loading={prechecking} disabled={selectedRegistrationIds.size === 0} onClick={() => requestPrecheck('selected')}>
                导出所选人员
              </Button>
              <Popconfirm
                title='选择当前筛选结果中的全部可导出人员？'
                description='选择不受分页影响；更改筛选条件后会自动清空。'
                onConfirm={selectFilteredResult}
              >
                <Button icon={<CheckSquareOutlined />} loading={prechecking}>选择全部筛选结果</Button>
              </Popconfirm>
              <Button type='primary' icon={<FileZipOutlined />} loading={prechecking} onClick={() => requestPrecheck('filter')}>
                导出当前筛选结果
              </Button>
            </Space>
          ) : undefined}
        >
          <Space direction='vertical' size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Input.Search
                allowClear
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onSearch={(value) => setFilters((previous) => ({ ...previous, keyword: value.trim() }))}
                placeholder='姓名 / 报名编号'
                style={{ width: 240 }}
              />
              <Radio.Group
                optionType='button'
                buttonStyle='solid'
                value={filters.status ?? 'all'}
                onChange={(event) => setFilters((previous) => ({
                  ...previous,
                  status: event.target.value === 'all' ? undefined : event.target.value,
                }))}
                options={quickStatuses}
              />
              <Select
                allowClear
                placeholder='有效导出'
                value={filters.has_valid_export}
                onChange={(value) => setFilters((previous) => ({ ...previous, has_valid_export: value }))}
                style={{ width: 105 }}
                options={[{ value: true, label: '有' }, { value: false, label: '无' }]}
              />
              <Button icon={<ReloadOutlined />} onClick={() => registrations.refresh()}>刷新</Button>
            </Space>
            <Alert
              type='info'
              showIcon
              message={`已选 ${selectedRegistrationIds.size} 人；可终审 ${selectedTargetList.length} 人`}
              description={(
                <Space wrap>
                  {canExport && (
                    <Button size='small' disabled={selectedRegistrationIds.size === 0} onClick={() => setSelectedListOpen(true)}>
                      查看名单
                    </Button>
                  )}
                  <Button size='small' disabled={selectedRegistrationIds.size === 0} onClick={() => updatePeopleSelection([], [])}>
                    清空选择
                  </Button>
                  <Button size='small' type='primary' disabled={selectedTargetList.length === 0} onClick={() => setFinalOpen(true)}>
                    终审所选
                  </Button>
                </Space>
              )}
            />
            <Table
              rowKey='id'
              columns={registrationColumns}
              dataSource={registrations.data?.items ?? []}
              loading={registrations.loading}
              pagination={registrations.pagination}
              scroll={{ x: 950 }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='当前筛选条件下暂无报名人员' /> }}
              rowSelection={canExport ? {
                selectedRowKeys: [...selectedRegistrationIds],
                preserveSelectedRowKeys: true,
                onChange: updatePeopleSelection,
                getCheckboxProps: (row) => ({
                  disabled: row.status !== 'approved' && row.status !== 'final_approved',
                }),
              } : undefined}
            />
          </Space>
        </Card>
      ),
    },
    ...(canExport ? [{
      key: 'records',
      label: '导出记录',
      children: (
        <Card
          title='导出记录'
          extra={<Button icon={<ReloadOutlined />} onClick={() => exportJobs.refresh()}>刷新</Button>}
        >
          <Table
            rowKey='id'
            columns={exportColumns}
            dataSource={exportJobs.data?.items ?? []}
            loading={exportJobs.loading}
            pagination={exportJobs.pagination}
            scroll={{ x: 1150 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无导出记录' /> }}
          />
        </Card>
      ),
    }] : []),
    ...(canRefund ? [{
      key: 'refunds',
      label: '退款记录',
      children: (
        <RefundWorkbench
          vendor='nisp'
          batchId={parsedBatchId}
          registrationId={Number.isInteger(refundRegistrationId) ? refundRegistrationId : undefined}
          embedded
          onChanged={registrations.refresh}
        />
      ),
    }] : []),
  ]

  return (
    <PageContainer
      title={`NISP 批次工作台${batch ? ` · ${batch.plan_name}` : ''}`}
      extra={(
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={goBack}>返回批次列表</Button>
          <Button onClick={() => setConsultationOpen(true)}>咨询群</Button>
          <Button icon={<ReloadOutlined />} onClick={() => { registrations.refresh(); exportJobs.refresh() }}>刷新</Button>
        </Space>
      )}
    >
      {batch && (
        <Card size='small' style={{ marginBottom: 16 }}>
          <Space wrap size={24}>
            <span><Text type='secondary'>级别：</Text>{LEVEL_LABELS[batch.level]}</span>
            <span><Text type='secondary'>考试时间：</Text>{batch.exam_date ? formatDate(batch.exam_date) : '-'}</span>
            <span><Text type='secondary'>批次状态：</Text>{batch.plan_status}</span>
            <span><Text type='secondary'>名额：</Text>{batch.occupied_count}/{batch.capacity}</span>
          </Space>
        </Card>
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <RegistrationReviewDrawer
        registration={reviewRegistration}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onReviewed={handleReviewed}
        onNextPending={nextPending}
      />

      <Modal
        open={!!precheck}
        title='NISP 完整资料包导出预检'
        width={760}
        onCancel={() => setPrecheck(null)}
        confirmLoading={exporting}
        okText={precheck?.blocked_count ? `仅导出符合条件的 ${precheck.exportable_count} 人` : `确认导出 ${precheck?.exportable_count ?? 0} 人`}
        okButtonProps={{ disabled: !precheck?.exportable_count }}
        onOk={confirmExport}
      >
        {precheck && (
          <>
            <Alert
              style={{ marginBottom: 12 }}
              type={precheck.blocked_count ? 'warning' : 'success'}
              showIcon
              message={`${precheckScope === 'selected' ? '所选人员' : '当前筛选结果'}：可导出 ${precheck.exportable_count} 人，暂不可导出 ${precheck.blocked_count} 人`}
              description={`级别：${LEVEL_LABELS[precheck.level]}`}
            />
            <Table
              rowKey='registration_id'
              size='small'
              columns={[
                { title: '报名编号', dataIndex: 'registration_no' },
                { title: '姓名', dataIndex: 'name' },
                { title: '级别', dataIndex: 'level', render: (value: string) => LEVEL_LABELS[value] },
                { title: '结果', dataIndex: 'exportable', render: (value: boolean, row) => value ? <Tag color='green'>可导出</Tag> : <Tag color='red'>{row.reason}</Tag> },
              ]}
              dataSource={precheck.people}
              pagination={{ pageSize: 5 }}
            />
          </>
        )}
      </Modal>

      <Modal
        open={selectedListOpen}
        title={`已选人员（${selectedRows.length} / ${selectedRegistrationIds.size}）`}
        width={680}
        footer={<Button type='primary' onClick={() => setSelectedListOpen(false)}>知道了</Button>}
        onCancel={() => setSelectedListOpen(false)}
      >
        <Space direction='vertical' style={{ width: '100%' }}>
          {selectedRows.length < selectedRegistrationIds.size && (
            <Alert type='info' showIcon message={`另有 ${selectedRegistrationIds.size - selectedRows.length} 名跨页选择人员，导出预检会展示完整名单。`} />
          )}
          <Table
            rowKey='id'
            size='small'
            columns={[
              { title: '姓名', render: (_, row) => String(row.candidate_snapshot?.name ?? '-') },
              { title: '报名编号', dataIndex: 'registration_no' },
              { title: '状态', dataIndex: 'status', render: (value: string) => STATUS_LABELS[value]?.text ?? value },
            ]}
            dataSource={selectedRows}
            pagination={{ pageSize: 8 }}
          />
        </Space>
      </Modal>

      <Drawer
        open={!!itemJob}
        width={760}
        title={`导出任务 ${itemJob?.id ?? ''} 人员`}
        onClose={() => setItemJob(null)}
        footer={<Button onClick={() => setItemJob(null)}>关闭</Button>}
      >
        <Table
          rowKey='registration_id'
          columns={itemColumns}
          dataSource={itemRows}
          loading={itemLoading}
          pagination={{
            current: itemPage,
            total: itemTotal,
            pageSize: 20,
            onChange: (page) => itemJob && loadItems(itemJob, page),
          }}
        />
      </Drawer>

      <Modal
        open={finalOpen}
        title='确认批量终审'
        confirmLoading={reviewSubmitting}
        okText='二次认证并提交'
        onOk={submitFinalReview}
        onCancel={() => setFinalOpen(false)}
      >
        <Space direction='vertical' style={{ width: '100%' }}>
          <Alert
            type='warning'
            showIcon
            message={`将对 ${selectedTargetList.length} 名报名人员执行终审通过`}
            description="请确认已核对对应导出资料。"
          />
          <Text type='secondary'>提交时后端会逐人重新校验状态和导出版本；部分失败不会影响其他人。</Text>
        </Space>
      </Modal>

      <Modal
        open={!!reviewResults}
        title='批量终审结果'
        width={760}
        footer={<Button type='primary' onClick={() => setReviewResults(null)}>知道了</Button>}
        onCancel={() => setReviewResults(null)}
      >
        {reviewResults && (
          <Table
            rowKey='registration_id'
            size='small'
            columns={[
              { title: '报名编号', dataIndex: 'registration_no' },
              { title: '姓名', dataIndex: 'name' },
              { title: '结果', dataIndex: 'status', render: (value: NispBatchFinalReviewResult['status']) => value === 'success' ? <Tag color='green'>成功</Tag> : value === 'skipped' ? <Tag color='orange'>跳过</Tag> : <Tag color='red'>失败</Tag> },
              { title: '原因', dataIndex: 'reason', render: (value: string | null) => value ?? '-' },
            ]}
            dataSource={reviewResults}
            pagination={false}
          />
        )}
      </Modal>
      <ConsultationGroupDialog
        open={consultationOpen && Boolean(batch)}
        planId={batch?.plan_id ?? null}
        batchName={batch?.plan_name ?? ''}
        onClose={() => setConsultationOpen(false)}
      />
      {reauthDialog}
    </PageContainer>
  )
}
