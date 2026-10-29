import { useEffect, useRef, useState } from 'react'
import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Space, Typography, Upload, message } from 'antd'
import { useReauthentication } from '@/hooks/useReauthentication'
import { offlinePaymentService, type OfflinePayment, type PaymentMaterial } from '@/services/offlinePayment'
import type { RefundVendor } from '@/services/refundWorkbench'
import type { Dayjs } from 'dayjs'
import { isApiError } from '@/core/request'
import { clearReauthCredential } from '@/core/reauth'
import { ACTUAL_AMOUNT_ERROR, actualBankTimeError, bankTimeFromPicker, bankTimeToPicker, decisionFieldLabels, decisionServerErrors, validActualAmount, type OfflineDecisionField } from '@/utils/offlineDecision'

export default function OfflineDecisionModal({ payment, action, refund, onClose, onChanged }: {
  payment: OfflinePayment | null; action: 'confirm' | 'return' | 'exception' | 'refund' | 'resolve' | 'refund-approval' | null
  refund?: { kind: Exclude<RefundVendor, 'sangfor'> | 'order'; id: number }; onClose: () => void; onChanged: () => void | Promise<void>
}) {
  const [form] = Form.useForm<{ amount: number; bank_time: Dayjs; bank_reference: string; note: string; deadline?: Dayjs; refund_bank_time?: Dayjs; refund_bank_reference?: string }>()
  const [materials, setMaterials] = useState<PaymentMaterial[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OfflineDecisionField, string[]>>>({})
  const [conflict, setConflict] = useState(false)
  const lock = useRef(false)
  const request = useRef<{ fingerprint: string; key: string } | null>(null)
  const { ensureReauthenticated, reauthDialog } = useReauthentication({ description: '核账和退款会影响订单状态，请输入当前管理员密码。验证后可在当前标签页连续办理多位报名，10分钟内无需逐人输入；到期、刷新页面或退出登录后需重新验证。' })
  const labels = decisionFieldLabels(action)
  useEffect(() => { if (action) { form.resetFields(); setMaterials([]); setError(''); setFieldErrors({}); setConflict(false); request.current = null } }, [action, payment?.order_id, form])
  async function refreshStatus() {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try {
      await onChanged()
      setError('核账状态已刷新，请核对最新凭证后关闭并重新进入处理窗口。当前输入仍保留，未重新执行资金操作。')
    } catch { setError('核账状态刷新失败，请稍后重试；当前输入已保留。') }
    finally { lock.current = false; setBusy(false) }
  }
  async function submit() {
    if (!payment || !action || lock.current || conflict) return
    lock.current = true; setBusy(true); setError(''); setFieldErrors({})
    try {
      const values = await form.validateFields()
      if (['refund', 'resolve'].includes(action) && !materials.length) { setError('请上传实际退款凭证'); return }
      const body = { expected_version: payment.current_version, note: values.note,
        ...(action === 'return' && values.deadline ? { deadline: values.deadline.toISOString() } : {}),
        ...(['confirm', 'refund', 'resolve'].includes(action) ? { amount_cents: Math.round(values.amount * 100), bank_time: values.bank_time.toISOString(), bank_reference: values.bank_reference } : {}),
        ...(action === 'refund' ? { material_ids: materials.map(m => m.id), refund_kind: refund?.kind, refund_id: refund?.id } : {}),
        ...(action === 'resolve' ? { material_ids: materials.map(m => m.id), refund_bank_time: values.refund_bank_time?.toISOString(), refund_bank_reference: values.refund_bank_reference } : {}) }
      const fingerprint = JSON.stringify(body)
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() }
      const token = ['confirm', 'refund', 'resolve', 'refund-approval'].includes(action) ? await ensureReauthenticated() : undefined
      if (['confirm', 'refund', 'resolve', 'refund-approval'].includes(action) && !token) return
      await form.validateFields() // Time may have advanced while the identity dialog was open.
      const result = await offlinePaymentService.decide(payment.order_id, action, { ...body, request_key: request.current!.key }, token || undefined)
      if (result.status === 'exception') message.warning('已转异常待处理，未确认付款或发放权益')
      else message.success(action === 'refund' ? '实际退款已登记完成' : action === 'confirm' ? '到账已确认，后续资料审核按原流程进行' : '处理已保存')
      onClose()
      try { await onChanged() } catch { message.error('操作已保存，最新状态刷新失败，请刷新后继续办理') }
    } catch (reason) {
      const local = (reason as { errorFields?: { name: (string | number)[] }[] })?.errorFields
      if (local?.length) {
        setError('请修正标红的填写项后再提交。')
        form.scrollToField(local[0].name, { block: 'center' })
      } else if (isApiError(reason) && reason.status === 422) {
        const mapped = decisionServerErrors(reason.fields, action)
        const entries = Object.entries(mapped.errors) as [OfflineDecisionField, string[]][]
        form.setFields(entries.map(([name, errors]) => ({ name, errors }))); setFieldErrors(mapped.errors)
        setError(mapped.summary.join('；') || (!entries.length ? '提交信息校验未通过，请核对填写内容后重试。' : ''))
        if (entries[0]) form.scrollToField(entries[0][0], { block: 'center' })
      } else if (isApiError(reason) && reason.status === 409) {
        setConflict(true); setError(`${/[\u3400-\u9fff]/.test(reason.message) ? `${reason.message}。` : ''}请刷新核账状态，核对后关闭并重新进入处理窗口。当前输入已保留，不会自动重新提交。`)
      } else if (isApiError(reason) && reason.status === 401) setError('登录已失效，请重新登录后再处理。')
      else if (isApiError(reason) && reason.status === 403) {
        clearReauthCredential()
        setError(/重新验证|再认证|身份验证/.test(reason.message) ? '身份验证凭据已失效，请重新验证当前管理员密码后重试。' : '暂无当前操作权限，请联系超级管理员核对权限。')
      } else setError('提交结果暂未确认，请先关闭窗口并刷新核账状态核实后再处理；当前输入仍保留在本窗口。')
    }
    finally { lock.current = false; setBusy(false) }
  }
  const title = { confirm: '确认银行实际到账', return: '驳回补交凭证', exception: '标记资金异常', refund: '登记线下实际退款', resolve: '登记异常转账已退回', 'refund-approval': '审批订单退款' }
  const timeProps = { showTime: true, showNow: false, style: { width: '100%' }, format: 'YYYY-MM-DD HH:mm:ss' }
  const timeValueProps = (value?: Dayjs) => ({ value: bankTimeToPicker(value) })
  const timeRules = (name: 'bank_time' | 'refund_bank_time') => [{ required: true, message: `请选择${labels[name]}` }, { validator: (_: unknown, value?: Dayjs) => { const text = actualBankTimeError(value, labels[name]); return text ? Promise.reject(new Error(text)) : Promise.resolve() } }]
  const summary = [error, ...Object.values(fieldErrors).flat()].filter(Boolean)
  return <><Modal title={action ? title[action] : ''} open={!!action && !!payment} onCancel={() => { if (!busy) onClose() }} onOk={() => void submit()} confirmLoading={busy} okButtonProps={{ disabled: conflict }} destroyOnClose maskClosable={false} okText='确认保存'>
    <Typography.Paragraph type='secondary'>订单 {payment?.out_trade_no} · 当前凭证第 {payment?.current_version} 版</Typography.Paragraph>
    {['confirm', 'refund', 'resolve', 'refund-approval'].includes(action || '') && <Typography.Paragraph type='secondary'>身份验证在当前标签页内复用10分钟，可连续办理，无需逐人输入密码。</Typography.Paragraph>}
    <Form form={form} layout='vertical' disabled={busy} onValuesChange={changed => {
      if (error === '请修正标红的填写项后再提交。') setError('')
      for (const key of Object.keys(changed) as OfflineDecisionField[]) if (fieldErrors[key]) {
        form.setFields([{ name: key, errors: [] }]); setFieldErrors(previous => { const next = { ...previous }; delete next[key]; return next })
      }
    }}>
      {['confirm', 'refund', 'resolve'].includes(action || '') && <>
        <Form.Item name='amount' label={`${labels.amount}（元）`} required rules={[{ validator: (_, value) => validActualAmount(value) ? Promise.resolve() : Promise.reject(new Error(ACTUAL_AMOUNT_ERROR)) }]}><InputNumber controls={false} placeholder='按银行流水填写，最多两位小数' style={{ width: '100%' }} /></Form.Item>
        <Form.Item name='bank_time' label={labels.bank_time} getValueProps={timeValueProps} getValueFromEvent={bankTimeFromPicker} rules={timeRules('bank_time')} extra='按北京时间填写，以银行流水实际时间为准；不可填写未来时间（允许5分钟时钟误差）。'><DatePicker {...timeProps} /></Form.Item>
        <Form.Item name='bank_reference' label='核实后的银行流水标识' rules={[{ required: true, whitespace: true, message: '请填写核实后的银行流水标识' }]}><Input maxLength={128} /></Form.Item>
      </>}
      {action === 'resolve' && <><Form.Item name='refund_bank_time' label='实际退回时间' getValueProps={timeValueProps} getValueFromEvent={bankTimeFromPicker} rules={timeRules('refund_bank_time')} extra='按北京时间填写银行流水实际退回时间。'><DatePicker {...timeProps} /></Form.Item><Form.Item name='refund_bank_reference' label='核实后的退款流水' rules={[{ required: true, whitespace: true, message: '请填写核实后的退款流水' }]}><Input maxLength={128} /></Form.Item></>}
      {action === 'return' && <Form.Item name='deadline' label='补交截止时间（不填使用默认时限）' getValueProps={timeValueProps} getValueFromEvent={bankTimeFromPicker} rules={[{ validator: (_, value?: Dayjs) => !value || (value.isValid() && value.valueOf() > Date.now()) ? Promise.resolve() : Promise.reject(new Error('请选择晚于当前时间的补交截止时间')) }]} extra='按北京时间选择，不填写时使用默认补交期限。'><DatePicker {...timeProps} /></Form.Item>}
      <Form.Item name='note' label='处理备注' rules={[{ required: true, whitespace: true, message: '请填写处理备注' }]}><Input.TextArea maxLength={1000} rows={3} /></Form.Item>
      {(action === 'refund' || action === 'resolve') && <Form.Item label='实际退款凭证（JPG、PNG、PDF，单个 ≤10 MB，最多3个）' required>
        <Upload accept='.jpg,.jpeg,.png,.pdf' maxCount={3} fileList={materials.map(m => ({ uid: String(m.id), name: m.filename, status: 'done' as const }))}
          beforeUpload={async file => {
            if (lock.current || !payment || materials.length >= 3) return Upload.LIST_IGNORE
            lock.current = true; setBusy(true)
            try { const result = await offlinePaymentService.upload(payment.order_id, file); setMaterials(previous => [...previous, result]) }
            catch (reason) { setError(reason instanceof Error ? reason.message : '凭证上传失败') }
            finally { lock.current = false; setBusy(false) }
            return Upload.LIST_IGNORE
          }} onRemove={file => { if (busy) return false; setMaterials(previous => previous.filter(m => String(m.id) !== file.uid)); return true }}><Typography.Link>上传退款凭证</Typography.Link></Upload>
      </Form.Item>}
    </Form>{!!summary.length && <Alert type='error' showIcon message='请核对本次处理信息' description={<Space direction='vertical'>{summary.map((text, index) => <Typography.Text key={index}>{text}</Typography.Text>)}{conflict && <Button disabled={busy} onClick={() => void refreshStatus()}>刷新核账状态</Button>}</Space>} />}
  </Modal>{reauthDialog}</>
}
