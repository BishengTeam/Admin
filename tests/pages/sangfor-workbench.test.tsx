import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { message } from 'antd'
import BatchWorkbench from '@/pages/certification/components/vendors/sangfor/BatchWorkbench'

const mocks = vi.hoisted(() => ({ batch: vi.fn(), registrations: vi.fn(), registration: vi.fn(), review: vi.fn(), reauth: vi.fn() }))
vi.mock('@/services/sangfor', async importOriginal => ({ ...await importOriginal<typeof import('@/services/sangfor')>(), sangforService: mocks }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/hooks/useReauthentication', () => ({ useReauthentication: () => ({ ensureReauthenticated: mocks.reauth, reauthDialog: null }) }))
vi.mock('@/components/PageContainer', () => ({ PageContainer: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/pages/orders/components/OfflinePaymentSection', () => ({ default: () => <div>现有银行核账组件</div> }))

const record = { id: 7, order_id: 7, batch_id: 5, registration_no: 'SF-7', revision: 3, current_version: 2, status: 'pending_review', order_status: 'paid', created_at: '2026-10-27T00:00:00Z',
  candidate_snapshot: { name: '实名考生', first_name: 'Xiaofu', last_name: 'Shen', exam_voucher_code: 'VENDOR-123' }, batch_snapshot: {},
  versions: [], reviews: [], exports: [], payment_summary: { order_id: 7, payment_channel: 'bank_transfer', order_status: 'paid', offline_status: 'confirmed', review_payment_allowed: true, review_block_reason: null } }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.batch.mockResolvedValue({ id: 5, name: '测试批次', exam_direction: '安全技术认证工程师 SCSA-T', price_cents: 12345 })
  mocks.registrations.mockResolvedValue({ items: [record], total: 1, page: 1, page_size: 20 })
  mocks.registration.mockResolvedValue(record)
  mocks.review.mockResolvedValue({ ...record, status: 'approved', revision: 4 })
  vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as ReturnType<typeof message.success>)
  vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as ReturnType<typeof message.error>)
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

async function open() {
  render(<MemoryRouter initialEntries={['/batches/5']}><Routes><Route path='/batches/:batchId' element={<BatchWorkbench />} /></Routes></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: '办理' }))
  await waitFor(() => expect(mocks.registration).toHaveBeenCalledWith(7))
}

it('uses the existing payment-first drawer and blocks review until receipt confirmation', async () => {
  mocks.registration.mockResolvedValue({ ...record, status: 'pending_payment', payment_summary: { ...record.payment_summary, review_payment_allowed: false } })
  await open()
  expect(await screen.findByText('现有银行核账组件')).toBeTruthy()
  expect(screen.getByRole('tab', { name: '② 报名审核' })).toHaveAttribute('aria-disabled', 'true')
  expect(screen.queryByRole('button', { name: '初审通过' })).toBeNull()
})

it('displays real pinyin and vendor voucher, then submits only a version-checked initial review', async () => {
  await open()
  expect(await screen.findByText('VENDOR-123')).toBeTruthy()
  expect(screen.getByText('Xiaofu')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '初审通过' }))
  fireEvent.click(screen.getByRole('button', { name: '保存审核结果' }))
  await waitFor(() => expect(mocks.review).toHaveBeenCalledWith(7, { action: 'approve', expected_revision: 3, reason: '', correction_due_at: null }))
  expect(screen.queryByRole('button', { name: '登记外审通过' })).toBeNull()
})

it('does not send an empty correction reason or omit the correction deadline', async () => {
  await open()
  fireEvent.click(await screen.findByRole('button', { name: '退回补正' }))
  fireEvent.click(screen.getByRole('button', { name: '保存审核结果' }))
  expect(await screen.findByText('请指出需要补正的字段和原因')).toBeTruthy()
  expect(await screen.findByText('请选择补正截止时间')).toBeTruthy()
  expect(mocks.review).not.toHaveBeenCalled()
})
