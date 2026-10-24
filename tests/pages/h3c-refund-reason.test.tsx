import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { message } from 'antd'
import RegistrationReviewDrawer from '@/pages/certification/components/vendors/h3c/RegistrationReviewDrawer'
import type { H3cRegistration } from '@/types/h3c'

const mocks = vi.hoisted(() => ({ detail: vi.fn(), refund: vi.fn(), reauth: vi.fn() }))
vi.mock('@/services/h3c', () => ({ h3cService: { getRegistration: mocks.detail, rejectAndRefund: mocks.refund } }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/hooks/useReauthentication', () => ({ useReauthentication: () => ({ ensureReauthenticated: mocks.reauth, reauthDialog: null }) }))
vi.mock('@/pages/certification/components/shared/ReviewDetailDrawer', () => ({ default: ({ footer, informationItems, materialItems }: { footer: React.ReactNode; informationItems: {label: string; content: React.ReactNode}[]; materialItems: {label: React.ReactNode}[] }) => <>{informationItems.map((item, i) => <div key={i}>{item.label}{item.content}</div>)}{materialItems.map((item, i) => <div key={i}>{item.label}</div>)}{footer}</> }))
const registration = {
  id: 7, batch_id: 1, registration_no: 'H3C-7', registration_type: 'student', status: 'pending_review',
  candidate_snapshot: { candidate_name: '测试人', student_verification_method: 'stamped_certificate' },
  price_cents: 1000, resubmission_count: 0, latest_review: null,
  materials: [{ id: 1, material_type: 'student_proof', version_no: 1, is_current: true, original_filename: 'proof.jpg' }],
} as unknown as H3cRegistration
beforeEach(() => {
  mocks.detail.mockReset().mockResolvedValue(registration); mocks.refund.mockReset().mockResolvedValue({ ...registration, status: 'refund_processing' }); mocks.reauth.mockReset().mockResolvedValue('reauth')
  vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as ReturnType<typeof message.success>)
  vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as ReturnType<typeof message.error>)
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
async function open() {
  render(<MemoryRouter><RegistrationReviewDrawer registration={registration} open onClose={() => {}} /></MemoryRouter>)
  await waitFor(() => expect(mocks.detail).toHaveBeenCalledWith(7))
  expect(screen.getByText(/无学信网在线验证码/)).toBeTruthy()
  expect(screen.getByText('学院盖章的学籍证图片')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '拒绝并退款' }))
}
it.each(['', '   '])('shows and focuses inline error before reauthentication for reason %j', async reason => {
  await open()
  const input = screen.getByRole('textbox', { name: '拒绝及退款原因' })
  fireEvent.change(input, { target: { value: reason } })
  fireEvent.click(screen.getByRole('button', { name: '授权退款' }))
  await screen.findByText('请填写拒绝及退款原因，该原因将向用户展示。')
  await waitFor(() => expect(input).toHaveFocus())
  expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.refund).not.toHaveBeenCalled()
})
it('keeps reason after authentication cancellation or failed refund, then submits trimmed content once', async () => {
  mocks.reauth.mockResolvedValueOnce(null).mockResolvedValue('reauth')
  mocks.refund.mockRejectedValueOnce(new Error('退款接口失败')).mockResolvedValue({ ...registration, status: 'refund_processing' })
  await open()
  const input = screen.getByRole('textbox', { name: '拒绝及退款原因' })
  fireEvent.change(input, { target: { value: '  材料不符  ' } })
  const submit = screen.getByRole('button', { name: '授权退款' })
  fireEvent.click(submit)
  await waitFor(() => expect(mocks.reauth).toHaveBeenCalledTimes(1))
  expect(input).toHaveValue('  材料不符  '); expect(mocks.refund).not.toHaveBeenCalled()
  await waitFor(() => expect(submit).not.toHaveClass('ant-btn-loading'))
  fireEvent.click(submit)
  await waitFor(() => expect(message.error).toHaveBeenCalledWith('退款接口失败'))
  expect(input).toHaveValue('  材料不符  ')
  fireEvent.click(submit)
  await waitFor(() => expect(mocks.refund).toHaveBeenCalledTimes(2))
  expect(mocks.refund).toHaveBeenLastCalledWith(7, { reason_code: 'review_rejected', reason_detail: '材料不符' }, 'reauth')
})
