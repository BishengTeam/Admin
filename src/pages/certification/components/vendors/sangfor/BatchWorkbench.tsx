import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Collapse, DatePicker, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { useReauthentication } from '@/hooks/useReauthentication'
import { sangforService, SANGFOR_STATUS, type SangforBatch, type SangforRegistration } from '@/services/sangfor'
import { downloadBlob } from '@/utils/download'
import { formatDate, formatPrice } from '@/utils/format'
import RegistrationProcessingDrawer from '../../shared/RegistrationProcessingDrawer'
import { PaymentStatusTag, PAYMENT_FILTER_OPTIONS } from '../../shared/RegistrationPayment'

const FIELD_LABELS: Record<string, string> = { name: '考生姓名', id_card: '身份证号码', phone: '手机号', organization: '所属机构', first_name: '名字拼音（firstName）',
  last_name: '姓氏拼音（lastName）', exam_direction: '报考方向', exam_date: '考试时间', exam_voucher_code: '考试券码', email: '邮箱地址', mailing_address: '邮寄地址', remark1: '备注1', remark2: '备注2' }
const ACTIONS: Record<string, string> = { approve: '初审通过', return: '退回补正', final_approve: '外审通过', final_return: '外审退回' }

export default function SangforBatchWorkbench() {
  const batchId = Number(useParams().batchId)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const canReview = usePermission('sangfor:review'), canExport = usePermission('sangfor:export')
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const [batch, setBatch] = useState<SangforBatch | null>(null)
  const [rows, setRows] = useState<SangforRegistration[]>([])
  const [total, setTotal] = useState(0), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(20)
  const [state, setState] = useState<string>(), [paymentState, setPaymentState] = useState<string>(), [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [selected, setSelected] = useState<React.Key[]>([])
  const [current, setCurrent] = useState<SangforRegistration | null>(null)
  const [action, setAction] = useState<string | null>(null), [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false), [exporting, setExporting] = useState(false)
  const detailGeneration = useRef(0), listGeneration = useRef(0)
  const [form] = Form.useForm()
  const load = useCallback(async () => {
    const generation = ++listGeneration.current
    setLoading(true); setError('')
    try {
      const [info, result] = await Promise.all([sangforService.batch(batchId), sangforService.registrations({ batch_id: batchId, page, page_size: pageSize, state, payment_state: paymentState, keyword: keyword || undefined })])
      if (generation !== listGeneration.current) return
      setBatch(info); setRows(result.items); setTotal(result.total); setSelected([])
    } catch (reason) { if (generation === listGeneration.current) setError(reason instanceof Error ? reason.message : '加载失败，请重试') }
    finally { if (generation === listGeneration.current) setLoading(false) }
  }, [batchId, page, pageSize, state, paymentState, keyword])
  useEffect(() => { void load(); return () => { listGeneration.current++ } }, [load])
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
    setSearchParams({}, { replace: true })
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
  const exportRows = async () => {
    if (exporting || !selected.length) return
    setExporting(true)
    try {
      const token = await ensureReauthenticated()
      if (!token) return
      downloadBlob(await sangforService.export(batchId, selected.map(Number), token), `深信服报名信息_批次${batchId}.xlsx`)
      message.success('报名信息表已生成'); await load()
      if (current) await open(current.id)
    } catch (reason) { message.error(reason instanceof Error ? reason.message : '导出失败，请重试') }
    finally { setExporting(false) }
  }
  const startReview = (value: string) => { form.resetFields(); setAction(value) }
  const correction = action === 'return' || action === 'final_return'
  const snapshot = current?.candidate_snapshot || {}
  return <PageContainer title={batch?.name || '深信服批次工作台'} extra={<Button onClick={() => navigate('/admin/certification/sangfor')}>返回批次</Button>}>
    {batch && <Card size='small' style={{ marginBottom: 16 }}><Descriptions size='small' column={{ xs: 1, md: 3 }}>
      <Descriptions.Item label='报考方向'>{batch.exam_direction}</Descriptions.Item><Descriptions.Item label='考试时间'>{batch.exam_date ? formatDate(batch.exam_date) : '未设置'}</Descriptions.Item>
      <Descriptions.Item label='报名费用'>{formatPrice(batch.price_cents)}</Descriptions.Item></Descriptions></Card>}
    <Space wrap style={{ marginBottom: 16 }}>
      <Input.Search placeholder='姓名、手机号、报名编号' allowClear onSearch={value => { setKeyword(value.trim()); setPage(1) }} style={{ width: 250 }} />
      <Select allowClear placeholder='报名状态' value={state} style={{ width: 160 }} options={Object.entries(SANGFOR_STATUS).map(([value, label]) => ({ value, label }))} onChange={value => { setState(value); setPage(1) }} />
      <Select allowClear placeholder='核账状态' value={paymentState} style={{ width: 160 }} options={PAYMENT_FILTER_OPTIONS} onChange={value => { setPaymentState(value); setPage(1) }} />
      <Button onClick={() => void load()}>刷新</Button>{canExport && <Button type='primary' disabled={!selected.length} loading={exporting} onClick={() => void exportRows()}>导出已选报名信息</Button>}
    </Space>
    {error && <Typography.Paragraph type='danger' role='alert'>{error}</Typography.Paragraph>}
    <Table<SangforRegistration> rowKey='id' loading={loading} dataSource={rows} scroll={{ x: 1050 }}
      rowSelection={canExport ? { selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: row => ({ disabled: !['approved', 'final_approved'].includes(row.status) || !row.payment_summary.review_payment_allowed }) } : undefined}
      pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (value, size) => { setPage(value); setPageSize(size) } }} columns={[
        { title: '姓名', render: (_, row) => row.candidate_snapshot.name }, { title: '手机号', render: (_, row) => row.candidate_snapshot.phone },
        { title: '报名状态', dataIndex: 'status', render: value => <Tag>{SANGFOR_STATUS[value] || value}</Tag> },
        { title: '核账状态', render: (_, row) => <PaymentStatusTag summary={row.payment_summary} /> },
        { title: '当前资料', render: (_, row) => `第${row.current_version}版` },
        { title: '报送情况', render: (_, row) => row.exports.some(item => item.version === row.current_version) ? '当前版本已导出' : '待导出' },
        { title: '报名时间', dataIndex: 'created_at', render: value => formatDate(value) },
        { title: '操作', fixed: 'right', render: (_, row) => <Button type='link' onClick={() => void open(row.id).catch(() => {})}>办理</Button> },
      ]} />
    <RegistrationProcessingDrawer open={!!current} onClose={() => { detailGeneration.current++; setCurrent(null) }} loading={detailLoading}
      registrationNo={current?.registration_no || ''} name={snapshot.name} batch={batch?.name} status={<Tag>{SANGFOR_STATUS[current?.status || '']}</Tag>}
      payment={current?.payment_summary} onRefresh={async () => { if (current) await open(current.id); await load() }} footer={canReview && current && <Space>
        {current.status === 'pending_review' && <><Button onClick={() => startReview('return')}>退回补正</Button><Button type='primary' onClick={() => startReview('approve')}>初审通过</Button></>}
        {current.status === 'approved' && current.exports.some(item => item.version === current.current_version) && <><Button onClick={() => startReview('final_return')}>外审退回</Button><Button type='primary' onClick={() => startReview('final_approve')}>登记外审通过</Button></>}
      </Space>}>
      <Descriptions bordered size='small' column={{ xs: 1, md: 2 }}>{Object.entries(FIELD_LABELS).map(([key, label]) => <Descriptions.Item key={key} label={label}>{snapshot[key] || '—'}</Descriptions.Item>)}</Descriptions>
      <Collapse style={{ marginTop: 16 }} items={[
        { key: 'history', label: '审核记录', children: current?.reviews.map((item, index) => <Typography.Paragraph key={index}>第{item.version}版 · {ACTIONS[item.action]} · {formatDate(item.created_at)}<br />{item.reason}{item.correction_due_at && `，补正截止：${formatDate(item.correction_due_at)}`}</Typography.Paragraph>) },
        { key: 'versions', label: '报名资料版本', children: current?.versions.map(item => <Collapse key={item.version} items={[{ key: item.version, label: `第${item.version}版 · ${formatDate(item.submitted_at)}`, children: <Descriptions column={1} size='small'>{Object.entries(FIELD_LABELS).map(([key, label]) => <Descriptions.Item key={key} label={label}>{item.snapshot[key] || '—'}</Descriptions.Item>)}</Descriptions> }]} />) },
      ]} />
    </RegistrationProcessingDrawer>
    <Modal title={ACTIONS[action || '']} open={!!action} onCancel={() => setAction(null)} onOk={() => void review()} confirmLoading={saving} okText='保存审核结果' cancelText='取消'>
      <Form layout='vertical' form={form} preserve={false}>
        <Form.Item name='reason' label={correction ? '补正原因（向考生展示）' : '审核备注'} rules={correction ? [{ required: true, whitespace: true, message: '请指出需要补正的字段和原因' }] : []}><Input.TextArea maxLength={1000} rows={4} /></Form.Item>
        {correction && <Form.Item name='due' label='补正截止时间' rules={[{ required: true, message: '请选择补正截止时间' }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>}
      </Form>
    </Modal>{reauthDialog}
  </PageContainer>
}
