import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Input, InputNumber, Modal, Space, Typography, message } from 'antd'
import { offlinePaymentService, type PaymentSettings } from '@/services/offlinePayment'
import { useAuth } from '@/hooks/useAuth'
import { useReauthentication } from '@/hooks/useReauthentication'
import { isApiError } from '@/core/request'
import { clearReauthCredential } from '@/core/reauth'
import { CONTACT_ERROR, SETTINGS_DEFAULTS, SETTINGS_LABELS, SETTINGS_LIMITS, prepareSettings, settingsRules, settingsServerErrors, trimmed, type SettingsField } from '@/utils/offlineSettings'
import styles from './OfflineSettingsModal.module.css'

export default function OfflineSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form] = Form.useForm<PaymentSettings>()
  const { admin, permissions } = useAuth()
  const canRead = admin?.role === 'super_admin' || permissions.includes('*') || permissions.includes('offline:settings')
  const canEdit = canRead && admin?.role === 'super_admin'
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [summary, setSummary] = useState<string[]>([])
  const [invalid, setInvalid] = useState<SettingsField[]>([])
  const [contactError, setContactError] = useState('')
  const [conflict, setConflict] = useState(false)
  const lock = useRef(false)
  const sequence = useRef(0)
  const active = useRef(open); active.current = open
  const editable = useRef(canEdit); editable.current = canEdit
  const actor = useRef(admin?.id); actor.current = admin?.id
  const serverFields = useRef(new Set<SettingsField>())
  const reloadDialog = useRef<ReturnType<typeof Modal.confirm> | null>(null)
  const body = useRef<HTMLDivElement>(null)
  const { ensureReauthenticated, reauthDialog } = useReauthentication({ description: '修改银行收款设置需要验证当前超级管理员身份，请输入当前登录账号的密码。' })
  const refreshErrors = () => setInvalid(form.getFieldsError().filter(field => field.errors.length).map(field => field.name[0] as SettingsField))
  function locate(field?: SettingsField) {
    requestAnimationFrame(() => {
      if (!active.current) return
      if (field) { form.scrollToField(field, { behavior: 'smooth', block: 'center' }); form.getFieldInstance(field)?.focus?.({ preventScroll: true }) }
      else body.current?.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }
  const load = useCallback(async () => {
    if (!canRead) return
    const request = ++sequence.current
    setLoading(true); setReady(false); setLoadError(false)
    try {
      const data = await offlinePaymentService.settings()
      if (request !== sequence.current || !active.current) return
      form.resetFields(); form.setFieldsValue({ ...SETTINGS_DEFAULTS, ...data })
      serverFields.current.clear(); setInvalid([]); setSummary([]); setContactError(''); setConflict(false); setReady(true)
    } catch {
      if (request === sequence.current && active.current) setLoadError(true)
    } finally { if (request === sequence.current) setLoading(false) }
  }, [canRead, form])
  useEffect(() => {
    form.resetFields(); setReady(false); setSummary([]); setInvalid([]); setContactError(''); setConflict(false); setLoadError(false)
    if (open && canRead) void load()
    return () => { sequence.current++; reloadDialog.current?.destroy() }
  }, [open, canRead, admin?.id, form, load])

  function reload() {
    if (loading || saving) return
    reloadDialog.current = Modal.confirm({ title: '重新载入收款设置', content: '重新载入会替换当前未保存的内容，请载入后重新核对。', okText: '重新载入', cancelText: '保留当前内容', onOk: load })
  }
  async function save() {
    if (!canEdit || !ready || loading || lock.current) return
    if (conflict) { locate(); return }
    lock.current = true
    const request = sequence.current, adminId = actor.current
    const current = () => request === sequence.current && active.current && editable.current && actor.current === adminId
    try {
      let values: PaymentSettings
      try { values = prepareSettings(await form.validateFields()) }
      catch (reason) {
        const fields = (reason as { errorFields?: { name: SettingsField[] }[] }).errorFields
        if (fields?.length) { refreshErrors(); locate(fields[0].name[0]) }
        return
      }
      if (!current()) return
      setSaving(true); setSummary([]); setContactError('')
      const token = await ensureReauthenticated()
      if (!token || !current()) return
      await offlinePaymentService.saveSettings(values, token)
      if (current()) { message.success('银行收款设置已保存'); onClose() }
    } catch (reason) {
      if (!current()) return
      if (isApiError(reason) && reason.status === 409) {
        setConflict(true); setSummary(['设置已被其他管理员修改，请重新载入后核对']); locate()
      } else if (isApiError(reason) && reason.status === 422) {
        const mapped = settingsServerErrors(reason.fields)
        const entries = Object.entries(mapped.errors) as [SettingsField, string[]][]
        form.setFields(entries.map(([name, errors]) => ({ name, errors })))
        serverFields.current = new Set(entries.map(([name]) => name))
        const rootContact = mapped.contact || (!reason.fields.length && /电话|微信|联系方式/.test(reason.message) ? CONTACT_ERROR : '')
        setContactError(rootContact)
        setSummary(mapped.summary.length ? mapped.summary : !entries.length && !rootContact ? ['收款设置校验未通过，请核对填写内容后重试'] : [])
        refreshErrors(); locate(entries[0]?.[0] || (rootContact ? 'contact_phone' : undefined))
      } else if (isApiError(reason) && reason.status === 403) {
        clearReauthCredential(); setSummary(['身份验证凭据失效或无修改权限，请重新验证后重试']); locate()
      } else {
        setSummary([isApiError(reason) && reason.status === 401 ? '登录已失效，请重新登录后重试' : '银行收款设置保存失败，请检查网络或稍后重试，当前输入已保留']); locate()
      }
    } finally { lock.current = false; if (active.current) setSaving(false) }
  }
  const disabled = !canEdit || !ready || loading || saving
  const contactRule = { validator: () => trimmed(form.getFieldValue('contact_phone')) || trimmed(form.getFieldValue('contact_wechat')) ? Promise.resolve() : Promise.reject(new Error(CONTACT_ERROR)) }
  const textField = (name: keyof typeof SETTINGS_LIMITS, placeholder: string, required = false) => <Form.Item name={name} label={SETTINGS_LABELS[name]} required={required} rules={settingsRules(name)}><Input placeholder={placeholder} maxLength={SETTINGS_LIMITS[name]} /></Form.Item>
  return <><Modal title='银行收款设置' open={open} width={760} style={{ maxWidth: 'calc(100vw - 32px)' }} centered
    onCancel={() => { if (!saving) onClose() }} maskClosable={!saving} closable={!saving} destroyOnClose
    footer={canEdit ? <div className={styles.footer}>
      {!!(invalid.length || contactError) && <Space size={4} wrap role='alert'><Typography.Text type='danger'>有{invalid.length + (contactError ? 1 : 0)}项内容需要修改。</Typography.Text><Button type='link' size='small' onClick={() => locate(invalid[0] || 'contact_phone')}>定位第一项</Button></Space>}
      <Space className={styles.actions}><Button disabled={saving} onClick={onClose}>取消</Button><Button type='primary' loading={saving} disabled={!ready || loading} onClick={() => void save()}>保存设置</Button></Space>
    </div> : <Button onClick={onClose}>关闭</Button>}>
    <div ref={body} className={styles.body} aria-busy={loading || saving}>
      <div className={styles.intro}><Typography.Paragraph>用于 H3C、NISP、人社等认证的线下付款。</Typography.Paragraph><Typography.Text type='secondary'>修改后用于新创建订单，已有订单保留创建时的收款信息和期限快照。联系方式为全局默认值，批次配置了联系人姓名、电话时，用户订单优先使用批次信息。</Typography.Text></div>
      {!canRead && <Alert type='warning' message='暂无收款设置查看权限' />}
      {canRead && !canEdit && <Typography.Paragraph type='secondary'>当前仅可查看，修改银行收款设置需要超级管理员完成身份验证。</Typography.Paragraph>}
      {loading && <Typography.Paragraph role='status'>正在加载收款设置…</Typography.Paragraph>}
      {loadError && <Alert className={styles.summary} type='error' message='收款设置加载失败' action={<Button onClick={() => void load()}>重新加载</Button>} />}
      {!!summary.length && <Alert className={styles.summary} type='error' message='收款设置未保存' description={<Space direction='vertical'>{summary.map((item, i) => <span key={i}>{item}</span>)}{conflict && <Button disabled={saving || loading} onClick={reload}>重新载入</Button>}</Space>} />}
      {canRead && <Form name='offline-payment-settings' layout='vertical' form={form} disabled={disabled} initialValues={SETTINGS_DEFAULTS}
        onFieldsChange={refreshErrors} onValuesChange={changed => {
          for (const field of Object.keys(changed) as SettingsField[]) if (serverFields.current.delete(field)) form.setFields([{ name: field, errors: [] }])
          if (('contact_phone' in changed || 'contact_wechat' in changed) && (trimmed(form.getFieldValue('contact_phone')) || trimmed(form.getFieldValue('contact_wechat')))) setContactError('')
          refreshErrors()
        }}>
        <Form.Item name='version' hidden><InputNumber /></Form.Item>
        <section className={styles.section} aria-labelledby='account-heading'><h3 id='account-heading'>收款账户</h3>
          {textField('account_name', '请输入银行账户对应的完整户名', true)}
          {textField('bank_name', '请输入完整开户银行及支行名称', true)}
          <Form.Item name='account_number' label='银行账号' required rules={settingsRules('account_number')} extra='请填写完整账号，不包含空格或横杠。仅去除首尾空白。'><Input placeholder='请输入8～40位数字账号' inputMode='numeric' autoComplete='off' /></Form.Item>
          <Form.Item name='transfer_note' label='转账备注说明' rules={settingsRules('transfer_note')}><Input.TextArea rows={2} maxLength={500} showCount placeholder='转账请备注订单号' /></Form.Item>
        </section>
        <section className={styles.section} aria-labelledby='contact-heading'><h3 id='contact-heading'>管理员联系方式</h3>
          <div className={styles.columns}>{textField('contact_name', '请输入管理员姓名', true)}{textField('service_hours', '例如：工作日 9:00—18:00')}</div>
          <div className={styles.columns}>
            <Form.Item name='contact_phone' label='联系电话' dependencies={['contact_wechat']} rules={[...settingsRules('contact_phone'), contactRule]}><Input maxLength={32} placeholder='支持手机号、座机等联系电话' /></Form.Item>
            <Form.Item name='contact_wechat' label='联系微信' dependencies={['contact_phone']} rules={[...settingsRules('contact_wechat'), contactRule]}><Input maxLength={64} placeholder='请输入联系微信' /></Form.Item>
          </div>
          <p className={styles.help}>电话和微信至少填写一项。</p>
          {contactError && <Typography.Paragraph type='danger' role='alert'>{contactError}</Typography.Paragraph>}
        </section>
        <section className={styles.section} aria-labelledby='deadline-heading'><h3 id='deadline-heading'>凭证提交期限</h3>
          <div className={styles.columns}>
            <Form.Item name='submit_hours' label='首次凭证提交期限（小时）' rules={settingsRules('submit_hours')} extra='最长7天。从订单创建时起计算，实际截止时间还受报名批次截止时间限制。'><InputNumber min={1} max={168} step={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name='correction_hours' label='默认凭证补交期限（小时）' rules={settingsRules('correction_hours')} extra='最长14天。管理员驳回转账凭证时使用的默认期限，单次处理可以另行指定。'><InputNumber min={1} max={336} step={1} style={{ width: '100%' }} /></Form.Item>
          </div><p className={styles.help}>此处设置转账凭证期限，不影响报名材料补正期限。</p>
        </section>
      </Form>}
    </div>
  </Modal>{reauthDialog}</>
}
