import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OrderList from '@/pages/orders'

const state = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ permissions: ['*'] }) }))
vi.mock('@/services/orders', () => ({ orderService: { list: state.list } }))
vi.mock('@/services/offlinePayment', async original => ({
  ...await original<typeof import('@/services/offlinePayment')>(),
  offlinePaymentService: { summary: async () => ({ counts: { under_review: 2 }, batches: [], products: [] }) },
}))
vi.mock('@/pages/orders/components/OrderDetailDrawer', () => ({ default: () => null }))
vi.mock('@/pages/orders/components/OfflineSettingsModal', () => ({ default: () => null }))
vi.mock('@/pages/orders/components/ReconciliationModal', () => ({ default: () => null }))

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
  state.list.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 })
})
afterEach(cleanup)

it('quick finance filter clears conflicting status and search and selects the all tab', async () => {
  render(<MemoryRouter><OrderList /></MemoryRouter>)
  fireEvent.click(screen.getByRole('tab', { name: '已支付' }))
  const search = screen.getByPlaceholderText('订单号 / 姓名 / 手机 / 银行流水')
  fireEvent.change(search, { target: { value: 'no-match' } })
  fireEvent.click(screen.getByRole('button', { name: '查 询' }))
  await waitFor(() => expect(state.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'paid', keyword: 'no-match' })))
  fireEvent.click(await screen.findByRole('button', { name: /待核账（2）/ }))
  await waitFor(() => expect(state.list).toHaveBeenLastCalledWith({ payment_channel: 'bank_transfer', offline_status: 'under_review', page: 1, page_size: 20 }))
  expect(screen.getByRole('tab', { name: '全部' })).toHaveAttribute('aria-selected', 'true')
  expect(search).toHaveValue('')
})
