import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/core/request', () => ({ http }))

describe('offline financial API boundary', () => {
  beforeEach(() => { vi.clearAllMocks() })
  it('sends the current version, idempotency key and reauthentication credential when confirming', async () => {
    const { offlinePaymentService } = await import('@/services/offlinePayment')
    const body = { expected_version: 2, request_key: 'stable-key', amount_cents: 12345, bank_reference: 'BANK-123', note: '已核实' }
    await offlinePaymentService.decide(12, 'confirm', body, 'reauth-token')
    expect(http.post).toHaveBeenCalledWith('/admin/orders/12/offline-payment/confirm', body, { headers: { 'X-Reauth-Token': 'reauth-token' } })
  })
  it('loads financial evidence through authorized content endpoints', async () => {
    const { offlinePaymentService } = await import('@/services/offlinePayment')
    await offlinePaymentService.content(12, 45)
    expect(http.get).toHaveBeenCalledWith('/admin/orders/12/offline-payment/materials/45/content', { responseType: 'blob' })
  })
  it('preserves receiving-account optimistic version and uses independent settings reauthentication', async () => {
    const { offlinePaymentService } = await import('@/services/offlinePayment')
    const settings = { account_name: '测试户名', account_number: '622200001111', bank_name: '测试银行', contact_name: '测试联系人', contact_phone: '13800000000', contact_wechat: '', service_hours: '', transfer_note: '订单号', version: 3, submit_hours: 24, correction_hours: 48 }
    await offlinePaymentService.saveSettings(settings, 'reauth-settings')
    expect(http.put).toHaveBeenCalledWith('/admin/orders/offline-payment-settings', settings, { headers: { 'X-Reauth-Token': 'reauth-settings' } })
  })
})
