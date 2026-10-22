import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import OfflinePaymentSection from '@/pages/orders/components/OfflinePaymentSection'

const state = vi.hoisted(() => ({ permissions: ['order:list'], detail: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ permissions: state.permissions }) }))
vi.mock('@/hooks/useReauthentication', () => ({ useReauthentication: () => ({ ensureReauthenticated: vi.fn(), reauthDialog: null }) }))
vi.mock('@/services/offlinePayment', async importOriginal => ({ ...await importOriginal<typeof import('@/services/offlinePayment')>(), offlinePaymentService: { detail: state.detail } }))

const payment = {
  order_id: 12, order_status: 'pending', amount_cents: 10000, current_version: 1, status: 'under_review', status_label: '待核账', out_trade_no: 'OF-12',
  account: { account_name: '测试收款公司', bank_name: '测试银行', account_number: '6222000011112222' },
  deadline: null, message: null, materials: [], entries: [], audits: [], submissions: [],
}
describe('offline payment evidence permissions', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) })
    state.permissions = ['order:list']; state.detail.mockReset(); state.detail.mockResolvedValue(payment)
  })
  afterEach(cleanup)
  it('order-list permission does not fetch or expose financial evidence', () => {
    render(<OfflinePaymentSection orderId={12} />)
    expect(screen.getByText('线下凭证需要独立查看权限。')).toBeTruthy()
    expect(state.detail).not.toHaveBeenCalled()
    expect(screen.queryByText('确认到账')).toBeNull()
  })
  it('view-only finance access can inspect the snapshot but cannot confirm or return funds', async () => {
    state.permissions = ['offline:view']
    render(<OfflinePaymentSection orderId={12} />)
    expect(await screen.findByText('测试收款公司')).toBeTruthy()
    expect(screen.queryByText('确认到账')).toBeNull()
    expect(screen.queryByText('驳回补交')).toBeNull()
  })
  it('the finance confirmation action is distinct from certification approval', async () => {
    state.permissions = ['offline:view', 'offline:confirm']
    render(<OfflinePaymentSection orderId={12} />)
    expect(await screen.findByText('确认到账')).toBeTruthy()
    expect(screen.queryByText('审核通过')).toBeNull()
  })
})
