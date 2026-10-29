import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import OfflinePaymentAuditTrail from '@/pages/orders/components/OfflinePaymentAuditTrail'
import type { PaymentAudit } from '@/services/offlinePayment'

afterEach(cleanup)
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) })
})
const audit = (summary: PaymentAudit['summary'], action = 'admin.confirm'): PaymentAudit => ({
  action, actor_id: 1, created_at: '2026-10-28T17:35:02Z', summary,
})

describe('reconciliation audit evidence', () => {
  it('shows the reason and labeled amount comparison independently from the administrator note', () => {
    render(<OfflinePaymentAuditTrail audits={[audit({ version: 1, result: 'exception',
      reason_code: 'amount_mismatch', reason: '实际到账金额与应付金额不一致', note: '1',
      expected_amount_cents: 1111100, amount_cents: 111100, bank_reference: 'BANK-1', bank_time: '2026-10-28T16:00:00Z' })]} />)
    expect(screen.getByText('确认到账未通过')).toBeTruthy()
    expect(screen.getByText('到账金额不符')).toBeTruthy()
    expect(screen.getByText('实际到账金额与应付金额不一致')).toBeTruthy()
    expect(screen.getByText('当次应付金额')).toBeTruthy()
    expect(screen.getByText('¥11111.00')).toBeTruthy()
    expect(screen.getByText('¥1111.00')).toBeTruthy()
    expect(screen.getByText('少到账 ¥10000.00')).toBeTruthy()
    expect(screen.getByText('银行流水标识')).toBeTruthy()
    expect(screen.getByText('管理员备注')).toBeTruthy()
    expect(screen.getByText('2026-10-29 00:00:00')).toBeTruthy()
    expect(screen.getByText(/2026-10-29 01:35:02/)).toBeTruthy()
  })

  it('handles overpayment and zero expected amount without hiding the difference', () => {
    render(<OfflinePaymentAuditTrail audits={[audit({ result: 'exception', expected_amount_cents: 0,
      amount_cents: 100, reason_code: 'amount_mismatch', reason: '实际到账金额与应付金额不一致' })]} />)
    expect(screen.getByText('¥0.00')).toBeTruthy()
    expect(screen.getByText('多到账 ¥1.00')).toBeTruthy()
    expect(screen.queryByText(/第 undefined 版/)).toBeNull()
  })

  it('does not fabricate reasons or an expected amount for old confirmation records', () => {
    render(<OfflinePaymentAuditTrail audits={[audit({ version: 1, result: 'exception', amount_cents: 1111100, note: '1' })]} />)
    expect(screen.getByText(/该历史记录未保存具体异常原因/)).toBeTruthy()
    expect(screen.queryByText('到账金额不符')).toBeNull()
    expect(screen.queryByText('当次应付金额')).toBeNull()
    expect(screen.queryByText('金额差额')).toBeNull()
  })

  it.each(['admin.return', 'admin.exception'])('uses the recorded manual reason on legacy %s decisions', action => {
    render(<OfflinePaymentAuditTrail audits={[audit({ version: 1, result: action === 'admin.return' ? 'returned' : 'exception', note: '回单缺少银行盖章' }, action)]} />)
    expect(screen.getAllByText('回单缺少银行盖章').length).toBeGreaterThan(0)
    expect(screen.queryByText(/该历史记录未保存具体异常原因/)).toBeNull()
  })

  it('shows newest first without mutating records or copying a later reason into an older one', () => {
    const records = [audit({ result: 'exception', note: '最早备注' }), audit({ result: 'confirmed', note: '最新备注' })]
    render(<OfflinePaymentAuditTrail audits={records} />)
    const items = document.querySelectorAll('.ant-timeline-item')
    expect(within(items[0] as HTMLElement).getByText('最新备注')).toBeTruthy()
    expect(within(items[1] as HTMLElement).getByText(/该历史记录未保存具体异常原因/)).toBeTruthy()
    expect(within(items[0] as HTMLElement).queryByText('确认到账未通过')).toBeNull()
    expect(records[0].summary.note).toBe('最早备注')
  })

  it('does not compare refunds to order prices or confuse refunds with incoming payments', () => {
    render(<OfflinePaymentAuditTrail audits={[audit({ version: 1, amount_cents: 10000, expected_amount_cents: 20000, note: '已退款' }, 'admin.refund')]} />)
    expect(screen.getByText('实际退款金额')).toBeTruthy()
    expect(screen.queryByText('金额差额')).toBeNull()
    expect(screen.queryByText('当次应付金额')).toBeNull()
  })

  it('has an explicit empty state', () => {
    render(<OfflinePaymentAuditTrail audits={[]} />)
    expect(screen.getByText('暂无核账操作记录')).toBeTruthy()
  })
})
