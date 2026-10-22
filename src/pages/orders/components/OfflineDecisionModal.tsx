import { useEffect, useRef, useState } from 'react'
import { DatePicker, Form, Input, InputNumber, Modal, Typography, Upload, message } from 'antd'
import { useReauthentication } from '@/hooks/useReauthentication'
import { offlinePaymentService, type OfflinePayment, type PaymentMaterial } from '@/services/offlinePayment'
import type { RefundVendor } from '@/services/refundWorkbench'
import type { Dayjs } from 'dayjs'

export default function OfflineDecisionModal({ payment, action, refund, onClose, onChanged }: {
  payment: OfflinePayment | null; action: 'confirm' | 'return' | 'exception' | 'refund' | 'resolve' | 'refund-approval' | null
  refund?: { kind: RefundVendor | 'order'; id: number }; onClose: () => void; onChanged: () => void
}) {
  const [form] = Form.useForm<{ amount: number; bank_time: Dayjs; bank_reference: string; note: string; deadline?: Dayjs; refund_bank_time?: Dayjs; refund_bank_reference?: string }>()
  const [materials, setMaterials] = useState<PaymentMaterial[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const request = useRef<{ fingerprint: string; key: string } | null>(null)
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  useEffect(() => { if (action) { form.resetFields(); setMaterials([]); setError(''); request.current = null } }, [action, payment?.order_id, form])
  async function submit() {
    if (!payment || !action || lock.current) return
    lock.current = true; setBusy(true); setError('')
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
      const result = await offlinePaymentService.decide(payment.order_id, action, { ...body, request_key: request.current!.key }, token || undefined)
      if (result.status === 'exception') message.warning('已转异常待处理，未确认付款或发放权益')
      else message.success(action === 'refund' ? '实际退款已登记完成' : action === 'confirm' ? '到账已确认，后续资料审核按原流程进行' : '处理已保存')
      onChanged(); onClose()
    } catch (reason) { if (reason instanceof Error) setError(reason.message) }
    finally { lock.current = false; setBusy(false) }
  }
  const title = { confirm: '确认银行实际到账', return: '驳回补交凭证', exception: '标记资金异常', refund: '登记线下实际退款', resolve: '登记异常转账已退回', 'refund-approval': '审批订单退款' }
  return <><Modal title={action ? title[action] : ''} open={!!action && !!payment} onCancel={() => { if (!busy) onClose() }} onOk={() => void submit()} confirmLoading={busy} destroyOnClose maskClosable={false} okText='确认保存'>
    <Typography.Paragraph type='secondary'>订单 {payment?.out_trade_no} · 当前凭证第 {payment?.current_version} 版</Typography.Paragraph>
    <Form form={form} layout='vertical' disabled={busy}>
      {['confirm', 'refund', 'resolve'].includes(action || '') && <>
        <Form.Item name='amount' label={action === 'refund' ? '实际退款金额（元）' : '实际到账金额（元）'} rules={[{ required: true, message: '请填写银行实际金额' }]}><InputNumber min={0.01} max={21474836.47} precision={2} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name='bank_time' label={action === 'refund' ? '银行实际退款时间' : '银行实际到账时间'} rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
        <Form.Item name='bank_reference' label='核实后的银行流水标识' rules={[{ required: true, whitespace: true }]}><Input maxLength={128} /></Form.Item>
      </>}
      {action === 'resolve' && <><Form.Item name='refund_bank_time' label='实际退回时间' rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item><Form.Item name='refund_bank_reference' label='核实后的退款流水' rules={[{ required: true, whitespace: true }]}><Input maxLength={128} /></Form.Item></>}
      {action === 'return' && <Form.Item name='deadline' label='补交截止时间（不填使用默认时限）'><DatePicker showTime style={{ width: '100%' }} /></Form.Item>}
      <Form.Item name='note' label='处理备注' rules={[{ required: true, whitespace: true }]}><Input.TextArea maxLength={1000} rows={3} /></Form.Item>
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
    </Form>{error && <Typography.Paragraph type='danger'>{error}</Typography.Paragraph>}
  </Modal>{reauthDialog}</>
}
