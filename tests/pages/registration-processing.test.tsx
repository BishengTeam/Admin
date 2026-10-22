import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import RegistrationProcessingDrawer from '@/pages/certification/components/shared/RegistrationProcessingDrawer'

vi.mock('@/pages/orders/components/OfflinePaymentSection', () => ({ default: ({ onChanged }: { onChanged: () => Promise<void> }) => <button onClick={() => { void onChanged().catch(() => {}) }}>模拟核账完成</button> }))
const pending = { order_id: 1, payment_channel: 'bank_transfer', order_status: 'pending', offline_status: 'under_review', review_payment_allowed: false, review_block_reason: '付款尚未确认' }
const paid = { ...pending, order_status: 'paid', offline_status: 'confirmed', review_payment_allowed: true, review_block_reason: null }
const props = { open: true, onClose: () => {}, registrationNo: 'TEST-1', status: '待初审', footer: <button>初审通过</button>, children: <div>报名材料内容</div> }
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(cleanup)

it('pending payment cannot reveal the review area or its operations', () => {
  render(<RegistrationProcessingDrawer {...props} payment={pending} onRefresh={async () => {}} />)
  expect(screen.queryByText('报名材料内容')).toBeNull()
  expect(screen.queryByRole('button', { name: '初审通过' })).toBeNull()
  expect(screen.getByRole('tab', { name: '② 报名审核' })).toHaveAttribute('aria-disabled', 'true')
})

it('only a refreshed backend payment summary unlocks review, without submitting approval', async () => {
  const refresh = vi.fn(async () => {})
  const view = render(<RegistrationProcessingDrawer {...props} payment={pending} onRefresh={refresh} />)
  fireEvent.click(screen.getByText('模拟核账完成'))
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  expect(screen.queryByText('报名材料内容')).toBeNull()
  view.rerender(<RegistrationProcessingDrawer {...props} payment={paid} onRefresh={refresh} />)
  expect(await screen.findByText('报名材料内容')).toBeTruthy()
  expect(screen.getByRole('button', { name: '初审通过' })).toBeTruthy()
})

it('post-payment refresh failure locks review until a successful retry', async () => {
  const refresh = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined)
  render(<RegistrationProcessingDrawer {...props} payment={paid} onRefresh={refresh} />)
  fireEvent.click(screen.getByRole('tab', { name: '① 核账' }))
  fireEvent.click(screen.getByText('模拟核账完成'))
  expect(await screen.findByText('核账已完成，报名状态刷新失败，请重试')).toBeTruthy()
  expect(screen.queryByRole('button', { name: '初审通过' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '刷 新' }))
  await waitFor(() => expect(screen.queryByText('核账已完成，报名状态刷新失败，请重试')).toBeNull())
  fireEvent.click(screen.getByRole('tab', { name: '② 报名审核' }))
  expect(await screen.findByRole('button', { name: '初审通过' })).toBeTruthy()
})

it('free and historical WeChat payments do not request bank evidence', async () => {
  const view = render(<RegistrationProcessingDrawer {...props} payment={{ ...paid, payment_channel: 'free' }} onRefresh={async () => {}} />)
  fireEvent.click(screen.getByRole('tab', { name: '① 核账' }))
  expect(await screen.findByText('零元报名已由系统确认，无需转账凭证')).toBeTruthy()
  expect(screen.queryByText('模拟核账完成')).toBeNull()
  view.rerender(<RegistrationProcessingDrawer {...props} payment={{ ...paid, payment_channel: 'wechat' }} onRefresh={async () => {}} />)
  expect(await screen.findByText('历史微信付款已确认，无需银行转账凭证')).toBeTruthy()
})

it('switching to a new registration immediately removes the prior review content', async () => {
  const view = render(<RegistrationProcessingDrawer {...props} payment={paid} onRefresh={async () => {}} />)
  expect(await screen.findByText('报名材料内容')).toBeTruthy()
  view.rerender(<RegistrationProcessingDrawer {...props} registrationNo='TEST-2' payment={null} loading onRefresh={async () => {}} />)
  expect(screen.queryByText('报名材料内容')).toBeNull()
  expect(screen.queryByRole('button', { name: '初审通过' })).toBeNull()
})
