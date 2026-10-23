import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useReauthentication } from '@/hooks/useReauthentication'
import { ApiError } from '@/core/request'
import { clearReauthCredential } from '@/core/reauth'

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), result: vi.fn() }))
vi.mock('@/services/auth', () => ({ authService: { reauthenticate: mocks.authenticate } }))
const description = '修改银行收款设置需要验证当前超级管理员身份，请输入当前登录账号的密码。'
function Harness({ scene = true }: { scene?: boolean }) {
  const { ensureReauthenticated, reauthDialog } = useReauthentication(scene ? { description } : undefined)
  return <><button onClick={() => void ensureReauthenticated().then(mocks.result)}>修改设置</button>{reauthDialog}</>
}
beforeEach(() => {
  clearReauthCredential(); mocks.result.mockReset(); mocks.authenticate.mockReset()
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})
afterEach(() => { cleanup(); clearReauthCredential() })

it('uses the settings scene and keeps password errors in the identity dialog until corrected', async () => {
  mocks.authenticate.mockRejectedValueOnce(new ApiError({ status: 422, message: '当前密码不正确' })).mockResolvedValueOnce({ reauth_token: 'test-credential', expires_in: 600 })
  render(<Harness />)
  fireEvent.click(screen.getByText('修改设置'))
  expect(await screen.findByText(description)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '验 证' }))
  expect(await screen.findByText('请输入当前密码')).toBeTruthy()
  expect(mocks.authenticate).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'wrong-password' } })
  fireEvent.click(screen.getByRole('button', { name: '验 证' }))
  expect(await screen.findByText('当前密码不正确')).toBeTruthy()
  expect(mocks.result).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'correct-password' } })
  fireEvent.click(screen.getByRole('button', { name: '验 证' }))
  await waitFor(() => expect(mocks.result).toHaveBeenCalledWith('test-credential'))
})

it('retains the default description for other callers and resolves cancellation without a credential', async () => {
  render(<Harness scene={false} />)
  fireEvent.click(screen.getByText('修改设置'))
  expect(await screen.findByText(/此操作会影响管理员账号安全/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '取 消' }))
  await waitFor(() => expect(mocks.result).toHaveBeenCalledWith(null))
  expect(mocks.authenticate).not.toHaveBeenCalled()
})
