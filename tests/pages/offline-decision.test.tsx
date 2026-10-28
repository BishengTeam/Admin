import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import dayjs, { type Dayjs } from 'dayjs'
import { ApiError } from '@/core/request'
import OfflineDecisionModal from '@/pages/orders/components/OfflineDecisionModal'
import type { OfflinePayment } from '@/services/offlinePayment'

const mocks = vi.hoisted(() => ({ decide: vi.fn(), reauth: vi.fn(), changed: vi.fn(), close: vi.fn(), clearReauth: vi.fn(), uuid: vi.fn() }))
vi.mock('@/services/offlinePayment', () => ({ offlinePaymentService: { decide: mocks.decide } }))
vi.mock('@/hooks/useReauthentication', () => ({ useReauthentication: () => ({ ensureReauthenticated: mocks.reauth, reauthDialog: null }) }))
vi.mock('@/core/reauth', () => ({ clearReauthCredential: mocks.clearReauth }))
// Exercise AntD Form's actual validation/value mapping without testing rc-picker keyboard internals.
vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>()
  const React = await import('react')
  return { ...actual, DatePicker: React.forwardRef<HTMLInputElement, { id?: string; value?: Dayjs; disabled?: boolean; 'aria-invalid'?: boolean; onChange?: (value: Dayjs | null, text: string) => void }>((props, ref) =>
    <input ref={ref} id={props.id} aria-invalid={props['aria-invalid']} disabled={props.disabled} value={props.value?.format('YYYY-MM-DD HH:mm:ss') || ''} onChange={event => props.onChange?.(event.target.value ? dayjs(event.target.value) : null, event.target.value)} />) }
})

const payment = { order_id: 34, out_trade_no: 'H3C-test-order', current_version: 1, order_status: 'pending', status: 'under_review', materials: [], submissions: [], entries: [], audits: [] } as unknown as OfflinePayment
beforeEach(() => {
  mocks.decide.mockReset().mockResolvedValue({ status: 'confirmed' }); mocks.reauth.mockReset().mockResolvedValue('test-grant')
  mocks.changed.mockReset().mockResolvedValue(undefined); mocks.close.mockReset(); mocks.clearReauth.mockReset()
  mocks.uuid.mockReset().mockImplementation(() => `test-request-${mocks.uuid.mock.calls.length}`)
  vi.stubGlobal('crypto', { randomUUID: mocks.uuid })
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-29T04:00:00Z'))
  const computedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => computedStyle(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function open() { return render(<OfflineDecisionModal payment={payment} action='confirm' onClose={mocks.close} onChanged={mocks.changed} />) }
function change(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
function fill(time = '2026-10-29 11:30:00') {
  change('实际到账金额（元）', '1111'); change('银行实际到账时间', time)
  change('核实后的银行流水标识', '1'); change('处理备注', '1')
}
function save() { fireEvent.click(screen.getByRole('button', { name: '确认保存' })) }

it('blocks the reported future bank time before reauthentication and preserves the selection', async () => {
  open(); fill('2026-10-30 00:00:00'); save()
  expect((await screen.findAllByText('银行实际到账时间不能晚于当前时间，请以银行流水实际时间为准')).length).toBeGreaterThan(0)
  expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.decide).not.toHaveBeenCalled()
  expect(screen.getByLabelText('银行实际到账时间')).toHaveValue('2026-10-30 00:00:00')
})

it.each(['0', '-1', '1.001', '21474836.48'])('rejects amount %s without rounding or replacing it', async amount => {
  open(); fill(); change('实际到账金额（元）', amount); save()
  expect(await screen.findByText('请填写大于0、最多两位小数的实际金额，最高21474836.47元')).toBeTruthy()
  expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.decide).not.toHaveBeenCalled()
  expect(screen.getByLabelText('实际到账金额（元）')).toHaveValue(amount)
})

it('submits valid confirmed inputs with the existing money, version, UUID and reauthentication contract', async () => {
  open(); fill(); save()
  await waitFor(() => expect(mocks.decide).toHaveBeenCalledTimes(1))
  expect(mocks.decide).toHaveBeenCalledWith(34, 'confirm', {
    expected_version: 1, note: '1', amount_cents: 111100, bank_time: '2026-10-29T03:30:00.000Z', bank_reference: '1', request_key: 'test-request-1',
  }, 'test-grant')
  await waitFor(() => expect(mocks.close).toHaveBeenCalledTimes(1))
})

it('places backend field errors on the matching fields and displays their Chinese summary', async () => {
  mocks.decide.mockRejectedValue(new ApiError({ status: 422, message: '参数校验失败', fields: [
    { field: 'bank_time', reason: 'Value error, 转账时间不能晚于当前时间' },
    { loc: ['body', 'note'], msg: 'Field required' },
  ] }))
  open(); fill(); save()
  const message = '银行实际到账时间不能晚于当前时间，请以银行流水实际时间为准'
  await waitFor(() => expect(screen.getAllByText(message).length).toBe(2))
  expect(screen.getByLabelText('银行实际到账时间')).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByLabelText('处理备注')).toHaveValue('1')
  expect(mocks.close).not.toHaveBeenCalled()
  change('银行实际到账时间', '2026-10-29 11:20:00')
  await waitFor(() => expect(screen.queryAllByText(message)).toHaveLength(0))
})

it('blocks blind retry after 409 and refreshes only read state while preserving input', async () => {
  mocks.decide.mockRejectedValue(new ApiError({ status: 409, message: '凭证版本已变化' }))
  open(); fill(); save()
  expect(await screen.findByText(/凭证版本已变化。请刷新核账状态/)).toBeTruthy()
  expect(screen.getByRole('button', { name: '确认保存' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '刷新核账状态' }))
  await waitFor(() => expect(mocks.changed).toHaveBeenCalledTimes(1))
  expect(mocks.decide).toHaveBeenCalledTimes(1); expect(mocks.close).not.toHaveBeenCalled()
  expect(screen.getByLabelText('实际到账金额（元）')).toHaveValue('1111')
  expect(screen.getByLabelText('银行实际到账时间')).toHaveValue('2026-10-29 11:30:00')
  expect(screen.getByRole('button', { name: '确认保存' })).toBeDisabled()
})

it.each([[401, '登录已失效'], [403, '请重新验证当前管理员密码']] as const)('keeps inputs on status %s and explains the next step', async (status, message) => {
  mocks.decide.mockRejectedValue(new ApiError({ status, message }))
  open(); fill(); save()
  expect(await screen.findByText(status === 401 ? '登录已失效，请重新登录后再处理。' : '身份验证凭据已失效，请重新验证当前管理员密码后重试。')).toBeTruthy()
  expect(screen.getByLabelText('处理备注')).toHaveValue('1'); expect(mocks.close).not.toHaveBeenCalled()
  if (status === 403) expect(mocks.clearReauth).toHaveBeenCalledTimes(1)
})

it('keeps the idempotency key for an explicit retry of the same unconfirmed request', async () => {
  mocks.decide.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ status: 'confirmed' })
  open(); fill(); save()
  expect(await screen.findByText(/提交结果暂未确认/)).toBeTruthy()
  save(); await waitFor(() => expect(mocks.decide).toHaveBeenCalledTimes(2))
  expect(mocks.decide.mock.calls[0][2].request_key).toBe(mocks.decide.mock.calls[1][2].request_key)
  expect(mocks.uuid).toHaveBeenCalledTimes(1)
})

it('validates the actual refund bank time before any refund operation', async () => {
  render(<OfflineDecisionModal payment={payment} action='refund' onClose={mocks.close} onChanged={mocks.changed} />)
  change('实际退款金额（元）', '1111'); change('银行实际退款时间', '2026-10-30 00:00:00')
  change('核实后的银行流水标识', '1'); change('处理备注', '1'); save()
  expect((await screen.findAllByText('银行实际退款时间不能晚于当前时间，请以银行流水实际时间为准')).length).toBeGreaterThan(0)
  expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.decide).not.toHaveBeenCalled()
})

it('validates the separate actual return time for an exceptional transfer', async () => {
  render(<OfflineDecisionModal payment={payment} action='resolve' onClose={mocks.close} onChanged={mocks.changed} />)
  fill(); change('实际退回时间', '2026-10-30 00:00:00'); change('核实后的退款流水', '1'); save()
  expect((await screen.findAllByText('实际退回时间不能晚于当前时间，请以银行流水实际时间为准')).length).toBeGreaterThan(0)
  expect(mocks.reauth).not.toHaveBeenCalled(); expect(mocks.decide).not.toHaveBeenCalled()
})

it('keeps correction deadlines in their own future-only rule', async () => {
  render(<OfflineDecisionModal payment={payment} action='return' onClose={mocks.close} onChanged={mocks.changed} />)
  change('补交截止时间（不填使用默认时限）', '2026-10-29 11:30:00'); change('处理备注', '1'); save()
  expect(await screen.findByText('请选择晚于当前时间的补交截止时间')).toBeTruthy()
  expect(mocks.decide).not.toHaveBeenCalled()
})
