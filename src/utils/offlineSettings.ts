import type { Rule } from 'antd/es/form'
import type { ApiFieldError } from '@/core/request'
import type { PaymentSettings } from '@/services/offlinePayment'

export const SETTINGS_DEFAULTS: PaymentSettings = {
  account_name: '', bank_name: '', account_number: '', transfer_note: '转账请备注订单号',
  contact_name: '', contact_phone: '', contact_wechat: '', service_hours: '',
  submit_hours: 24, correction_hours: 48, version: 0,
}
export const SETTINGS_LABELS = {
  account_name: '收款户名', bank_name: '开户行', account_number: '银行账号', transfer_note: '转账备注说明',
  contact_name: '管理员姓名', contact_phone: '联系电话', contact_wechat: '联系微信', service_hours: '服务时间',
  submit_hours: '首次凭证提交期限', correction_hours: '默认凭证补交期限', version: '配置版本',
} satisfies Record<keyof PaymentSettings, string>
export type SettingsField = keyof PaymentSettings
export const CONTACT_ERROR = '联系电话和联系微信至少填写一项'
export const ACCOUNT_ERROR = '银行账号须为8～40位数字，不能包含空格或横杠'
export const SETTINGS_LIMITS = { account_name: 128, bank_name: 128, transfer_note: 500, contact_name: 128, contact_phone: 32, contact_wechat: 64, service_hours: 128 } as const
export const trimmed = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export function settingsRules(field: SettingsField): Rule[] {
  if (field === 'submit_hours' || field === 'correction_hours') {
    const maximum = field === 'submit_hours' ? 168 : 336
    return [{ validator: (_, value) => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= maximum
      ? Promise.resolve() : Promise.reject(new Error(`请输入1～${maximum}之间的整数`)) }]
  }
  if (field === 'account_number') return [{ transform: trimmed, pattern: /^[0-9]{8,40}$/, required: true, message: ACCOUNT_ERROR }]
  const rules: Rule[] = []
  if (['account_name', 'bank_name', 'contact_name'].includes(field)) rules.push({ required: true, whitespace: true, transform: trimmed, message: `请填写${SETTINGS_LABELS[field]}` })
  if (field in SETTINGS_LIMITS) rules.push({ type: 'string', max: SETTINGS_LIMITS[field as keyof typeof SETTINGS_LIMITS], message: `${SETTINGS_LABELS[field]}不能超过${SETTINGS_LIMITS[field as keyof typeof SETTINGS_LIMITS]}字符` })
  return rules
}
export function prepareSettings(values: PaymentSettings): PaymentSettings {
  // Never parse the account as a number or remove internal whitespace.
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])) as unknown as PaymentSettings
}

export function settingsServerErrors(fields: ApiFieldError[]) {
  const errors: Partial<Record<SettingsField, string[]>> = {}
  const summary: string[] = []
  let contact = ''
  for (const item of fields) {
    const path = item.field || item.loc?.filter(part => !['body', 'query', 'path'].includes(String(part))).join('.') || ''
    const reason = item.reason || item.msg || item.message || ''
    if (path && Object.prototype.hasOwnProperty.call(SETTINGS_LABELS, path)) {
      const field = path as SettingsField
      const maximum = field === 'submit_hours' ? 168 : 336
      const text = field === 'account_number' ? ACCOUNT_ERROR
        : field === 'submit_hours' || field === 'correction_hours' ? `请输入1～${maximum}之间的整数`
        : field === 'version' ? '配置版本无效，请重新载入后核对'
        : /[\u3400-\u9fff]/.test(reason) ? reason.replace(/^Value error,\s*/, '')
        : `${SETTINGS_LABELS[field]}填写不符合要求${field in SETTINGS_LIMITS ? `，最多${SETTINGS_LIMITS[field as keyof typeof SETTINGS_LIMITS]}字符` : ''}`
      errors[field] = [...(errors[field] || []), text]
    } else if (!path && /电话|微信|联系方式/.test(reason)) contact = CONTACT_ERROR
    else summary.push(`${path ? `字段「${path}」：` : ''}${/[\u3400-\u9fff]/.test(reason) ? reason.replace(/^Value error,\s*/, '') : '服务端校验未通过，请核对或联系管理员'}`)
  }
  return { errors, summary, contact }
}
