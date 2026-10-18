import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Descriptions,
  DatePicker,
  Drawer,
  Form,
  Input,
  Modal,
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
import { ArrowLeftOutlined, DownloadOutlined, EyeOutlined, ReloadOutlined, RetweetOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { ConsultationGroupDialog } from '@/components/ConsultationGroupDialog'
import { RefundWorkbench } from '@/components/RefundWorkbench'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { rensheService } from '@/services/renshe'
import type {
  CertificationPlan,
} from '@/types/certification'
import type {
  RensheApplicationListItem,
  RensheApplicationStatus,
  RensheBatchExternalReviewResult,
  RensheExportItem,
  RensheExportJob,
  RensheReviewDecision,
} from '@/types/renshe'
import { formatDate, formatPrice } from '@/utils/format'
import { RENSHE_APPLICATION_STATUS_MAP } from '@/utils/renshe'
import ApplicationDetailDrawer from './ApplicationDetailDrawer'
import dayjs, { type Dayjs } from 'dayjs'
import { RENSHE_GRADUATED_CHANGE_OPTIONS } from '@/utils/renshe'

const STATUS_OPTIONS = Object.entries(RENSHE_APPLICATION_STATUS_MAP).map(([value, item]) => ({
  value,
  label: item.text,
}))

const JOB_STATUS: Record<string, { text: string; color: string }> = {
  queued: { text: '排队中', color: 'orange' },
  running: { text: '生成中', color: 'processing' },
  succeeded: { text: '已完成', color: 'green' },
  failed: { text: '失败', color: 'red' },
}

interface PeopleFilters {
  keyword: string
  status: RensheApplicationStatus | undefined
}

interface ReturnFormValues {
  reason: string
  required_changes: string[]
  correction_due_at?: Dayjs
}

interface ExternalFormValues {
  decision: RensheReviewDecision
  reason?: string
  required_changes?: string[]
  correction_due_at?: Dayjs
}

function mergeSelectedApplications(
  previous: Record<number, RensheApplicationListItem>,
  keys: readonly React.Key[],
  rows: readonly RensheApplicationListItem[],
) {
  const keySet = new Set(keys.map(Number))
  const next: Record<number, RensheApplicationListItem> = {}
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
  return value && value in RENSHE_APPLICATION_STATUS_MAP
    ? value as RensheApplicationStatus
    : undefined
}

function formatDateOrNull(value: string | null) {
  return value ? formatDate(value) : '-'
}

export default function RensheBatchWorkbench() {
  const { batchId } = useParams<{ batchId: string }>()
  const planId = Number(batchId)
  const [searchParams] = useSearchParams()
  const openApplicationId = Number(searchParams.get('openRegistrationId'))
  const refundApplicationId = Number(searchParams.get('refundRegistrationId'))
  const navigate = useNavigate()
  const canWrite = usePermission('renshe:review')
  const canExport = usePermission('renshe:export')
  const canRefund = usePermission('order:list')
  const [plan, setPlan] = useState<CertificationPlan | null>(null)
  const graduated = plan?.renshe_config?.qualification_rule === 'related_major_graduated_degree_v1'
  const [filters, setFilters] = useState<PeopleFilters>(() => ({
    keyword: '',
    status: parseInitialStatus(searchParams.get('status')),
  }))
  const [keywordInput, setKeywordInput] = useState('')
  const [selectedApplications, setSelectedApplications] = useState<
    Record<number, RensheApplicationListItem>
  >({})
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [returnApplication, setReturnApplication] = useState<RensheApplicationListItem | null>(null)
  const [returnForm] = Form.useForm<ReturnFormValues>()
  const [returning, setReturning] = useState(false)
  const [externalOpen, setExternalOpen] = useState(false)
  const [externalForm] = Form.useForm<ExternalFormValues>()
  const [externalSubmitting, setExternalSubmitting] = useState(false)
  const [externalResults, setExternalResults] = useState<RensheBatchExternalReviewResult[] | null>(null)
  const [exporting, setExporting] = useState(false)
  const [selectedListOpen, setSelectedListOpen] = useState(false)
  const [itemJob, setItemJob] = useState<RensheExportJob | null>(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'refunds' ? 'refunds' : 'people')
  const [consultationOpen, setConsultationOpen] = useState(false)

  const loadPlan = useCallback(async () => {
    if (!Number.isInteger(planId) || planId <= 0) return
    const plans = await rensheService.listBatches()
    setPlan(plans.find(item => item.id === planId) ?? null)
  }, [planId])

  useEffect(() => { void loadPlan() }, [loadPlan])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'refunds') setActiveTab('refunds')
  }, [searchParams])

  useEffect(() => {
    if (!Number.isInteger(openApplicationId) || openApplicationId <= 0) return
    setDrawerId(openApplicationId)
    setDrawerOpen(true)
  }, [openApplicationId])

  const applications = usePagination<RensheApplicationListItem>(
    page => rensheService.listApplications({
      ...page,
      plan_id: planId,
      keyword: filters.keyword || undefined,
      status: filters.status,
    }),
    [planId, filters.keyword, filters.status],
  )

  const loadJobs = useCallback(async () => {
    if (!Number.isInteger(planId) || planId <= 0) return []
    return rensheService.listExportJobs(planId)
  }, [planId])
  const [jobs, setJobs] = useState<RensheExportJob[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const refreshJobs = useCallback(async () => {
    setJobsLoading(true)
    try {
      setJobs(await loadJobs())
    } finally {
      setJobsLoading(false)
    }
  }, [loadJobs])

  useEffect(() => { void refreshJobs() }, [refreshJobs])

  const selectedList = useMemo(
    () => Object.values(selectedApplications),
    [selectedApplications],
  )

  const openApplication = (id: number) => {
    setDrawerId(id)
    setDrawerOpen(true)
  }

  const submitReturn = async () => {
    if (!returnApplication) return
    const values = await returnForm.validateFields()
    setReturning(true)
    try {
      await rensheService.returnForCorrection(returnApplication.id, {
        decision: 'rejected',
        expected_version_id: returnApplication.current_version_id || undefined,
        reason: values.reason,
        required_changes: values.required_changes,
        correction_due_at: values.correction_due_at?.toISOString(),
      })
      message.success('已打回补正')
      setReturnApplication(null)
      applications.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '打回补正失败')
    } finally {
      setReturning(false)
    }
  }

  const collectFilteredApplications = async () => {
    const items: RensheApplicationListItem[] = []
    let page = 1
    for (;;) {
      const result = await rensheService.listApplications({
        page,
        page_size: 100,
        plan_id: planId,
        keyword: filters.keyword || undefined,
        status: filters.status,
      })
      items.push(...result.items)
      if (items.length >= result.total || result.items.length === 0) break
      page += 1
    }
    return items
  }

  const exportApplications = async (scope: 'selected' | 'filter') => {
    const ids = scope === 'selected'
      ? selectedList.map(item => item.id)
      : (await collectFilteredApplications()).map(item => item.id)
    if (!ids.length) {
      message.warning('没有可导出的报名人员')
      return
    }
    setExporting(true)
    try {
      await rensheService.createExportJob(planId, ids)
      message.success('导出任务已创建')
      await refreshJobs()
      setActiveTab('exports')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建导出任务失败')
    } finally {
      setExporting(false)
    }
  }

  const submitExternalReview = async () => {
    const values = await externalForm.validateFields()
    setExternalSubmitting(true)
    try {
      const result = await rensheService.batchExternalReview({
        targets: selectedList.map(item => ({ application_id: item.id, version_id: item.current_version_id || undefined })),
        decision: values.decision,
        reason: values.reason,
        required_changes: values.required_changes,
        correction_due_at: values.correction_due_at?.toISOString(),
      })
      setExternalResults(result.items)
      setExternalOpen(false)
      applications.refresh()
      await refreshJobs()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量登记外审失败')
    } finally {
      setExternalSubmitting(false)
    }
  }

  const peopleColumns: ColumnsType<RensheApplicationListItem> = [
    { title: '报名 ID', dataIndex: 'id', width: 85, render: id => `#${id}` },
    {
      title: '考生',
      width: 170,
      render: (_, row) => (
        <Button type='link' size='small' style={{ padding: 0 }} onClick={() => openApplication(row.id)}>
          {row.candidate_name || `用户 #${row.user_id}`}
        </Button>
      ),
    },
    { title: '身份证号', dataIndex: 'id_card_masked', width: 160, render: value => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 145,
      render: (status: RensheApplicationStatus) => {
        const config = RENSHE_APPLICATION_STATUS_MAP[status]
        return <Tag color={config?.color}>{config?.text ?? status}</Tag>
      },
    },
    { title: '支付', dataIndex: 'payment_status', width: 90, render: value => value || '-' },
    {
      title: '当前版本导出',
      dataIndex: 'current_version_exported',
      width: 125,
      render: (value: boolean, row) => value ? (
        <Tag color='green'>G{row.latest_export_generation_no}</Tag>
      ) : (
        <Tag color='default'>未导出</Tag>
      ),
    },
    { title: '提交时间', dataIndex: 'submitted_at', width: 165, render: value => value ? formatDate(value) : '-' },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' onClick={() => openApplication(row.id)}>审核 / 详情</Button>
          {canWrite && row.status === 'pending_external_review' && (
            <Button size='small' danger onClick={() => {
              setReturnApplication(row)
              returnForm.resetFields()
            }}>
              打回补正
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const jobColumns: ColumnsType<RensheExportJob> = [
    { title: '任务', dataIndex: 'id', width: 80, render: id => `#${id}` },
    { title: '代次', dataIndex: 'generation_no', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 95,
      render: status => {
        const config = JOB_STATUS[status]
        return <Tag color={config?.color}>{config?.text ?? status}</Tag>
      },
    },
    { title: '人数', dataIndex: 'candidate_total', width: 80 },
    { title: '分卷', dataIndex: 'volume_count', width: 70 },
    { title: '完成时间', dataIndex: 'finished_at', width: 165, render: value => value ? formatDate(value) : '-' },
    { title: '失败原因', dataIndex: 'last_error', ellipsis: true, render: value => value || '-' },
    {
      title: '操作',
      width: 190,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' icon={<EyeOutlined />} onClick={() => setItemJob(row)}>查看人员</Button>
          {row.status === 'failed' && canExport && (
            <Button
              size='small'
              icon={<RetweetOutlined />}
              onClick={async () => {
                try {
                  await rensheService.retryExportJob(row.id)
                  message.success('导出任务已重新排队')
                  await refreshJobs()
                } catch (error) {
                  message.error(error instanceof Error ? error.message : '重试失败')
                }
              }}
            >
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const itemColumns: ColumnsType<RensheExportItem> = [
    { title: '报名 ID', dataIndex: 'application_id', width: 85 },
    { title: '版本 ID', dataIndex: 'version_id', width: 95 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: status => {
        const config = JOB_STATUS[status]
        return <Tag color={config?.color}>{config?.text ?? status}</Tag>
      },
    },
    { title: '失败原因', dataIndex: 'last_error', ellipsis: true, render: value => value || '-' },
  ]

  return (
    <PageContainer
      title={`人社批次工作台 · ${plan?.name ?? `#${planId}`}`}
      extra={(
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => {
            void applications.refresh()
            void refreshJobs()
            void loadPlan()
          }}>刷新</Button>
          <Button onClick={() => setConsultationOpen(true)}>咨询群</Button>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/certification/renshe')}>返回批次</Button>
        </Space>
      )}
    >
      {plan && (
        <Descriptions bordered size='small' column={4} style={{ marginBottom: 16 }}>
          <Descriptions.Item label='批次'>{plan.name}</Descriptions.Item>
          <Descriptions.Item label='状态'>{plan.status}</Descriptions.Item>
          <Descriptions.Item label='报名费'>{formatPrice(plan.price_cents)}</Descriptions.Item>
          <Descriptions.Item label='名额'>{plan.enrolled}/{plan.capacity || '不限'}</Descriptions.Item>
          <Descriptions.Item label='报考项目'>{plan.project_name || '待核实'}</Descriptions.Item>
          <Descriptions.Item label='职业／工种'>{plan.occupation_name || '待核实'}</Descriptions.Item>
          <Descriptions.Item label='技能等级'>{plan.skill_level || '待核实'}</Descriptions.Item>
          <Descriptions.Item label='考试类型'>{plan.exam_type || '待核实'}</Descriptions.Item>
          <Descriptions.Item label='申报类型'>{plan.application_type || '待核实'}</Descriptions.Item>
          <Descriptions.Item label='报名时间' span={2}>
            {formatDateOrNull(plan.apply_start)} ~ {formatDateOrNull(plan.apply_end)}
          </Descriptions.Item>
          <Descriptions.Item label='考试时间'>{formatDateOrNull(plan.exam_date)}</Descriptions.Item>
          <Descriptions.Item label='考试地点'>{plan.exam_location || '-'}</Descriptions.Item>
        </Descriptions>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'people', label: '报名人员', children: (
            <>
              <Space style={{ marginBottom: 16 }} wrap>
                <Input.Search
                  allowClear
                  placeholder='姓名 / 身份证 / 手机号'
                  value={keywordInput}
                  onChange={event => setKeywordInput(event.target.value)}
                  onSearch={value => setFilters({ ...filters, keyword: value.trim() })}
                  style={{ width: 280 }}
                />
                <Select
                  allowClear
                  placeholder='状态'
                  value={filters.status}
                  onChange={status => setFilters({ ...filters, status })}
                  options={STATUS_OPTIONS}
                  style={{ width: 170 }}
                />
                {(canWrite || canExport) && (
                  <>
                    <Button
                      type='primary'
                      loading={exporting}
                      disabled={!canExport || selectedList.length === 0}
                      onClick={() => void exportApplications('selected')}
                    >
                      导出所选（{selectedList.length}）
                    </Button>
                    <Button disabled={!canExport} loading={exporting} onClick={() => void exportApplications('filter')}>
                      导出当前筛选
                    </Button>
                    <Button
                      type='primary'
                      ghost
                      disabled={!canWrite || selectedList.length === 0}
                      onClick={() => {
                        externalForm.setFieldsValue({ decision: 'approved' })
                        setExternalOpen(true)
                      }}
                    >
                      登记外审结果（{selectedList.length}）
                    </Button>
                    <Button disabled={selectedList.length === 0} onClick={() => setSelectedListOpen(true)}>
                      查看已选
                    </Button>
                    <Button
                      disabled={selectedList.length === 0}
                      onClick={() => setSelectedApplications({})}
                    >
                      清空选择
                    </Button>
                  </>
                )}
              </Space>
              {selectedList.some(item => !item.current_version_exported) && (
                <Alert
                  type='warning'
                  showIcon
                  style={{ marginBottom: 16 }}
                  message='已选人员中存在当前版本未成功导出的报名。登记“外审通过”时会逐人阻断，需先导出当前版本。'
                />
              )}
              <Table
                rowKey='id'
                columns={peopleColumns}
                dataSource={applications.data?.items ?? []}
                loading={applications.loading}
                pagination={applications.pagination}
                rowSelection={{
                  selectedRowKeys: selectedList.map(item => item.id),
                  onChange: (keys, rows) => setSelectedApplications(
                    mergeSelectedApplications(selectedApplications, keys, rows),
                  ),
                }}
                scroll={{ x: 1220 }}
              />
            </>
          ) },
          { key: 'exports', label: '导出记录', children: (
            <Table
              rowKey='id'
              columns={jobColumns}
              dataSource={jobs}
              loading={jobsLoading}
              pagination={false}
              scroll={{ x: 1150 }}
            />
          ) },
          ...(canRefund ? [{
            key: 'refunds',
            label: '退款记录',
            children: (
              <RefundWorkbench
                vendor='renshe'
                batchId={planId}
                registrationId={Number.isInteger(refundApplicationId) ? refundApplicationId : undefined}
                embedded
                onChanged={applications.refresh}
              />
            ),
          }] : []),
        ]}
      />

      <ApplicationDetailDrawer
        applicationId={drawerId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onChanged={applications.refresh}
      />

      <Modal
        title={`打回补正 · ${returnApplication?.candidate_name || ''}`}
        open={Boolean(returnApplication)}
        confirmLoading={returning}
        okText='确认打回'
        onOk={() => void submitReturn()}
        onCancel={() => setReturnApplication(null)}
        destroyOnClose
      >
        <Form form={returnForm} layout='vertical'>
          <Form.Item name='reason' label='退回原因' rules={[{ required: true, whitespace: true, message: '请填写原因' }]}>
            <Input.TextArea rows={4} maxLength={2000} showCount />
          </Form.Item>
          <Form.Item name='required_changes' label='待修改项' rules={[{ required: true, message: '请填写待修改项' }]}>
            <Select mode={graduated ? 'multiple' : 'tags'} options={graduated ? RENSHE_GRADUATED_CHANGE_OPTIONS : undefined} placeholder='选择需要补正的字段或材料' />
          </Form.Item>
          {graduated && <Form.Item name='correction_due_at' label='补正截止时间' rules={[{ required: true }, { validator: (_, value?: Dayjs) => value?.isAfter(dayjs()) ? Promise.resolve() : Promise.reject(new Error('截止时间必须晚于现在')) }]}><DatePicker showTime /></Form.Item>}
        </Form>
      </Modal>

      <Modal
        title={`批量登记外审结果（${selectedList.length} 人）`}
        open={externalOpen}
        confirmLoading={externalSubmitting}
        okText='确认登记'
        onOk={() => void submitExternalReview()}
        onCancel={() => setExternalOpen(false)}
        destroyOnClose
      >
        <Form form={externalForm} layout='vertical'>
          <Form.Item name='decision' label='外审结果' rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value='approved'>外审通过</Radio.Button>
              <Radio.Button value='rejected'>外审退回</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const decision = getFieldValue('decision') as RensheReviewDecision
              return decision === 'rejected' ? (
                <>
                  <Form.Item name='reason' label='退回原因' rules={[{ required: true, whitespace: true }]}>
                    <Input.TextArea rows={3} maxLength={2000} showCount />
                  </Form.Item>
                  <Form.Item name='required_changes' label='待修改项' rules={[{ required: true }]}>
                    <Select mode={graduated ? 'multiple' : 'tags'} options={graduated ? RENSHE_GRADUATED_CHANGE_OPTIONS : undefined} />
                  </Form.Item>
                  {graduated && <Form.Item name='correction_due_at' label='补正截止时间' rules={[{ required: true }, { validator: (_, value?: Dayjs) => value?.isAfter(dayjs()) ? Promise.resolve() : Promise.reject(new Error('截止时间必须晚于现在')) }]}><DatePicker showTime /></Form.Item>}
                </>
              ) : (
                null
              )
            }}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`批量外审结果（${externalResults?.length ?? 0} 人）`}
        open={Boolean(externalResults)}
        footer={<Button type='primary' onClick={() => setExternalResults(null)}>知道了</Button>}
        onCancel={() => setExternalResults(null)}
        width={720}
      >
        <Table
          rowKey='application_id'
          size='small'
          pagination={false}
          dataSource={externalResults ?? []}
          columns={[
            { title: '报名 ID', dataIndex: 'application_id' },
            {
              title: '结果',
              dataIndex: 'status',
              render: value => value === 'success'
                ? <Tag color='green'>成功</Tag>
                : <Tag color='red'>失败</Tag>,
            },
            { title: '原因', dataIndex: 'reason', render: value => value || '-' },
          ]}
        />
      </Modal>

      <Modal
        title={`已选人员（${selectedList.length}）`}
        open={selectedListOpen}
        footer={<Button type='primary' onClick={() => setSelectedListOpen(false)}>知道了</Button>}
        onCancel={() => setSelectedListOpen(false)}
      >
        <Table
          rowKey='id'
          size='small'
          pagination={{ pageSize: 8 }}
          dataSource={selectedList}
          columns={[
            { title: '考生', render: row => row.candidate_name || `#${row.id}` },
            { title: '状态', dataIndex: 'status', render: value => RENSHE_APPLICATION_STATUS_MAP[value]?.text ?? value },
            {
              title: '导出',
              dataIndex: 'current_version_exported',
              render: value => value ? <Tag color='green'>已导出</Tag> : <Tag>未导出</Tag>,
            },
          ]}
        />
      </Modal>

      <Drawer
        title={`导出任务 ${itemJob?.id ?? ''} 人员`}
        width={720}
        open={Boolean(itemJob)}
        onClose={() => setItemJob(null)}
      >
        <Space direction='vertical' style={{ width: '100%' }} size={16}>
          {itemJob?.volumes.map(volume => (
            <Button
              key={volume.id}
              block
              icon={<DownloadOutlined />}
              disabled={!volume.download_available}
              onClick={async () => {
                try {
                  const signed = await rensheService.getExportVolumeSignedUrl(volume.id)
                  window.open(signed.url, '_blank', 'noopener')
                } catch (error) {
                  message.error(error instanceof Error ? error.message : '获取下载链接失败')
                }
              }}
            >
              分卷 {volume.volume_no} · {volume.candidate_count} 人
            </Button>
          ))}
          <Table
            rowKey='id'
            size='small'
            columns={itemColumns}
            dataSource={itemJob?.items ?? []}
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Drawer>
      <ConsultationGroupDialog
        open={consultationOpen && Boolean(plan)}
        planId={plan?.id ?? null}
        batchName={plan?.name ?? ''}
        onClose={() => setConsultationOpen(false)}
      />
    </PageContainer>
  )
}
