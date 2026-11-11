import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ConfigProvider, Modal } from 'antd'
import CompetitionTab from '@/pages/operations/competitions/CompetitionTab'
import { competitionAdminService } from '@/services/competition'
import { quizService } from '@/services/quiz'
import { useAuthStore } from '@/stores/authStore'
import type { Competition } from '@/types/competition'
import type { QuizLibrary } from '@/types/quiz'

vi.mock('@/services/competition', () => ({ competitionAdminService: {
  list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
  uploadAttachment: vi.fn(), listRegistrations: vi.fn(), exportRegistrations: vi.fn(), getSchoolStats: vi.fn(),
} }))
vi.mock('@/services/quiz', () => ({ quizService: { listLibraries: vi.fn() } }))
vi.mock('@/components/ImageUpload', () => ({ ImageUpload: () => null }))
vi.mock('@/components/PdfAttachmentUpload', () => ({ PdfAttachmentUpload: () => null }))
vi.mock('@/pages/operations/competitions/FormFieldBuilder', () => ({ default: () => null }))

function competition(changes: Partial<Competition> = {}): Competition {
  return {
    id: 3, name: 'SCSA-T 网络安全大赛', description: null, cover_url: null, poster_url: null,
    start_time: null, end_time: null, registration_deadline: null, is_active: true,
    show_schedule: true, show_signup: true, tracks: [], total_enrolled: 0,
    created_at: '2026-11-01T00:00:00Z', custom_fields: [], attachments: [],
    quiz_library_id: null, quiz_library_name: null, ...changes,
  }
}

function library(changes: Partial<QuizLibrary> = {}): QuizLibrary {
  return { id: 9, library_code: 'QL009', name: 'SCSA-T 练习题库', normalized_name: 'SCSA-T 练习题库',
    description: null, cover_url: null, details: null, access_mode: 'free', vendor_tag: 'none', price_cents: 0,
    system_kind: 'none', migration_state: 'ready', status: 'published', v2_enabled: true, sort_order: 0, lock_version: 4,
    published_at: null, suspended_at: null, archived_at: null, deleted_at: null, restore_until: null,
    open_migration_issue_count: 0, module_count: 1, knowledge_point_count: 1, question_count: 10,
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
  vi.mocked(competitionAdminService.list).mockResolvedValue({ items: [competition()], total: 1, page: 1, page_size: 20 })
  vi.mocked(quizService.listLibraries).mockResolvedValue([
    library(),
    library({ id: 10, name: '未发布题库', status: 'draft', v2_enabled: false }),
  ])
})
afterEach(() => { cleanup(); Modal.destroyAll() })

async function openEditDialog(item: Competition) {
  vi.mocked(competitionAdminService.list).mockResolvedValue({ items: [item], total: 1, page: 1, page_size: 20 })
  render(<ConfigProvider theme={{ token: { motion: false } }}><MemoryRouter><CompetitionTab /></MemoryRouter></ConfigProvider>)
  fireEvent.click(await screen.findByRole('button', { name: /编辑/ }))
  return screen.findByRole('dialog')
}

describe('竞赛绑定练习题库', () => {
  it('列表展示绑定的题库名称，未绑定显示占位', async () => {
    vi.mocked(competitionAdminService.list).mockResolvedValue({
      items: [
        competition({ quiz_library_id: 9, quiz_library_name: 'SCSA-T 练习题库' }),
        competition({ id: 4, name: '未绑定赛事' }),
      ],
      total: 2, page: 1, page_size: 20,
    })
    render(<ConfigProvider theme={{ token: { motion: false } }}><MemoryRouter><CompetitionTab /></MemoryRouter></ConfigProvider>)
    expect(await screen.findByText('SCSA-T 练习题库', { selector: '.ant-tag' })).toBeVisible()
    expect(screen.getByText('未绑定')).toBeVisible()
  })

  it('编辑弹窗加载题库选项并随保存提交 quiz_library_id', async () => {
    const dialog = await openEditDialog(competition())

    const select = await within(dialog).findByRole('combobox', { name: /绑定题库/ })
    await waitFor(() => expect(quizService.listLibraries).toHaveBeenCalled())
    fireEvent.mouseDown(select)
    // 已发布题库显示名称，未发布题库带状态后缀
    const publishedOption = await screen.findByText('SCSA-T 练习题库', { selector: '.ant-select-item-option-content' })
    expect(screen.getByText('未发布题库（草稿）', { selector: '.ant-select-item-option-content' })).toBeInTheDocument()
    fireEvent.click(publishedOption)

    vi.mocked(competitionAdminService.update).mockResolvedValue(competition())
    fireEvent.click(within(dialog).getByRole('button', { name: '保 存' }))
    await waitFor(() => expect(competitionAdminService.update).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ quiz_library_id: 9 }),
    ))
  }, 15_000)

  it('新建赛事提交未选择时 quiz_library_id 为 null', async () => {
    render(<ConfigProvider theme={{ token: { motion: false } }}><MemoryRouter><CompetitionTab /></MemoryRouter></ConfigProvider>)
    fireEvent.click(await screen.findByRole('button', { name: /新增赛事/ }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText('赛事名称'), { target: { value: '新赛事' } })
    // 赛道配置默认一行且赛道名必填
    fireEvent.change(within(dialog).getByPlaceholderText('赛道名称，如：网络赛道'), { target: { value: '默认赛道' } })
    vi.mocked(competitionAdminService.create).mockResolvedValue(competition())
    fireEvent.click(within(dialog).getByRole('button', { name: '创 建' }))
    await waitFor(() => expect(competitionAdminService.create).toHaveBeenCalledWith(
      expect.objectContaining({ quiz_library_id: null }),
    ))
  }, 15_000)
})
