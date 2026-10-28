import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type { ApiFieldError } from '@/core/request'

dayjs.extend(utc)

export const BANK_TIME_TOLERANCE_MS = 5 * 60 * 1000
export const ACTUAL_AMOUNT_ERROR = '请填写大于0、最多两位小数的实际金额，最高21474836.47元'
export type OfflineDecisionAction = 'confirm' | 'return' | 'exception' | 'refund' | 'resolve' | 'refund-approval'
export type OfflineDecisionField = 'amount' | 'bank_time' | 'bank_reference' | 'note' | 'deadline' | 'refund_bank_time' | 'refund_bank_reference'

export function decisionFieldLabels(action: OfflineDecisionAction | null) {
  return { amount: action === 'refund' ? '实际退款金额' : '实际到账金额',
    bank_time: action === 'refund' ? '银行实际退款时间' : '银行实际到账时间',
    bank_reference: '核实后的银行流水标识', note: '处理备注', deadline: '补交截止时间',
    refund_bank_time: '实际退回时间', refund_bank_reference: '核实后的退款流水' } satisfies Record<OfflineDecisionField, string>
}

export function validActualAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    && /^\d+(?:\.\d{1,2})?$/.test(String(value)) && Math.round(value * 100) <= 2147483647
}

export function actualBankTimeError(value: Dayjs | null | undefined, label: string, now = Date.now()): string | null {
  if (value == null) return null // The required-field rule owns empty input.
  if (!dayjs.isDayjs(value) || !value.isValid()) return `请选择有效的${label}`
  return value.valueOf() > now + BANK_TIME_TOLERANCE_MS ? `${label}不能晚于当前时间，请以银行流水实际时间为准` : null
}

/** Keep the selected civil time explicitly in Beijing, regardless of the browser timezone. */
export function bankTimeToPicker(value?: Dayjs | null): Dayjs | undefined {
  return value?.isValid() ? dayjs(value.valueOf()).utcOffset(480) : undefined
}
export function bankTimeFromPicker(value?: Dayjs | null): Dayjs | undefined {
  return value?.isValid() ? dayjs(`${value.format('YYYY-MM-DDTHH:mm:ss')}+08:00`) : undefined
}

export function decisionServerErrors(fields: ApiFieldError[], action: OfflineDecisionAction | null) {
  const labels = decisionFieldLabels(action)
  const errors: Partial<Record<OfflineDecisionField, string[]>> = {}
  const summary: string[] = []
  for (const item of fields) {
    const path = item.field || item.loc?.filter(part => !['body', 'query', 'path'].includes(String(part))).join('.') || ''
    const reason = (item.reason || item.msg || item.message || '').replace(/^Value error,\s*/, '')
    const field = path === 'amount_cents' ? 'amount' : path
    if (Object.prototype.hasOwnProperty.call(labels, field)) {
      const name = field as OfflineDecisionField
      const text = name === 'amount' ? ACTUAL_AMOUNT_ERROR
        : ['bank_time', 'refund_bank_time'].includes(name) ? /不能晚于|future|当前时间/i.test(reason)
          ? `${labels[name]}不能晚于当前时间，请以银行流水实际时间为准` : `请重新选择有效的${labels[name]}`
          : name === 'deadline' ? '请设置有效且晚于当前时间的补交截止时间'
            : /[\u3400-\u9fff]/.test(reason) ? reason : `请核对${labels[name]}，此项必填且不能超过${name === 'note' ? 1000 : 128}字符`
      errors[name] = [...(errors[name] || []), text]
    } else if (path === 'expected_version') summary.push('凭证版本无效，请刷新核账状态后重新进入处理窗口')
    else if (path === 'request_key') summary.push('操作标识无效，请关闭后重新打开处理窗口')
    else if (path.startsWith('material_ids')) summary.push('退款凭证未通过校验，请核对附件后重新上传')
    else if (['refund_kind', 'refund_id'].includes(path)) summary.push('退款业务关联无效，请重新进入对应退款记录后处理')
    else summary.push(/[\u3400-\u9fff]/.test(reason) ? reason : '其他提交信息未通过校验，请刷新核账状态或联系管理员')
  }
  return { errors, summary }
}
