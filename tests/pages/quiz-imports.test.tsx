import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Modal } from 'antd'
import QuizImports from '@/pages/quiz/imports'
import { quizService } from '@/services/quiz'
import { useAuthStore } from '@/stores/authStore'
import type { ImportCategoryImpact, ImportErrorPage, ImportJob } from '@/types/quiz'

vi.mock('@/services/quiz', () => ({
  quizService: {
    listImports: vi.fn(),
    getImport: vi.fn(),
    listImportErrors: vi.fn(),
    getImportCategoryImpact: vi.fn(),
    confirmImportCategories: vi.fn(),
    cancelImport: vi.fn(),
    getImportReportUrl: vi.fn(),
    getImportSourceUrl: vi.fn(),
    retryImport: vi.fn(),
    importCsv: vi.fn(),
    importJson: vi.fn(),
  },
}))

vi.mock('@/utils/quizEvents', () => ({ notifyQuizImportSucceeded: vi.fn() }))

const now = '2026-08-13T08:00:00+08:00'
const future = '2099-08-20T08:00:00+08:00'
const impactVersion = 'a'.repeat(64)

function importJob(overrides: Partial<ImportJob> = {}): ImportJob {
  return {
    id: 51,
    admin_id: 1,
    source_type: 'json',
    status: 'validation_failed',
    source_size_bytes: 1024,
    total_rows: 2,
    validated_rows: 0,
    created_count: 0,
    error_count: 1,
    heartbeat_at: now,
    started_at: now,
    finished_at: now,
    retry_count: 0,
    error_message: '校验失败',
    report_available: true,
    lock_version: 2,
    validation_version: 1,
    impact_version: null,
    missing_category_count: 0,
    affected_question_count: 0,
    confirmed_by: null,
    confirmed_at: null,
    execution_protected_until: null,
    expires_at: future,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

const errorPage: ImportErrorPage = {
  items: [{
    row: 2,
    question_index: 1,
    field: 'question_text',
    error_code: 'duplicate',
    message: '同一分类题干重复',
  }],
  total: 1,
  page: 1,
  page_size: 50,
  available_fields: ['question_text'],
  validation_version: 1,
}

const categoryImpact: ImportCategoryImpact = {
  job_id: 53,
  status: 'awaiting_category_confirmation',
  tree: [{
    name: '网络工程',
    path: ['网络工程'],
    depth: 1,
    status: 'will_create',
    category_id: null,
    direct_question_count: 0,
    subtree_question_count: 2,
    blocking_reasons: [],
    children: [{
      name: '路由协议',
      path: ['网络工程', '路由协议'],
      depth: 2,
      status: 'will_create',
      category_id: null,
      direct_question_count: 2,
      subtree_question_count: 2,
      blocking_reasons: [],
      children: [],
    }],
  }],
  new_category_count: 2,
  reused_category_count: 0,
  affected_question_count: 2,
  blocking_reasons: [],
  lock_version: 2,
  impact_version: impactVersion,
  calculated_at: now,
}

beforeAll(() => {
  const nativeGetComputedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle')
    .mockImplementation((element) => nativeGetComputedStyle(element))

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

describe('QuizImports page workflows', () => {
  afterEach(() => {
    cleanup()
    Modal.destroyAll()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ permissions: ['quiz:list', 'quiz:import', 'quiz:write'], initialized: true })
  })

  it('opens a paged, redacted error table in the current page and keeps JSON download secondary', async () => {
    const failed = importJob()
    vi.mocked(quizService.listImports).mockResolvedValue({ items: [failed], total: 1, page: 1, page_size: 20 })
    vi.mocked(quizService.listImportErrors).mockResolvedValue(errorPage)

    render(<QuizImports />)
    fireEvent.click(await screen.findByRole('button', { name: '错误明细' }))

    expect(await screen.findByText('错误详情已永久脱敏')).toBeInTheDocument()
    expect(screen.getByText('第 2 行')).toBeInTheDocument()
    expect(screen.getAllByText('question_text').length).toBeGreaterThan(0)
    expect(screen.getByText('同一分类题干重复')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /下载 JSON/ })).toBeInTheDocument()
    expect(quizService.listImportErrors).toHaveBeenCalledWith(51, { page: 1 }, expect.any(AbortSignal))
    expect(quizService.getImportReportUrl).not.toHaveBeenCalled()
  })

  it('shows the category impact tree and confirms with both optimistic versions', async () => {
    const awaiting = importJob({
      id: 53,
      status: 'awaiting_category_confirmation',
      error_count: 0,
      error_message: null,
      report_available: false,
      missing_category_count: 2,
      affected_question_count: 2,
      impact_version: impactVersion,
      finished_at: null,
    })
    const queued = importJob({
      ...awaiting,
      status: 'queued',
      lock_version: 3,
      confirmed_by: 1,
      confirmed_at: now,
      execution_protected_until: future,
    })
    vi.mocked(quizService.listImports).mockResolvedValue({ items: [awaiting], total: 1, page: 1, page_size: 20 })
    vi.mocked(quizService.getImport).mockResolvedValue(awaiting)
    vi.mocked(quizService.getImportCategoryImpact).mockResolvedValue(categoryImpact)
    vi.mocked(quizService.confirmImportCategories).mockResolvedValue(queued)

    render(<QuizImports />)
    fireEvent.click(await screen.findByRole('button', { name: /分类影响/ }))

    expect(await screen.findByText('网络工程')).toBeInTheDocument()
    expect(screen.getByText('路由协议')).toBeInTheDocument()
    expect(screen.getAllByText('将新建')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: /确认创建并导入/ }))
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /确认创建并导入/ })).toHaveLength(2)
    })
    const confirmationButtons = screen.getAllByRole('button', { name: /确认创建并导入/ })
    fireEvent.click(confirmationButtons[confirmationButtons.length - 1])

    await waitFor(() => expect(quizService.confirmImportCategories).toHaveBeenCalledWith(53, {
      lock_version: 2,
      impact_version: impactVersion,
    }))
  })

  it('requires quiz:write before enabling category creation confirmation', async () => {
    const awaiting = importJob({
      id: 53,
      status: 'awaiting_category_confirmation',
      error_count: 0,
      report_available: false,
      missing_category_count: 2,
      affected_question_count: 2,
      impact_version: impactVersion,
    })
    useAuthStore.setState({ permissions: ['quiz:list', 'quiz:import'], initialized: true })
    vi.mocked(quizService.listImports).mockResolvedValue({ items: [awaiting], total: 1, page: 1, page_size: 20 })
    vi.mocked(quizService.getImport).mockResolvedValue(awaiting)
    vi.mocked(quizService.getImportCategoryImpact).mockResolvedValue(categoryImpact)

    render(<QuizImports />)
    fireEvent.click(await screen.findByRole('button', { name: /分类影响/ }))

    const confirm = await screen.findByRole('button', { name: /确认创建并导入/ })
    expect(confirm).toBeDisabled()
    expect(quizService.confirmImportCategories).not.toHaveBeenCalled()
  })
})
