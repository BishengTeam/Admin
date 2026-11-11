import { quizPublication } from '@/services/quizPublication'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ConfigProvider, Modal } from 'antd'
import QuizLibraries from '@/pages/quiz/libraries'
import { quizService } from '@/services/quiz'
import { useAuthStore } from '@/stores/authStore'
import { ApiError } from '@/core/request'
import type { QuizLibrary } from '@/types/quiz'

const { reauthenticate } = vi.hoisted(() => ({ reauthenticate: vi.fn() }))
vi.mock('@/hooks/useReauthentication', () => ({ useReauthentication: () => ({ ensureReauthenticated: reauthenticate, reauthDialog: null }) }))
vi.mock('@/services/quizPublication', () => ({ quizPublication: { check: vi.fn(), list: vi.fn().mockResolvedValue([]), start: vi.fn(), get: vi.fn(), resume: vi.fn() } }))
vi.mock('@/components/ImageUpload', () => ({ ImageUpload: () => null }))
vi.mock('@/services/quiz', () => ({ quizService: {
  listLibraries: vi.fn(), listV2Questions: vi.fn(), getLibrary: vi.fn(), updateLibrary: vi.fn(), createLibrary: vi.fn(), convertAccessMode: vi.fn(), transitionLibrary: vi.fn(),
  listActivationCodes: vi.fn(), generateActivationCodes: vi.fn(),
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
  it('展示题量差额并使用默认 30 天生成激活码（效期自兑换起算）', async () => {
    const issued = { id: 5, code: 'ABCD-EFGH-JKMN-PQRS', status: 'issued' as const, validity_days: 30,
      note: null, redeemed_by: null, redeemed_by_phone: null, redeemed_at: null, created_at: '2026-11-05T02:00:00Z' }
    vi.mocked(quizService.listLibraries).mockResolvedValue([library({
      access_mode: 'activation_code', question_count: 10,
      practice_counts: { practicable: 8, unpublished: 2, disabled: 0, unavailable_ownership: 0, invalid_revision: 0 },
    })])
    vi.mocked(quizService.listActivationCodes).mockResolvedValue({ items: [issued], page: 1, page_size: 10, total: 1 })
    vi.mocked(quizService.generateActivationCodes).mockResolvedValue({ codes: ['BCDE-FGHJ-KMNP-QRST'], validity_days: 30 })
    render(<ConfigProvider theme={{ token: { motion: false } }}><MemoryRouter><QuizLibraries /></MemoryRouter></ConfigProvider>)
    expect(await screen.findByText('总计 10 题 · 可练习 8 题')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /激活码$/ }))
    await waitFor(() => expect(screen.getByText('可兑换', { selector: '.ant-tag' })).toBeVisible())
    // 可兑换的码提供作废入口（兑换截止已废除，不再有过期态）。
    expect(screen.getByRole('button', { name: /作废/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /生成激活码/ }))
    await waitFor(() => expect(screen.getByText(/学生激活后可用 30 天/)).toBeVisible())
    fireEvent.click(screen.getByRole('button', { name: '确认生成' }))
    await waitFor(() => expect(quizService.generateActivationCodes).toHaveBeenCalledWith(9, 20, null, 30, null))
    await waitFor(() => expect(screen.getByText(/激活后有效 30 天/)).toBeVisible())
  }, 15_000)

  it('发布检查使用后端结果，空库不会发出发布请求', async () => {
    vi.mocked(quizPublication.check).mockResolvedValue({ library_id: 9, lock_version: 4, status: 'draft', access_mode: 'free', entry_open: false,
      counts: { published: 0, draft: 0, abnormal: 0, default_ownership: 0, unavailable_ownership: 0, system_ownership: 0 },
      blockers: ['没有有效的已发布题目，请先审核并发布题目'], repairable: [], warnings: [], waiting_import_count: 0, candidates: [], preflight_version: 'a'.repeat(64) })
    render(<MemoryRouter><QuizLibraries /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /^发\s*布$/ }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/没有有效的已发布题目/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '发布题库' }))
    expect(within(dialog).getByRole('button', { name: '确认执行' })).toBeDisabled()
    expect(quizPublication.check).toHaveBeenCalledWith(9, expect.any(AbortSignal))
    expect(quizService.transitionLibrary).not.toHaveBeenCalled()
    expect(quizPublication.start).not.toHaveBeenCalled()
  })
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


it('旧归档/回收站深链重定向到统一回收站页', async () => {
  // 2026-11 回收站改造：题库页 trash/archived 视图迁移到一级菜单「回收站」
  vi.mocked(quizService.listLibraries).mockResolvedValue([library()])
  for (const view of ['trash', 'archived']) {
    const { unmount } = render(
      <MemoryRouter initialEntries={[`/?library_view=${view}`]}>
        <Routes>
          <Route path="/" element={<QuizLibraries />} />
          <Route path="/admin/recycle-bin" element={<div>统一回收站</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('统一回收站')).toBeVisible()
    expect(screen.queryByPlaceholderText('题库名称或编码')).toBeNull()
    unmount()
  }
})

it('仍有已发布题目时阻断归档并引导停用', async () => {
  vi.mocked(quizService.listLibraries).mockResolvedValue([library({ status: 'suspended' })])
  vi.mocked(quizService.listV2Questions).mockResolvedValue({ items: [], total: 2, page: 1, page_size: 1 })
  render(<MemoryRouter><QuizLibraries /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: /归\s*档/ }))
  expect(await screen.findByText(/还有 2 道已发布题目/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '前往停用题目' })).toBeInTheDocument()
  expect(quizService.transitionLibrary).not.toHaveBeenCalled()
})

it('未发布题库可移入回收站，撤销期文案为 30 个自然日', async () => {
  vi.mocked(quizService.transitionLibrary).mockResolvedValue(library({
    status: 'deleted', deleted_at: '2026-11-10T00:00:00Z', restore_until: '2026-12-10T00:00:00Z',
  }))
  render(<MemoryRouter><QuizLibraries /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: '移入回收站' }))
  expect((await screen.findAllByText('将未发布题库「网络基础」移入回收站？')).length).toBeGreaterThan(0)
  expect(screen.getAllByText(
    '未发布题库可整体移入回收站。删除后保留 30 个自然日撤销期，期间可在「回收站」恢复为草稿；到期未恢复将被自动清理（题库内容不为空时保留墓碑记录）。历史快照不会被覆盖。',
  ).length).toBeGreaterThan(0)
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '移入回收站' }))
  await waitFor(() => expect(quizService.transitionLibrary).toHaveBeenCalledWith(9, 'delete', 4))
})
