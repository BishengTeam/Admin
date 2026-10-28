import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { ACTUAL_AMOUNT_ERROR, actualBankTimeError, bankTimeFromPicker, bankTimeToPicker, decisionServerErrors, validActualAmount } from '@/utils/offlineDecision'

describe('actual bank time', () => {
  it('accepts the backend five-minute tolerance and rejects the first millisecond beyond it', () => {
    const now = Date.parse('2026-10-29T04:00:00Z')
    expect(actualBankTimeError(dayjs(now), '银行实际到账时间', now)).toBeNull()
    expect(actualBankTimeError(dayjs(now + 300000), '银行实际到账时间', now)).toBeNull()
    expect(actualBankTimeError(dayjs(now + 300001), '银行实际到账时间', now)).toMatch(/不能晚于当前时间/)
    expect(actualBankTimeError(dayjs('invalid'), '实际退回时间', now)).toBe('请选择有效的实际退回时间')
  })

  it.each(['Asia/Shanghai', 'UTC', 'America/Los_Angeles'])('keeps the selected Beijing civil time stable in browser timezone %s', zone => {
    const previous = process.env.TZ
    process.env.TZ = zone
    try {
      const selected = dayjs('2026-10-30T00:00:00')
      const epochBefore = selected.valueOf()
      const actual = bankTimeFromPicker(selected)!
      expect(actual.toISOString()).toBe('2026-10-29T16:00:00.000Z')
      expect(bankTimeToPicker(actual)!.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-10-30 00:00:00')
      expect(selected.valueOf()).toBe(epochBefore)
    } finally {
      if (previous === undefined) delete process.env.TZ
      else process.env.TZ = previous
    }
  })
})

it.each([0.01, 1, 1111, 21474836.47])('accepts actual amount %s without changing it', value => {
  expect(validActualAmount(value)).toBe(true)
})
it.each([0, -1, 1.001, 21474836.48, Infinity, NaN, '1', null, undefined])('rejects invalid actual amount %s', value => {
  expect(validActualAmount(value)).toBe(false)
})

it('maps schema fields to form fields with understandable field-specific messages', () => {
  const mapped = decisionServerErrors([
    { field: 'amount_cents', reason: 'Input should be a valid integer' },
    { loc: ['body', 'bank_time'], msg: 'Value error, 转账时间不能晚于当前时间' },
    { field: 'refund_bank_time', reason: 'Value error, 转账时间不能晚于当前时间' },
    { field: 'deadline', reason: 'Input should have timezone info' },
    { field: 'note', reason: 'Field required' },
    { field: 'bank_reference', reason: 'String should have at least 1 character' },
    { field: 'refund_bank_reference', reason: 'Field required' },
  ], 'refund')
  expect(mapped.errors.amount).toEqual([ACTUAL_AMOUNT_ERROR])
  expect(mapped.errors.bank_time).toEqual(['银行实际退款时间不能晚于当前时间，请以银行流水实际时间为准'])
  expect(mapped.errors.refund_bank_time?.[0]).toMatch(/^实际退回时间不能晚于/)
  expect(mapped.errors.deadline).toEqual(['请设置有效且晚于当前时间的补交截止时间'])
  expect(mapped.errors.note?.[0]).toContain('处理备注')
  expect(mapped.errors.bank_reference?.[0]).toContain('核实后的银行流水标识')
  expect(mapped.errors.refund_bank_reference?.[0]).toContain('核实后的退款流水')
})

it('keeps version, attachment and unknown contract errors visible in the summary', () => {
  const mapped = decisionServerErrors([
    { field: 'expected_version', reason: 'Input should be greater than 0' },
    { field: 'material_ids.0', reason: 'Input should be a valid integer' },
    { field: 'new_server_field', reason: 'unknown validation' },
  ], 'confirm')
  expect(mapped.summary).toEqual([
    '凭证版本无效，请刷新核账状态后重新进入处理窗口',
    '退款凭证未通过校验，请核对附件后重新上传',
    '其他提交信息未通过校验，请刷新核账状态或联系管理员',
  ])
})
