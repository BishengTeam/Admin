import { refundErrorText } from '@/utils/refund'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, DatePicker, Form, Input, Modal, Select, Space, Tag, Typography, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { rensheService } from '@/services/renshe'
import type { RensheApplicationDetail, RensheReview, RensheReviewStage, RensheReviewDecision, RensheReviewPayload } from '@/types/renshe'
import { formatDate } from '@/utils/format'
import { RENSHE_APPLICATION_STATUS_MAP, rensheFieldLabel } from '@/utils/renshe'
import RegistrationProcessingDrawer from '../../shared/RegistrationProcessingDrawer'
import ApplicationReviewContent, { locateReviewCheck } from './ApplicationReviewContent'
import ApplicationHistory, { ReviewRecords } from './ApplicationHistory'

interface Props { applicationId: number | null; open: boolean; onClose: () => void; onChanged?: () => void | Promise<void> }
interface RejectionValues { reason: string; required_changes: string[]; correction_due_at: Dayjs }
export default function ApplicationDetailDrawer({ applicationId, open, onClose, onChanged }: Props) {
  const [stored, setDetail] = useState<RensheApplicationDetail | null>(null)
  const detail = stored?.id === applicationId ? stored : null
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checks, setChecks] = useState<string[]>([])
  const [rejection, setRejection] = useState<RensheReviewStage | 'return' | null>(null)
  const [correcting, setCorrecting] = useState<RensheReview | null>(null)
  const [rejectForm] = Form.useForm<RejectionValues>()
  const [correctionForm] = Form.useForm<{ to_decision: RensheReviewDecision; reason: string }>()
  const seq = useRef(0)
  const activeId = useRef(applicationId); activeId.current = applicationId
  const confirmation = useRef<ReturnType<typeof Modal.confirm> | null>(null)
  const navigate = useNavigate()
  const canWrite = usePermission('renshe:review')
  const canRefund = usePermission('order:list')
  const { admin } = useAuth()
  const current = detail?.versions.find(version => version.id === detail.current_version_id)
  const requirements = current?.review_requirements
  const definition = JSON.stringify(requirements?.checks || [])
  const resolved = requirements?.status === 'resolved'
  const initial = detail?.status === 'pending_initial_review'
  const editable = !!(initial && resolved && canWrite && detail?.payment_summary?.review_payment_allowed && !detail.frozen_at && !loading && !busy)
  const keys = requirements?.checks.map(check => check.key) || []
  const checked = keys.filter(key => checks.includes(key))
  const missing = requirements?.material_requirements.filter(rule => rule.required && !rule.valid) || []
  const complete = !!(resolved && keys.length && checked.length === keys.length && !missing.length)
  const legacy = requirements?.path.id === 'related_major_current_graduating_student'

  const load = useCallback(async () => {
    if (!applicationId) return
    const request = ++seq.current; setLoading(true)
    try { const result = await rensheService.getApplication(applicationId); if (request === seq.current && activeId.current === applicationId) setDetail(result) }
    catch (error) { if (request === seq.current) setDetail(null); throw error }
    finally { if (request === seq.current) setLoading(false) }
  }, [applicationId])
  useEffect(() => {
    setDetail(null); setRejection(null); setCorrecting(null)
    if (open && applicationId) void load().catch(() => message.error('报名资料加载失败，请刷新重试'))
    return () => { seq.current++; confirmation.current?.destroy() }
  }, [applicationId, open, load])
  useEffect(() => { setChecks([]); confirmation.current?.destroy() }, [applicationId, current?.id, definition, open])
  async function refresh() { await load(); await onChanged?.() }
  async function finish() { try { await refresh() } catch { message.warning('操作已保存，最新资料刷新失败，请重试') } }
  function approve(stage: RensheReviewStage) {
    if (!applicationId || !current || !resolved || (stage === 'initial' && !complete)) return
    const id = applicationId, versionId = current.id
    const payload: RensheReviewPayload = { decision: 'approved', expected_version_id: versionId, ...(stage === 'initial' ? { checklist: Object.fromEntries(checked.map(key => [key, true])) } : {}) }
    confirmation.current = Modal.confirm({ title: stage === 'initial' ? '确认初审通过' : '确认外审通过', content: `本次审核绑定报名版本 ${current.version_no}。`, onOk: async () => {
      setBusy(true)
      try { await rensheService.reviewApplication(id, stage, payload); message.success('审核已保存'); await finish() }
      catch (error) { message.error(error instanceof Error ? error.message : '审核失败'); throw error }
      finally { setBusy(false) }
    } })
  }
  async function reject() {
    if (!applicationId || !current || !rejection) return
    const values = await rejectForm.validateFields(); setBusy(true)
    try {
      const payload: RensheReviewPayload = { decision: 'rejected', expected_version_id: current.id, reason: values.reason.trim(), required_changes: values.required_changes, correction_due_at: values.correction_due_at.toISOString() }
      if (rejection === 'return') await rensheService.returnForCorrection(applicationId, payload)
      else await rensheService.reviewApplication(applicationId, rejection, payload)
      message.success('已打回补正'); setRejection(null); rejectForm.resetFields(); await finish()
    } catch (error) { message.error(error instanceof Error ? error.message : '补正提交失败') }
    finally { setBusy(false) }
  }
  async function correct() {
    if (!correcting) return
    const values = await correctionForm.validateFields(); setBusy(true)
    try { await rensheService.correctReview(correcting.id, values); message.success('更正已保存'); setCorrecting(null); await finish() }
    catch (error) { message.error(error instanceof Error ? error.message : '更正失败') }
    finally { setBusy(false) }
  }
  const correctionOptions = requirements ? [...requirements.correction_fields.map(value => ({ value, label: rensheFieldLabel(value) })), ...requirements.material_requirements.map(rule => ({ value: rule.kind, label: rule.name }))] : []
  const status = detail ? RENSHE_APPLICATION_STATUS_MAP[detail.status] : null
  const footer = detail && canWrite ? <Space wrap>
    {initial && <>{resolved && <Typography.Text>已核验 {checked.length}/{keys.length} 项{keys.length > checked.length ? `，尚有 ${keys.length - checked.length} 项` : ''}</Typography.Text>}
      <Button disabled={!resolved || checked.length === keys.length} onClick={() => { const next = keys.find(key => !checked.includes(key)); if (next && current) locateReviewCheck(current.id, next) }}>定位下一项</Button>
      <Button type='primary' disabled={!complete || !editable} loading={busy} onClick={() => approve('initial')}>初审通过</Button></>}
    {detail.status === 'pending_external_review' && <Button type='primary' disabled={!resolved || loading || busy || !!detail.frozen_at} loading={busy} onClick={() => approve('external')}>外审通过</Button>}
    {['pending_initial_review', 'pending_external_review', 'external_approved'].includes(detail.status) && <Button danger disabled={!resolved || busy} onClick={() => { rejectForm.resetFields(); setRejection(initial ? 'initial' : 'return') }}>打回补正</Button>}
  </Space> : null
  return <>
    <RegistrationProcessingDrawer key={applicationId} open={open} onClose={onClose} registrationNo={String(applicationId || '')}
      name={String(current?.realname_snapshot.real_name || '')} batch={detail ? `${detail.plan.project_name || '人社认证'} · ${detail.plan.name}` : ''}
      status={status ? <Tag color={status.color}>{status.text}</Tag> : '加载中'} payment={detail?.payment_summary} loading={loading} onRefresh={refresh} footer={footer}>
      {detail && <Space direction='vertical' size={24} style={{ width: '100%' }}>
        {detail.frozen_at && <Alert type='warning' message='报名已冻结，暂不能审核，请先处理退款或冻结事项' />}
        {detail.correction_due_at && <Alert type='warning' message={`补正截止：${formatDate(detail.correction_due_at)}`} />}
        {detail.current_refund_status === 'failed' && detail.current_refund_last_error && <Alert type='error' message={refundErrorText(detail.current_refund_last_error)} description={`已重试 ${detail.current_refund_retry_count || 0} 次，请在退款工作台继续处理`} />}
        {canRefund && detail.current_refund_id && <Button onClick={() => { onClose(); navigate(`/admin/certification/renshe/batches/${detail.plan_id}?tab=refunds&refundRegistrationId=${detail.id}`) }}>查看退款记录</Button>}
        {!!missing.length && initial && <Alert type='error' message={`必填材料缺失或无效：${missing.map(rule => rule.name).join('、')}`} />}
        <Typography.Title level={5} style={{ margin: 0 }}>当前版本资料{current ? ` · 版本 ${current.version_no}` : ''}</Typography.Title>
        {current ? <ApplicationReviewContent key={current.id} version={current} checks={checked} editable={editable} onCheck={(key, selected) => setChecks(previous => selected ? [...new Set([...previous, key])] : previous.filter(item => item !== key))} /> : <Alert type='info' message='尚无正式提交的报名版本' />}
        <Typography.Title level={5} style={{ margin: 0 }}>审核记录</Typography.Title>
        <ReviewRecords reviews={current?.reviews || []} onCorrect={admin?.role === 'super_admin' && legacy && detail.payment_summary?.review_payment_allowed ? review => { setCorrecting(review); correctionForm.setFieldsValue({ to_decision: review.decision === 'approved' ? 'rejected' : 'approved', reason: '' }) } : undefined} />
        <Typography.Title level={5} style={{ margin: 0 }}>历史版本〔只读〕</Typography.Title>
        {detail.versions.some(version => version.id !== current?.id) ? <ApplicationHistory versions={detail.versions.filter(version => version.id !== current?.id)} /> : <Typography.Text type='secondary'>暂无历史版本</Typography.Text>}
      </Space>}
    </RegistrationProcessingDrawer>
    <Modal title='打回补正' open={!!rejection} onCancel={() => setRejection(null)} onOk={() => void reject()} confirmLoading={busy} destroyOnClose>
      <Form form={rejectForm} layout='vertical'>
        <Form.Item name='reason' label='补正原因' rules={[{ required: true, whitespace: true, message: '请填写补正原因' }]}><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
        <Form.Item name='required_changes' label='需补正字段或材料' rules={[{ required: true, message: '请选择当前路径的补正项' }]}><Select mode='multiple' options={correctionOptions} /></Form.Item>
        <Form.Item name='correction_due_at' label='补正截止时间' rules={[{ required: true, message: '请设置补正截止时间' }, { validator: (_, value?: Dayjs) => value?.isAfter(dayjs()) ? Promise.resolve() : Promise.reject(new Error('截止时间必须晚于现在')) }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
      </Form>
    </Modal>
    <Modal title='更正审核结果' open={!!correcting} onCancel={() => setCorrecting(null)} onOk={() => void correct()} confirmLoading={busy} destroyOnClose>
      <Form form={correctionForm} layout='vertical'><Form.Item name='to_decision' label='更正结果' rules={[{ required: true }]}><Select options={[{ value: 'approved', label: '通过' }, { value: 'rejected', label: '驳回' }]} /></Form.Item><Form.Item name='reason' label='更正原因' rules={[{ required: true, whitespace: true }]}><Input.TextArea maxLength={2000} /></Form.Item></Form>
    </Modal>
  </>
}
