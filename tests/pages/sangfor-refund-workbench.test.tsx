import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { message } from 'antd'
import { RefundWorkbench } from '@/components/RefundWorkbench'
import TypeWorkbench from '@/pages/certification/TypeWorkbench'
import type { RefundWorkbenchRecord } from '@/services/refundWorkbench'

const mocks = vi.hoisted(() => ({ list: vi.fn(), batchOptions: vi.fn(), permissions: ['order:list', 'offline:view', 'offline:refund'] }))
vi.mock('@/services/refundWorkbench', () => ({ refundWorkbenchService: { list: mocks.list, batchOptions: mocks.batchOptions } }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ admin: { role: 'certification_admin' }, permissions: mocks.permissions }) }))
vi.mock('@/hooks/useReauthentication', () => ({ useReauthentication: () => ({ ensureReauthenticated: vi.fn(), reauthDialog: null }) }))
vi.mock('@/components/PageContainer', () => ({ PageContainer: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/pages/orders/components/OfflinePaymentSection', () => ({ default: ({ orderId, mode, onChanged }: {
  orderId: number; mode: string; onChanged?: () => void | Promise<void>
}) => <div><span>账本订单 {orderId} · {mode}</span><button onClick={() => void onChanged?.()}>模拟实际退款登记完成</button></div> }))

const row: RefundWorkbenchRecord = {
  id: 7, registrationId: 7, orderId: 7, outTradeNo: 'SF-7', requestKind: 'normal', reasonCode: 'normal', reasonDetail: '审核不通过',
  amountCents: 7654, status: 'approved', requestedAt: '2026-10-27T01:00:00Z', approvedAt: '2026-10-27T01:00:00Z',
  outRefundNo: null, processingAt: null, succeededAt: null, lastError: null, retryCount: 0,
  candidateName: '退款考生', registrationNo: 'SF-7', batchId: 5, batchName: '测试批次', productLabel: 'SCSA-T', paymentChannel: 'bank_transfer',
}

function Location() { return <div data-testid='location'>{useLocation().pathname}</div> }
function setup(props: { embedded?: boolean; batchId?: number; registrationId?: number; onChanged?: () => void } = {}) {
  return render(<MemoryRouter initialEntries={['/admin/certification/sangfor']}><RefundWorkbench vendor='sangfor' {...props} /><Location /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.permissions = ['order:list', 'offline:view', 'offline:refund']
  mocks.list.mockResolvedValue({ items: [row], total: 1, page: 1, page_size: 20, status_counts: { approved: 1, exception: 2, succeeded: 3 } })
  mocks.batchOptions.mockResolvedValue([{ value: 5, label: '测试批次' }])
  vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as ReturnType<typeof message.error>)
  const native = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => native(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('starts with approved refunds and keeps abnormal transfers separate without inventing pending requests', async () => {
  setup()
  expect(await screen.findByText('退款考生')).toBeTruthy()
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith('sangfor', expect.objectContaining({ group: 'processing' })))
  expect(screen.getByRole('tab', { name: '待退款登记（1）' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: '异常来款（2）' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: '全部记录（6）' })).toBeTruthy()
  expect(screen.queryByRole('tab', { name: /^待处理/ })).toBeNull()
  expect(screen.getByText('¥76.54')).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', { name: '异常来款（2）' }))
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith('sangfor', expect.objectContaining({ group: 'abnormal', page: 1 })))
})

it('locks an embedded list to its batch and person while keeping the default full history', async () => {
  setup({ embedded: true, batchId: 5, registrationId: 7 })
  expect(await screen.findByText('退款考生')).toBeTruthy()
  expect(mocks.list).toHaveBeenCalledWith('sangfor', expect.objectContaining({ batch_id: 5, registration_id: 7, group: undefined }))
  expect(mocks.batchOptions).not.toHaveBeenCalled()
  expect(screen.queryByText('所属批次')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: '异常来款（2）' }))
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith('sangfor', expect.objectContaining({ batch_id: 5, registration_id: 7, group: 'abnormal' })))
})

it('lets finance-only staff open the existing ledger in place and refreshes after registration', async () => {
  const changed = vi.fn()
  setup({ embedded: true, batchId: 5, onChanged: changed })
  fireEvent.click(await screen.findByRole('button', { name: '登记线下退款' }))
  const drawer = (await screen.findByText('退款办理')).closest('[role="dialog"]') as HTMLElement
  expect(within(drawer).getByText('账本订单 7 · order')).toBeTruthy()
  expect(screen.getByTestId('location')).toHaveTextContent('/admin/certification/sangfor')
  const calls = mocks.list.mock.calls.length
  fireEvent.click(within(drawer).getByRole('button', { name: '模拟实际退款登记完成' }))
  await waitFor(() => expect(mocks.list.mock.calls.length).toBeGreaterThan(calls))
  expect(changed).toHaveBeenCalled()
})

it('uses exceptional transfer handling rather than normal refund registration', async () => {
  mocks.list.mockResolvedValue({ items: [{ ...row, requestKind: 'exception', status: 'exception', amountCents: 9900 }], total: 1, page: 1, page_size: 20 })
  setup({ embedded: true, batchId: 5 })
  expect(await screen.findByText('¥99.00')).toBeTruthy()
  expect(screen.queryByRole('button', { name: '登记线下退款' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '处理异常来款' }))
  expect((await screen.findByText('退款办理')).closest('[role="dialog"]')).toBeTruthy()
})

it('requires both ledger viewing and refund permissions for a refund action', async () => {
  mocks.permissions = ['order:list', 'offline:refund']
  setup()
  expect(await screen.findByText('退款考生')).toBeTruthy()
  expect(screen.queryByRole('button', { name: '登记线下退款' })).toBeNull()
  expect(screen.queryByRole('button', { name: '查看收退款' })).toBeNull()
  expect(screen.getByRole('button', { name: /详\s*情/ })).toBeTruthy()
})

it('gives a ledger viewer read-only access without presenting registration actions', async () => {
  mocks.permissions = ['order:list', 'offline:view']
  setup()
  expect(await screen.findByRole('button', { name: '查看收退款' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: '登记线下退款' })).toBeNull()
  expect(screen.queryByRole('button', { name: '处理异常来款' })).toBeNull()
})

it('shows an unknown exceptional transfer amount as unverified instead of zero or the order fee', async () => {
  mocks.list.mockResolvedValue({ items: [{ ...row, requestKind: 'exception', status: 'exception', amountCents: null, amountSource: 'unknown' }], total: 1, page: 1, page_size: 20 })
  setup({ embedded: true, batchId: 5 })
  expect(await screen.findByText('待核实')).toBeTruthy()
  expect(screen.queryByText('¥0.00')).toBeNull()
  expect(screen.queryByText('¥76.54')).toBeNull()
})

it('lands a finance-only administrator on refund management without requesting content-only pages', async () => {
  render(<MemoryRouter initialEntries={['/admin/certification/sangfor']}><TypeWorkbench type='sangfor' /></MemoryRouter>)
  expect(await screen.findByRole('tab', { name: '退款管理' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.queryByRole('tab', { name: '批次管理' })).toBeNull()
  expect(screen.queryByRole('tab', { name: '产品设置' })).toBeNull()
  expect(await screen.findByRole('button', { name: '登记线下退款' })).toBeTruthy()
})
