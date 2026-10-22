import { useEffect, useRef, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Typography } from 'antd'
import { offlinePaymentService, type PaymentSettings } from '@/services/offlinePayment'
import { useReauthentication } from '@/hooks/useReauthentication'

export default function OfflineSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form] = Form.useForm<PaymentSettings>()
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  async function load() {
    setLoading(true); setReady(false)
    try { const data = await offlinePaymentService.settings(); form.setFieldsValue(data || { version: 0, submit_hours: 24, correction_hours: 48, transfer_note: '转账请备注订单号', contact_phone: '', contact_wechat: '', service_hours: '' }); setReady(true); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : '收款设置加载失败') } finally { setLoading(false) }
  }
  useEffect(() => { if (open) { form.resetFields(); void load() } }, [open])
  async function save() {
    if (!ready || loading || lock.current) return
    lock.current = true
    try {
      const values = await form.validateFields()
      setLoading(true)
      const token = await ensureReauthenticated()
      if (!token) return
      await offlinePaymentService.saveSettings(values, token); onClose()
    } catch (reason) { if (reason instanceof Error) setError(reason.message) } finally { lock.current = false; setLoading(false) }
  }
  return <><Modal title='银行收款设置' open={open} onCancel={() => { if (!loading) onClose() }} onOk={() => void save()} confirmLoading={loading} okButtonProps={{ disabled: !ready }} destroyOnClose>
    <Form layout='vertical' form={form} disabled={loading}>
      <Form.Item name='version' hidden><InputNumber /></Form.Item>
      {([['account_name', '收款户名', true], ['bank_name', '开户行', true], ['account_number', '银行账号', true], ['transfer_note', '转账备注说明', false], ['contact_name', '管理员姓名', true], ['contact_phone', '联系电话', false], ['contact_wechat', '联系微信', false], ['service_hours', '服务时间', false]] as const).map(([name, label, required]) => <Form.Item key={name} name={name} label={label} rules={[{ required, whitespace: true, message: `请填写${label}` }]}><Input maxLength={name === 'transfer_note' ? 500 : 128} /></Form.Item>)}
      <Form.Item name='submit_hours' label='首次提交期限（小时）' rules={[{ required: true }]}><InputNumber min={1} max={168} /></Form.Item>
      <Form.Item name='correction_hours' label='默认补交期限（小时）' rules={[{ required: true }]}><InputNumber min={1} max={336} /></Form.Item>
    </Form>{error && <Typography.Paragraph type='danger'>{error}</Typography.Paragraph>}{!ready && !loading && <Button onClick={() => void load()}>重新加载</Button>}
  </Modal>{reauthDialog}</>
}
