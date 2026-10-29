import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useReauthentication } from '@/hooks/useReauthentication'
import { clearReauthCredential } from '@/core/reauth'

const state = vi.hoisted(() => ({ reauth: vi.fn() }))
vi.mock('@/services/auth', () => ({ authService: { reauthenticate: state.reauth } }))
beforeEach(() => { Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })) }); clearReauthCredential(); state.reauth.mockResolvedValue({ reauth_token: 'test-grant', expires_in: 600 }) })
afterEach(() => { cleanup(); clearReauthCredential(); vi.restoreAllMocks() })
function Person({ done }: { done: (value: string | null) => void }) {
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  return <><button onClick={async () => done(await ensureReauthenticated())}>确认到账</button>{reauthDialog}</>
}
it('reuses one identity grant across consecutive people, including remounting their drawers', async () => {
  const done = vi.fn()
  const view = render(<Person key='person-1' done={done} />)
  fireEvent.click(screen.getByText('确认到账'))
  fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'fixture-password' } })
  fireEvent.click(screen.getByRole('button', { name: /验\s*证/ }))
  await waitFor(() => expect(done).toHaveBeenCalledWith('test-grant'))
  view.rerender(<Person key='person-2' done={done} />)
  fireEvent.click(screen.getByText('确认到账'))
  await waitFor(() => expect(done).toHaveBeenCalledTimes(2))
  expect(state.reauth).toHaveBeenCalledTimes(1)
  clearReauthCredential()
  view.rerender(<Person key='person-3' done={done} />)
  fireEvent.click(screen.getByText('确认到账'))
  expect(screen.getByLabelText('当前密码')).toBeTruthy()
})
