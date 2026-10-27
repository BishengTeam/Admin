import { beforeEach, expect, it, vi } from 'vitest'
import { http } from '@/core/request'
import { sangforService, type SangforRefund } from '@/services/sangfor'
import { refundWorkbenchService } from '@/services/refundWorkbench'

vi.mock('@/core/request', () => ({ http: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
beforeEach(() => { vi.clearAllMocks() })

const refund: SangforRefund = {
  id: 7, registration_id: 7, order_id: 7, batch_id: 5, batch_name: '深信服11月考试',
  product_label: '安全技术认证工程师', payment_channel: 'bank_transfer', out_trade_no: 'SF-7', registration_no: 'SF-7',
  candidate_name: '退款考生', request_kind: 'normal', status: 'approved', amount_cents: 7654,
  reason_detail: '报名资料不符合要求', requested_at: '2026-10-27T01:00:00Z', approved_at: '2026-10-27T01:00:00Z',
  succeeded_at: null, last_error: null,
}

it('uses the dedicated refund view and preserves batch, person, state and date filters', async () => {
  const filters = { batch_id: 5, registration_id: 7, group: 'abnormal', request_kind: 'exception', status: 'exception',
    keyword: 'SF-7', requested_at_start: '2026-10-01T00:00:00Z', requested_at_end: '2026-10-31T00:00:00Z', page: 2, page_size: 20 }
  await sangforService.refunds(filters)
  expect(http.get).toHaveBeenCalledWith('/admin/cert-products/sangfor/refunds', { params: filters })
})

it('keeps the financial amount and statistics from the backend instead of synthesizing a pending request', async () => {
  const page = { items: [refund], total: 1, page: 1, page_size: 20, status_counts: { approved: 1, exception: 2, succeeded: 3 } }
  vi.mocked(http.get).mockResolvedValue(page)
  const params = { batch_id: 5, group: 'processing' as const, page: 1, page_size: 20 }
  const result = await refundWorkbenchService.list('sangfor', params)
  expect(http.get).toHaveBeenCalledWith('/admin/cert-products/sangfor/refunds', { params })
  expect(result.status_counts).toEqual(page.status_counts)
  expect(result.items[0]).toMatchObject({ amountCents: 7654, status: 'approved', requestKind: 'normal',
    registrationId: 7, orderId: 7, approvedAt: refund.approved_at, reasonDetail: refund.reason_detail })
  expect(result.items[0].status).not.toBe('requested')
})

it('preserves exceptional transfer classification, actual amount and completed return time', () => {
  const exceptional: SangforRefund = { ...refund, request_kind: 'exception', status: 'exception', amount_cents: 9900,
    approved_at: null, last_error: '转账金额不符' }
  expect(refundWorkbenchService.normalize('sangfor', exceptional)).toMatchObject({
    requestKind: 'exception', status: 'exception', amountCents: 9900, lastError: '转账金额不符',
  })
  expect(refundWorkbenchService.normalize('sangfor', { ...exceptional, status: 'succeeded', succeeded_at: '2026-10-27T03:00:00Z' }))
    .toMatchObject({ requestKind: 'exception', status: 'succeeded', succeededAt: '2026-10-27T03:00:00Z' })
})

it('gets Sangfor batch options without querying a different certification vendor', async () => {
  vi.mocked(http.get).mockResolvedValue([{ id: 5, name: '深信服11月考试' }])
  expect(await refundWorkbenchService.batchOptions('sangfor')).toEqual([{ value: 5, label: '深信服11月考试' }])
  expect(http.get).toHaveBeenCalledWith('/admin/cert-products/sangfor/refund-batches')
})

it('keeps an unknown exceptional transfer amount nullable and preserves its evidence source', () => {
  expect(refundWorkbenchService.normalize('sangfor', { ...refund, request_kind: 'exception', status: 'exception', amount_cents: null, amount_source: 'unknown' }))
    .toMatchObject({ amountCents: null, amountSource: 'unknown', status: 'exception' })
})
