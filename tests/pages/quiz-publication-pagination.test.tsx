import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PublicationDialog } from '@/pages/quiz/components/PublicationDialog'
import { quizPublication, type PublicationPreflight } from '@/services/quizPublication'
import { ApiError } from '@/core/request'

vi.mock('@/hooks/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/services/quizPublication', () => ({ quizPublication: { check: vi.fn(), list: vi.fn(), start: vi.fn() } }))
const candidates = Array.from({ length: 125 }, (_, i) => ({ question_id: i + 1, revision_id: 1000 + i, lock_version: 1 }))
const check: PublicationPreflight = {
  library_id: 1, lock_version: 1, preflight_version: 'old', status: 'draft', access_mode: 'free', entry_open: false,
  counts: { published: 1, draft: 125, abnormal: 0, default_ownership: 0, unavailable_ownership: 0, system_ownership: 0 },
  blockers: [], repairable: [], warnings: [], waiting_import_count: 0, candidates,
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(quizPublication.check).mockResolvedValue(check)
  vi.mocked(quizPublication.list).mockResolvedValue([])
  vi.mocked(quizPublication.start).mockResolvedValue({ id: 1, library_id: 1, status: 'succeeded', progress: { questions: 3, library: false, entry: false, library_version: 1, phase: 'completed' }, error_message: null, created_at: '', updated_at: '' })
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addListener() {}, removeListener() {} }) })
})
afterEach(cleanup)
const props = { libraryId: 1, onClose: () => {}, onChanged: () => {} }
const dialog = () => screen.getByRole('dialog')
const rows = () => Array.from(dialog().querySelectorAll('tbody tr.ant-table-row')) as HTMLElement[]
function pick(index: number) { fireEvent.click(within(rows()[index]).getByRole('checkbox')) }
function page(number: number) { fireEvent.click(dialog().querySelector('.ant-pagination-item-' + number)!) }
async function size(number: number) {
  fireEvent.mouseDown(within(dialog()).getByRole('combobox'))
  fireEvent.click(await screen.findByText(new RegExp('^' + number + '\\s*/'), { selector: '.ant-select-item-option-content' }))
}
const execute = () => fireEvent.click(screen.getByRole('button', { name: '确认执行' }))

it('paginates 125 candidates and submits only the three selections across pages', async () => {
  render(<PublicationDialog {...props} />)
  await screen.findByText('共 125 道候选题 · 已选 0 道')
  expect(rows()).toHaveLength(20)
  pick(0); pick(1); page(2); pick(0)
  await size(50)
  expect(rows()).toHaveLength(50); expect(rows()[0]).toHaveTextContent('1000')
  await size(100)
  expect(rows()).toHaveLength(100)
  page(2); expect(rows()).toHaveLength(25)
  expect(screen.getByText('共 125 道候选题 · 已选 3 道')).toBeVisible()
  execute()
  await waitFor(() => expect(quizPublication.start).toHaveBeenCalledWith(1, expect.objectContaining({ items: [candidates[0], candidates[1], candidates[20]] })))
})

it('selects only the current page and resets when switching libraries', async () => {
  const view = render(<PublicationDialog {...props} />)
  await screen.findByText('共 125 道候选题 · 已选 0 道')
  page(2)
  fireEvent.click(screen.getByRole('checkbox', { name: '全选本页' }))
  expect(screen.getByText('共 125 道候选题 · 已选 20 道')).toBeInTheDocument()
  page(1)
  expect(within(rows()[0]).getByRole('checkbox')).not.toBeChecked()
  view.rerender(<PublicationDialog {...props} libraryId={2} />)
  await screen.findByText('共 125 道候选题 · 已选 0 道')
  expect(rows()[0]).toHaveTextContent('1000')
})

it('rechecks stale versions without automatically submitting or retaining changed selections', async () => {
  vi.mocked(quizPublication.check).mockResolvedValueOnce(check).mockResolvedValueOnce({
    ...check, preflight_version: 'new', candidates: [{ ...candidates[0], lock_version: 2 }, candidates[1], { ...candidates[2], revision_id: 2020 }],
  })
  vi.mocked(quizPublication.start).mockRejectedValueOnce(new ApiError({ status: 409, message: '题库内容已变化，请重新检查并确认' }))
  render(<PublicationDialog {...props} selectedIds={[1, 2, 3]} />)
  await screen.findByText('共 125 道候选题 · 已选 3 道')
  execute()
  fireEvent.click(await screen.findByRole('button', { name: '重新预检' }))
  expect(await screen.findByText(/移除 2 道失效选题/)).toBeVisible()
  expect(quizPublication.start).toHaveBeenCalledTimes(1)
  execute()
  await waitFor(() => expect(quizPublication.start).toHaveBeenLastCalledWith(1, expect.objectContaining({ items: [candidates[1]], preflight_version: 'new' })))
})
