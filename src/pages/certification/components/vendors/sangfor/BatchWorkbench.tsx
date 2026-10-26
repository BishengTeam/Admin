import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Collapse, DatePicker, Descriptions, Drawer, Empty, Form, Input, Modal, Radio, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { StatusTag } from '@/components/StatusTag'
import { usePermission } from '@/hooks/usePermission'
import { useReauthentication } from '@/hooks/useReauthentication'
import { isApiError } from '@/core/request'
import { sangforService, SANGFOR_STATUS, type SangforBatch, type SangforExportRecord, type SangforRegistration } from '@/services/sangfor'
import { downloadBlob } from '@/utils/download'
import { formatDate, formatPrice } from '@/utils/format'
import RegistrationProcessingDrawer from '../../shared/RegistrationProcessingDrawer'
import { PaymentStatusTag, PAYMENT_FILTER_OPTIONS } from '../../shared/RegistrationPayment'
import { BATCH_STATUS, REGISTRATION_STATUS, exportable } from './presentation'

const { Text } = Typography
const FIELD_LABELS: Record<string, string> = { name: '考生姓名', id_card: '身份证号码', phone: '手机号', organization: '所属机构', first_name: '名字拼音（firstName）',
  last_name: '姓氏拼音（lastName）', email: '邮箱地址', mailing_address: '邮寄地址', remark1: '备注1', remark2: '备注2' }
const ACTIONS: Record<string, string> = { approve: '初审通过', return: '打回补正', final_approve: '外审通过', final_return: '外审退回' }

export default function SangforBatchWorkbench() {
  const batchId = Number(useParams().batchId)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const canReview = usePermission('sangfor:review'), canExport = usePermission('sangfor:export'), canRefund = usePermission('order:write')
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const [batch, setBatch] = useState<SangforBatch | null>(null)
  const [rows, setRows] = useState<SangforRegistration[]>([]), [total, setTotal] = useState(0)
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20)
  const routeStatus = searchParams.get('status') || ''
  const [state, setState] = useState<string | undefined>(routeStatus in SANGFOR_STATUS ? routeStatus : undefined)
  const [paymentState, setPaymentState] = useState<string>(), [keyword, setKeyword] = useState(''), [keywordInput, setKeywordInput] = useState('')
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [selected, setSelected] = useState<Map<number, SangforRegistration>>(new Map())
  const [selectionMode, setSelectionMode] = useState<'view' | 'export' | null>(null)
  const [current, setCurrent] = useState<SangforRegistration | null>(null)
  const [action, setAction] = useState<string | null>(null), [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false), [exporting, setExporting] = useState(false)
  const [exportRows, setExportRows] = useState<SangforExportRecord[]>([]), [recordsLoading, setRecordsLoading] = useState(false), [recordsError, setRecordsError] = useState('')
  const [peopleRecord, setPeopleRecord] = useState<SangforExportRecord | null>(null)
  const [refundRows, setRefundRows] = useState<SangforRegistration[]>([]), [refundTotal, setRefundTotal] = useState(0), [refundPage, setRefundPage] = useState(1)
  const [refundState, setRefundState] = useState<string>(), [refundLoading, setRefundLoading] = useState(false), [refundError, setRefundError] = useState('')
  const [form] = Form.useForm()
  const detailGeneration = useRef(0), listGeneration = useRef(0), recordGeneration = useRef(0), refundGeneration = useRef(0)
  const exportLock = useRef(false)
  const tab = searchParams.get('tab')
  const activeTab = tab === 'refunds' || (tab === 'records' && canExport) ? tab : 'people'
  const setTab = (value: string) => setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('tab', value); return next })
  const load = useCallback(async () => {
    const generation = ++listGeneration.current
    setLoading(true); setError('')
    try {
      const [info, result] = await Promise.all([sangforService.batch(batchId), sangforService.registrations({ batch_id: batchId, page, page_size: pageSize, state, payment_state: paymentState, keyword: keyword || undefined })])
      if (generation !== listGeneration.current) return
      setBatch(info); setRows(result.items); setTotal(result.total)
      setSelected(previous => {
        const next = new Map(previous)
        result.items.forEach(item => { if (next.has(item.id)) { if (exportable(item)) next.set(item.id, item); else next.delete(item.id) } })
        return next
      })
    } catch (reason) { if (generation === listGeneration.current) { setError(reason instanceof Error ? reason.message : '加载失败，请重试'); setRows([]) } }
    finally { if (generation === listGeneration.current) setLoading(false) }
  }, [batchId, page, pageSize, state, paymentState, keyword])
  useEffect(() => { void load(); return () => { listGeneration.current++ } }, [load])
  useEffect(() => { setSelected(new Map()); setSelectionMode(null) }, [batchId, state, paymentState, keyword])
  const loadRecords = useCallback(async () => {
    if (!canExport) return
    const seq = ++recordGeneration.current
    setRecordsLoading(true); setRecordsError('')
    try { const result = await sangforService.exports(batchId); if (seq === recordGeneration.current) setExportRows(result) }
    catch (reason) { if (seq === recordGeneration.current) setRecordsError(reason instanceof Error ? reason.message : '导出记录加载失败，请重试') }
    finally { if (seq === recordGeneration.current) setRecordsLoading(false) }
  }, [batchId, canExport])
  useEffect(() => { if (activeTab === 'records') void loadRecords(); return () => { recordGeneration.current++ } }, [activeTab, loadRecords])
  const loadRefunds = useCallback(async () => {
    const seq = ++refundGeneration.current
    setRefundLoading(true); setRefundError('')
    try {
      const result = await sangforService.registrations({ batch_id: batchId, refund_only: true, state: refundState, page: refundPage, page_size: 20 })
      if (seq === refundGeneration.current) { setRefundRows(result.items); setRefundTotal(result.total) }
    } catch (reason) { if (seq === refundGeneration.current) setRefundError(reason instanceof Error ? reason.message : '退款记录加载失败，请重试') }
    finally { if (seq === refundGeneration.current) setRefundLoading(false) }
  }, [batchId, refundPage, refundState])
  useEffect(() => { if (activeTab === 'refunds') void loadRefunds(); return () => { refundGeneration.current++ } }, [activeTab, loadRefunds])
  const open = async (id: number) => {
    const generation = ++detailGeneration.current
    setDetailLoading(true)
    try { const item = await sangforService.registration(id); if (item.batch_id !== batchId) throw new Error('报名不属于当前批次'); if (generation === detailGeneration.current) setCurrent(item) }
    catch (reason) { message.error(reason instanceof Error ? reason.message : '报名加载失败'); throw reason }
    finally { if (generation === detailGeneration.current) setDetailLoading(false) }
  }
  useEffect(() => {
    const id = Number(searchParams.get('openRegistrationId'))
    if (!Number.isSafeInteger(id) || id <= 0) return
    void open(id).catch(() => {})
    setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('openRegistrationId'); return next }, { replace: true })
  }, [batchId, searchParams, setSearchParams])
  const review = async () => {
    try {
      const values = await form.validateFields()
      if (!current || !action) return
      setSaving(true)
      const item = await sangforService.review(current.id, { action, expected_revision: current.revision, reason: values.reason || '', correction_due_at: values.due?.toISOString() || null })
      setCurrent(item); setAction(null); message.success('审核结果已保存'); await load()
    } catch (reason) { if (!(reason as { errorFields?: unknown }).errorFields) message.error(reason instanceof Error ? reason.message : '保存失败') }
    finally { setSaving(false) }
  }
  const selectedRows = [...selected.values()]
  const exportSelected = async () => {
    if (exportLock.current || !selectedRows.length) return
    exportLock.current = true; setExporting(true)
    try {
      const token = await ensureReauthenticated()
      if (!token) return
      const versions = Object.fromEntries(selectedRows.map(row => [row.id, row.current_version]))
      downloadBlob(await sangforService.export(batchId, selectedRows.map(row => row.id), token, versions), `深信服报名信息_批次${batchId}.xlsx`)
      message.success('报名信息表已生成'); setSelectionMode(null); setSelected(new Map())
      await load(); await loadRecords()
      if (current) await open(current.id)
    } catch (reason) {
      message.error(isApiError(reason) && reason.status === 409 ? '报名状态或资料版本已变化，请刷新后重新选择' : reason instanceof Error ? reason.message : '导出失败，请重试')
    } finally { exportLock.current = false; setExporting(false) }
  }
  const startReview = (value: string) => { form.resetFields(); setAction(value) }
  const correction = action === 'return' || action === 'final_return'
  const snapshot = current?.candidate_snapshot || {}
  const openOrder = (row: SangforRegistration) => navigate('/admin/orders', { state: { orderId: row.order_id } })
  const clearFilters = () => { setState(undefined); setPaymentState(undefined); setKeyword(''); setKeywordInput(''); setPage(1) }
  const formatVersion = (row: SangforRegistration) => `第${row.current_version}版`
  const hasExport = (row: SangforRegistration) => row.exports.some(item => item.version === row.current_version)
  const counts = batch?.registration_counts
  const quickStatuses = [{ value: 'all', label: '全部' }, ...[['pending_review', '待初审'], ['returned', '待补正'], ['approved', '初审通过']].map(([value, label]) => ({ value, label: `${label} ${counts ? counts[value] || 0 : '-'}` }))]
  const peopleTable = <Table<SangforRegistration> rowKey='id' loading={loading} dataSource={rows} scroll={{ x: 1150 }}
    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='当前筛选条件下暂无报名人员' /> }}
    rowSelection={canExport ? { selectedRowKeys: [...selected.keys()], preserveSelectedRowKeys: true, onChange: (keys, chosen) => {
      setSelected(previous => { const next = new Map([...previous].filter(([id]) => keys.includes(id))); chosen.forEach(row => { if (row && exportable(row)) next.set(row.id, row) }); return next })
    }, getCheckboxProps: row => ({ disabled: !exportable(row) }) } : undefined}
    pagination={{ current: page, pageSize, total, showTotal: value => `共 ${value} 条`, showSizeChanger: true, onChange: (value, size) => { setPage(value); setPageSize(size) } }} columns={[
      { title: '报名编号', dataIndex: 'registration_no', width: 190, ellipsis: true, render: (value, row) => <Button type='link' size='small' onClick={() => void open(row.id).catch(() => {})}>{value}</Button> },
      { title: '姓名', width: 130, render: (_, row) => <Space direction='vertical' size={0}><Text>{row.candidate_snapshot.name}</Text><Text type='secondary'>{row.candidate_snapshot.phone}</Text></Space> },
      { title: '报名状态', dataIndex: 'status', width: 130, render: value => <StatusTag status={value} map={REGISTRATION_STATUS} /> },
      { title: '核账状态', width: 130, render: (_, row) => <PaymentStatusTag summary={row.payment_summary} /> },
      { title: '报名费', dataIndex: 'price_cents', width: 100, render: value => formatPrice(value) },
      { title: '当前资料', width: 90, render: (_, row) => formatVersion(row) },
      { title: '有效导出', width: 130, render: (_, row) => <Tag color={hasExport(row) ? 'green' : 'default'}>{hasExport(row) ? '当前版本已导出' : '未导出'}</Tag> },
      { title: '报名时间', dataIndex: 'created_at', width: 175, render: value => formatDate(value) },
      { title: '操作', fixed: 'right', width: 75, render: (_, row) => <Button type='link' size='small' onClick={() => void open(row.id).catch(() => {})}>办理</Button> },
    ]} />
  const previewColumns = [{ title: '报名编号', dataIndex: 'registration_no' }, { title: '姓名', render: (_: unknown, row: SangforRegistration) => row.candidate_snapshot.name },
    { title: '资料版本', render: (_: unknown, row: SangforRegistration) => formatVersion(row) },
    { title: '状态', dataIndex: 'status', render: (value: string) => <StatusTag status={value} map={REGISTRATION_STATUS} /> }]
  const tabItems = [
    { key: 'people', label: '报名列表', children: <Card title='报名人员' extra={canExport ? <Button type='primary' icon={<DownloadOutlined />} disabled={!selected.size} loading={exporting} onClick={() => setSelectionMode('export')}>导出所选报名信息</Button> : undefined}>
      <Space direction='vertical' size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Button onClick={() => { setState(undefined); setPaymentState('under_review'); setPage(1) }}>待核账</Button>
          <Button onClick={() => { setState('pending_review'); setPaymentState('confirmed'); setPage(1) }}>待审核</Button>
          <Select allowClear placeholder='核账状态' style={{ width: 160 }} value={paymentState} options={PAYMENT_FILTER_OPTIONS} onChange={value => { setPaymentState(value); setPage(1) }} />
          <Input.Search allowClear placeholder='姓名 / 手机号 / 报名编号' style={{ width: 240 }} value={keywordInput} onChange={event => setKeywordInput(event.target.value)} onSearch={value => { setKeyword(value.trim()); setPage(1) }} />
          <Radio.Group optionType='button' buttonStyle='solid' value={state || 'all'} options={quickStatuses} onChange={event => { setState(event.target.value === 'all' ? undefined : event.target.value); setPage(1) }} />
          <Select allowClear placeholder='其他报名状态' style={{ width: 150 }} value={state && !['pending_review', 'returned', 'approved'].includes(state) ? state : undefined} options={Object.entries(SANGFOR_STATUS).filter(([value]) => !['pending_review', 'returned', 'approved'].includes(value)).map(([value, label]) => ({ value, label }))} onChange={value => { setState(value); setPage(1) }} />
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button><Button onClick={clearFilters}>重置</Button>
        </Space>
        {canExport && <Space wrap><Text type='secondary'>已选 {selected.size} 人</Text><Button size='small' disabled={!selected.size} onClick={() => setSelectionMode('view')}>查看名单</Button><Button size='small' disabled={!selected.size} onClick={() => setSelected(new Map())}>清空选择</Button></Space>}
        {error && <Alert type='error' showIcon message={error} action={<Button size='small' onClick={() => void load()}>重试</Button>} />}
        {peopleTable}
      </Space>
    </Card> },
    ...(canExport ? [{ key: 'records', label: '导出记录', children: <Card title='导出记录' extra={<Button icon={<ReloadOutlined />} onClick={() => void loadRecords()}>刷新</Button>}>
      {recordsError && <Alert type='error' showIcon message={recordsError} style={{ marginBottom: 16 }} />}
      <Table<SangforExportRecord> rowKey='id' dataSource={exportRows} loading={recordsLoading} scroll={{ x: 850 }} pagination={{ pageSize: 20, showSizeChanger: true, showTotal: value => `共 ${value} 条` }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无导出记录' /> }} columns={[
          { title: '报送文件', render: () => '报名信息.xlsx' }, { title: '生成时间', dataIndex: 'created_at', render: value => formatDate(value) },
          { title: '人数', dataIndex: 'people_count' }, { title: '资料版本', render: (_, row) => <Tag color={row.people.every(person => person.is_current) ? 'green' : 'orange'}>{row.people.every(person => person.is_current) ? '当前资料' : '包含历史版本'}</Tag> },
          { title: '操作', render: (_, row) => <Button type='link' size='small' icon={<EyeOutlined />} onClick={() => setPeopleRecord(row)}>查看人员</Button> },
        ]} />
    </Card> }] : []),
    { key: 'refunds', label: '退款记录', children: <Card title='退款记录' extra={<Button icon={<ReloadOutlined />} onClick={() => void loadRefunds()}>刷新</Button>}>
      <Space wrap style={{ marginBottom: 16 }}><Select allowClear placeholder='退款状态' style={{ width: 160 }} value={refundState} onChange={value => { setRefundState(value); setRefundPage(1) }} options={[{ value: 'refund_processing', label: '退款处理中' }, { value: 'refunded_closed', label: '已退款' }]} /></Space>
      {refundError && <Alert type='error' showIcon message={refundError} style={{ marginBottom: 16 }} />}
      <Table<SangforRegistration> rowKey='id' dataSource={refundRows} loading={refundLoading} scroll={{ x: 850 }} pagination={{ current: refundPage, total: refundTotal, pageSize: 20, showTotal: value => `共 ${value} 条`, onChange: setRefundPage }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无退款记录' /> }} columns={[
          { title: '报名编号', dataIndex: 'registration_no' }, { title: '姓名', render: (_, row) => row.candidate_snapshot.name },
          { title: '退款状态', dataIndex: 'status', render: value => <StatusTag status={value} map={REGISTRATION_STATUS} /> },
          { title: '退款金额', dataIndex: 'price_cents', render: value => formatPrice(value) },
          { title: '操作', render: (_, row) => <Button type='link' size='small' onClick={() => openOrder(row)}>查看收退款</Button> },
        ]} />
    </Card> },
  ]
  return <PageContainer title={`深信服批次工作台${batch ? ` · ${batch.name}` : ''}`} extra={<Space>
    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/certification/sangfor')}>返回批次列表</Button>
    <Button icon={<ReloadOutlined />} onClick={() => { void load(); if (activeTab === 'records') void loadRecords(); if (activeTab === 'refunds') void loadRefunds() }}>刷新</Button>
  </Space>}>
    {batch && <Card size='small' style={{ marginBottom: 16 }}><Space wrap size={24}>
      <span><Text type='secondary'>报考方向：</Text>{batch.exam_direction}</span><span><Text type='secondary'>考试时间：</Text>{batch.exam_date ? formatDate(batch.exam_date) : '-'}</span>
      <span><Text type='secondary'>批次状态：</Text><StatusTag status={batch.status || 'draft'} map={BATCH_STATUS} /></span>
      <span><Text type='secondary'>名额：</Text>{batch.enrolled ?? 0}/{batch.capacity || '不限'}</span><span><Text type='secondary'>报名费：</Text>{formatPrice(batch.price_cents)}</span>
    </Space></Card>}
    <Tabs activeKey={activeTab} onChange={setTab} items={tabItems} />
    <RegistrationProcessingDrawer open={!!current} onClose={() => { detailGeneration.current++; setCurrent(null) }} loading={detailLoading}
      registrationNo={current?.registration_no || ''} name={snapshot.name} batch={batch?.name} status={<StatusTag status={current?.status || ''} map={REGISTRATION_STATUS} />}
      payment={current?.payment_summary} onRefresh={async () => { if (current) await open(current.id); await load() }} footer={current && <Space wrap>
        {canReview && current.status === 'pending_review' && <><Button type='primary' onClick={() => startReview('approve')}>初审通过</Button><Button onClick={() => startReview('return')}>打回补正</Button></>}
        {canReview && current.status === 'approved' && hasExport(current) && <><Button type='primary' onClick={() => startReview('final_approve')}>登记外审通过</Button><Button onClick={() => startReview('final_return')}>外审退回</Button></>}
        {canRefund && ['pending_review', 'returned', 'approved', 'final_approved'].includes(current.status) && <Button danger onClick={() => openOrder(current)}>办理退款</Button>}
      </Space>}>
      <Space direction='vertical' size={16} style={{ width: '100%' }}>
        <Descriptions title='报考信息' bordered size='small' column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label='报考方向'>{snapshot.exam_direction || '-'}</Descriptions.Item><Descriptions.Item label='考试时间'>{snapshot.exam_date ? formatDate(snapshot.exam_date) : '-'}</Descriptions.Item>
          <Descriptions.Item label='报名费'>{formatPrice(current?.price_cents || 0)}</Descriptions.Item><Descriptions.Item label='资料版本'>{current ? formatVersion(current) : '-'}</Descriptions.Item>
          <Descriptions.Item label='有效导出'>{current && hasExport(current) ? '当前版本已导出' : '未导出'}</Descriptions.Item><Descriptions.Item label='考试券码'>{snapshot.exam_voucher_code || '-'}</Descriptions.Item>
        </Descriptions>
        <Descriptions title='报名信息' bordered size='small' column={{ xs: 1, sm: 2 }}>{Object.entries(FIELD_LABELS).map(([key, label]) => <Descriptions.Item key={key} label={label}>{snapshot[key] || '-'}</Descriptions.Item>)}</Descriptions>
        <Collapse items={[
          { key: 'history', label: '审核记录', children: current?.reviews.length ? current.reviews.map((item, index) => <Descriptions key={index} bordered size='small' column={1} style={{ marginBottom: 12 }}>
            <Descriptions.Item label='结果'>第{item.version}版 · {ACTIONS[item.action]}</Descriptions.Item><Descriptions.Item label='时间'>{formatDate(item.created_at)}</Descriptions.Item><Descriptions.Item label='审核说明'>{item.reason || '-'}</Descriptions.Item>
            {item.correction_due_at && <Descriptions.Item label='补正截止'>{formatDate(item.correction_due_at)}</Descriptions.Item>}</Descriptions>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无审核记录' /> },
          { key: 'versions', label: '报名资料版本', children: current?.versions.map(item => <Collapse key={item.version} items={[{ key: item.version, label: `第${item.version}版 · ${formatDate(item.submitted_at)}`, children: <Descriptions column={1} bordered size='small'>{Object.entries({ ...FIELD_LABELS, exam_voucher_code: '考试券码' }).map(([key, label]) => <Descriptions.Item key={key} label={label}>{item.snapshot[key] || '-'}</Descriptions.Item>)}</Descriptions> }]} />) },
        ]} />
      </Space>
    </RegistrationProcessingDrawer>
    <Modal title={ACTIONS[action || '']} open={!!action} onCancel={() => setAction(null)} onOk={() => void review()} confirmLoading={saving} okText='保存审核结果' cancelText='取消'>
      <Form layout='vertical' form={form} preserve={false} scrollToFirstError>
        <Form.Item name='reason' label={correction ? '补正原因（向考生展示）' : '审核备注'} rules={correction ? [{ required: true, whitespace: true, message: '请指出需要补正的字段和原因' }] : []}><Input.TextArea maxLength={1000} rows={4} /></Form.Item>
        {correction && <Form.Item name='due' label='补正截止时间' rules={[{ required: true, message: '请选择补正截止时间' }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>}
      </Form>
    </Modal>
    <Modal open={!!selectionMode} title={selectionMode === 'export' ? `确认导出报名信息（${selected.size}人）` : `已选人员（${selected.size}人）`} width={760} onCancel={() => !exporting && setSelectionMode(null)}
      confirmLoading={exporting} okText={selectionMode === 'export' ? '二次验证并导出' : '知道了'} cancelText='取消' okButtonProps={{ disabled: selectionMode === 'export' && !selected.size }}
      onOk={() => selectionMode === 'export' ? void exportSelected() : setSelectionMode(null)}>
      <Table<SangforRegistration> rowKey='id' size='small' columns={previewColumns} dataSource={selectedRows} pagination={{ pageSize: 8 }} scroll={{ x: 600 }} />
    </Modal>
    <Drawer open={!!peopleRecord} onClose={() => setPeopleRecord(null)} title='导出记录人员' width='min(760px, 94vw)' footer={<Button onClick={() => setPeopleRecord(null)}>关闭</Button>}>
      <Table rowKey={row => `${row.registration_id}:${row.version}`} size='small' dataSource={peopleRecord?.people || []} pagination={{ pageSize: 20 }} scroll={{ x: 600 }} columns={[
        { title: '报名编号', dataIndex: 'registration_no' }, { title: '姓名', dataIndex: 'name' }, { title: '资料版本', dataIndex: 'version', render: value => `第${value}版` },
        { title: '当前情况', dataIndex: 'is_current', render: value => <Tag color={value ? 'green' : 'orange'}>{value ? '当前版本' : '已有补正版本'}</Tag> },
      ]} />
    </Drawer>
    {reauthDialog}
  </PageContainer>
}
