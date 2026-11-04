import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Modal } from 'antd'
import QuizLibraries from '@/pages/quiz/libraries'
import { quizService } from '@/services/quiz'
import { useAuthStore } from '@/stores/authStore'
import { ApiError } from '@/core/request'
import type { QuizLibrary } from '@/types/quiz'

const { reauthenticate } = vi.hoisted(() => ({ reauthenticate: vi.fn() }))
vi.mock('@/hooks/useReauthentication', () => ({ useReauthentication: () => ({ ensureReauthenticated: reauthenticate, reauthDialog: null }) }))
vi.mock('@/components/ImageUpload', () => ({ ImageUpload: () => null }))
vi.mock('@/services/quiz', () => ({ quizService: {
  listLibraries: vi.fn(), getLibrary: vi.fn(), updateLibrary: vi.fn(), createLibrary: vi.fn(), convertAccessMode: vi.fn(),
} }))

function library(changes: Partial<QuizLibrary> = {}): QuizLibrary {
  return { id: 9, library_code: 'QL009', name: '网络基础', normalized_name: '网络基础',
    description: null, cover_url: null, details: null, access_mode: 'free', vendor_tag: 'none', price_cents: 0,
    system_kind: 'none', migration_state: 'ready', status: 'draft', v2_enabled: false, sort_order: 0, lock_version: 4,
    published_at: null, suspended_at: null, archived_at: null, deleted_at: null, restore_until: null,
    open_migration_issue_count: 0, module_count: 1, knowledge_point_count: 1, question_count: 1,
    created_at: '2026-11-04T01:00:00+08:00', updated_at: '2026-11-04T01:00:00+08:00', ...changes }
}

beforeAll(() => {
  const computedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => computedStyle(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} })) })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ admin: { id: 1, role: 'super_admin' } as never, permissions: ['*'], initialized: true })
  vi.mocked(quizService.listLibraries).mockResolvedValue([library()])
  reauthenticate.mockResolvedValue('reauth-fixture')
})
afterEach(() => { cleanup(); Modal.destroyAll() })

async function open(action: '编辑' | '转换模式') {
  render(<MemoryRouter><QuizLibraries /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(action) }))
  return screen.findByRole('dialog')
}
async function selectMode(dialog: HTMLElement, label: string, editing = true) {
  const input = editing ? within(dialog).getByRole('combobox', { name: '访问模式' }) : within(dialog).getByRole('combobox')
  fireEvent.mouseDown(input)
  fireEvent.click(await screen.findByText(label, { selector: '.ant-select-item-option-content' }))
}

describe('题库访问模式保存', () => {
  it('编辑免费题库转付费时必须发送价格，单纯改名不会覆盖已有价格', async () => {
    vi.mocked(quizService.updateLibrary).mockResolvedValue(library({ access_mode: 'paid', price_cents: 4900, lock_version: 5 }))
    const dialog = await open('编辑')
    await selectMode(dialog, '付费题库')
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: '价格（分）' }), { target: { value: '4900' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /^(OK|确\s*定)$/ }))
    await waitFor(() => expect(quizService.updateLibrary).toHaveBeenCalledWith(9, { lock_version: 4, access_mode: 'paid', price_cents: 4900 }))
    cleanup()
    vi.mocked(quizService.listLibraries).mockResolvedValue([library({ access_mode: 'paid', price_cents: 4900, lock_version: 5 })])
    const second = await open('编辑')
    expect(within(second).getByRole('spinbutton', { name: '价格（分）' })).toHaveValue('4900')
    fireEvent.change(within(second).getByRole('textbox', { name: '题库名称' }), { target: { value: '新名称' } })
    fireEvent.click(within(second).getByRole('button', { name: /^(OK|确\s*定)$/ }))
    await waitFor(() => expect(quizService.updateLibrary).toHaveBeenLastCalledWith(9, { lock_version: 5, name: '新名称' }))
  })

  it('转换付费模式先校验价格，再认证并携带价格提交，连点不会重复请求', async () => {
    vi.mocked(quizService.convertAccessMode).mockResolvedValue({ library: library({ access_mode: 'paid', price_cents: 4900 }), sessions_affected: 0 })
    const dialog = await open('转换模式')
    await selectMode(dialog, '付费题库', false)
    const button = within(dialog).getByRole('button', { name: '确认转换' })
    fireEvent.click(button)
    expect(await within(dialog).findByText('请填写大于0的整数价格（分）')).toBeInTheDocument()
    expect(reauthenticate).not.toHaveBeenCalled()
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: '转换价格（分）' }), { target: { value: '4900' } })
    fireEvent.click(button); fireEvent.click(button)
    await waitFor(() => expect(quizService.convertAccessMode).toHaveBeenCalledWith(9, 4, 'paid', 'reauth-fixture', undefined, 4900))
    expect(quizService.convertAccessMode).toHaveBeenCalledTimes(1)
  })

  it('转换版本冲突后加载新版本并要求重新选择，不反复提交旧版本', async () => {
    vi.mocked(quizService.convertAccessMode).mockRejectedValueOnce(new ApiError({ status: 409, code: 40201, message: 'conflict' }))
      .mockResolvedValue({ library: library({ access_mode: 'activation_code', lock_version: 10 }), sessions_affected: 0 })
    vi.mocked(quizService.getLibrary).mockResolvedValue(library({ lock_version: 9 }))
    const dialog = await open('转换模式')
    await selectMode(dialog, '激活码解锁', false)
    fireEvent.click(within(dialog).getByRole('button', { name: '确认转换' }))
    await waitFor(() => expect(within(dialog).getByRole('button', { name: '确认转换' })).toBeDisabled())
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('已加载最新资料')
    await selectMode(dialog, '激活码解锁', false)
    fireEvent.click(within(dialog).getByRole('button', { name: '确认转换' }))
    await waitFor(() => expect(quizService.convertAccessMode).toHaveBeenLastCalledWith(9, 9, 'activation_code', 'reauth-fixture', undefined, undefined))
  })

  it('编辑版本冲突后刷新表单和版本，重新修改后使用新版本', async () => {
    vi.mocked(quizService.updateLibrary).mockRejectedValueOnce(new ApiError({ status: 409, code: 40201, message: 'conflict' }))
      .mockResolvedValue(library({ lock_version: 10 }))
    vi.mocked(quizService.getLibrary).mockResolvedValue(library({ lock_version: 9, name: '服务器最新名称' }))
    const dialog = await open('编辑')
    fireEvent.change(within(dialog).getByRole('textbox', { name: '题库名称' }), { target: { value: '第一次修改' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /^(OK|确\s*定)$/ }))
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: '题库名称' })).toHaveValue('服务器最新名称'))
    fireEvent.change(within(dialog).getByRole('textbox', { name: '题库名称' }), { target: { value: '核对后修改' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /^(OK|确\s*定)$/ }))
    await waitFor(() => expect(quizService.updateLibrary).toHaveBeenLastCalledWith(9, { lock_version: 9, name: '核对后修改' }))
  })
})
