import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import QuizV2Workbench from '@/pages/quiz/v2-workbench'
import QuestionTable from '@/pages/quiz/components/QuestionTable'
import { quizService } from '@/services/quiz'
import { useAuthStore } from '@/stores/authStore'

vi.mock('antd', async original => ({ ...await original<typeof import('antd')>(), Table: (props: any) => <div>
  <output data-testid="pagination">{props.pagination.current}:{props.pagination.pageSize}</output>
  <select aria-label="测试每页数量" value={props.pagination.pageSize} onChange={e => props.pagination.onChange(props.pagination.current, Number(e.target.value))}>
    {props.pagination.pageSizeOptions.map((size: number) => <option key={size} value={size}>{size} 条/页</option>)}
  </select>
  <button onClick={() => props.pagination.onChange(props.pagination.current + 1, props.pagination.pageSize)}>测试下一页</button>
  {props.dataSource.map((row: any) => <span key={row.id}>{row.question_text}</span>)}
</div> }))
vi.mock('@/pages/quiz/components/V2QuestionModal', () => ({ default: () => null }))
vi.mock('@/pages/quiz/components/QuestionModal', () => ({ default: () => null }))
vi.mock('@/services/quiz', () => ({ quizService: { listLibraries: vi.fn(), getLibrary: vi.fn(), getContentTree: vi.fn(), listV2Questions: vi.fn(), listQuestions: vi.fn() } }))

const question = (text: string) => ({ id: 1, question_text: text, question_type: 'judge', status: 'draft', image_urls: [], option_image_urls: {}, tags: [], lock_version: 1 })
const result = (text: string, page = 1, size = 20) => ({ items: [question(text)], page, page_size: size, total: 4000 })
const tree = (id: number) => ({ library_id: id, modules: [{ id, library_id: id, name: `模块${id}`, status: 'active', system_kind: 'none', knowledge_points: [] }] })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }
beforeAll(() => {
  const computedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => computedStyle(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} })) })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
beforeEach(() => { vi.clearAllMocks(); useAuthStore.setState({ permissions: ['quiz:list'], initialized: true }) })
afterEach(cleanup)

it('旧题库链接保留历史浏览，但不把归档题库作为可操作选项', async () => {
  useAuthStore.setState({ permissions: ['*'] })
  vi.mocked(quizService.listLibraries).mockResolvedValue([{ id: 1, name: '正常题库', library_code: 'QL1', status: 'draft' }] as any)
  vi.mocked(quizService.getLibrary).mockResolvedValue({ id: 3, name: '归档样例', status: 'archived' } as any)
  vi.mocked(quizService.getContentTree).mockResolvedValue(tree(3) as any)
  vi.mocked(quizService.listV2Questions).mockResolvedValue(result('历史题目') as any)
  render(<MemoryRouter initialEntries={['/admin/quiz/questions?tab=content&library_id=3']}><QuizV2Workbench /></MemoryRouter>)
  expect(await screen.findByText(/归档样例.*当前仅可查看历史/)).toBeInTheDocument()
  expect(await screen.findByText('历史题目')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '发布历史' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '检查并发布' })).toBeNull()
  expect(screen.queryByRole('button', { name: '新增题目' })).toBeNull()
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '选择题库' }))
  expect(await screen.findByText('正常题库 (QL1)', { selector: '.ant-select-item-option-content' })).toBeInTheDocument()
  expect(screen.queryByText(/归档样例/, { selector: '.ant-select-item-option-content' })).toBeNull()
})

it('V2切换题库立即清除旧显示，只用第一页请求新题库，迟到的旧响应不能覆盖', async () => {
  const late = deferred<any>(), nextTree = deferred<any>()
  vi.mocked(quizService.listLibraries).mockResolvedValue([
    { id: 1, name: '题库一', library_code: 'QL1', status: 'draft' }, { id: 2, name: '题库二', library_code: 'QL2', status: 'draft' },
  ] as any)
  vi.mocked(quizService.getContentTree).mockImplementation(id => id === 1 ? Promise.resolve(tree(1) as any) : nextTree.promise)
  vi.mocked(quizService.listV2Questions).mockImplementation(filters => filters.library_id === 2 ? Promise.resolve(result('第二题库内容') as any) : filters.page === 2 ? late.promise : Promise.resolve(result('第一题库内容') as any))
  render(<MemoryRouter initialEntries={['/admin/quiz/questions?tab=content&library_id=1']}><QuizV2Workbench /></MemoryRouter>)
  expect(await screen.findByText('第一题库内容')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '测试下一页' }))
  await waitFor(() => expect(quizService.listV2Questions).toHaveBeenLastCalledWith(expect.objectContaining({ library_id: 1, page: 2 }), expect.any(AbortSignal)))
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '选择题库' }))
  fireEvent.click(await screen.findByText('题库二 (QL2)', { selector: '.ant-select-item-option-content' }))
  expect(screen.queryByText('第一题库内容')).not.toBeInTheDocument()
  expect(screen.queryByText('模块1')).not.toBeInTheDocument()
  expect(await screen.findByText('第二题库内容')).toBeInTheDocument()
  expect(vi.mocked(quizService.listV2Questions).mock.calls.filter(([query]) => query.library_id === 2).every(([query]) => query.page === 1)).toBe(true)
  await act(async () => { late.resolve(result('迟到的第一题库内容', 2)); nextTree.resolve(tree(2)) })
  expect(screen.queryByText('迟到的第一题库内容')).not.toBeInTheDocument()
  expect(screen.getByText('第二题库内容')).toBeInTheDocument()
  expect(screen.getByTestId('pagination')).toHaveTextContent('1:20')
  expect([...screen.getByRole('combobox', { name: '测试每页数量' }).querySelectorAll('option')].map(option => option.value)).toEqual(['10','20','50','100','200','500','1000','1500','2000'])
  fireEvent.change(screen.getByRole('combobox', { name: '测试每页数量' }), { target: { value: '2000' } })
  await waitFor(() => expect(quizService.listV2Questions).toHaveBeenLastCalledWith(expect.objectContaining({ library_id: 2, page: 1, page_size: 2000 }), expect.any(AbortSignal)))
})

it('旧分类题目列表切换分类及大页时清除旧内容，保持选定的每页数量', async () => {
  const late = deferred<any>()
  vi.mocked(quizService.listQuestions).mockImplementation(filters => filters.category_id === 2 ? Promise.resolve(result('分类二内容', filters.page, filters.page_size) as any) : filters.page === 2 ? late.promise : Promise.resolve(result('分类一内容') as any))
  const props = { keyword: '', categories: [], canWrite: false, canImport: false, onKeywordChange: vi.fn(), onFilterChange: vi.fn(), onRefreshCategories: vi.fn() }
  const view = render(<MemoryRouter><QuestionTable {...props} filters={{ category_id: 1 }} /></MemoryRouter>)
  expect(await screen.findByText('分类一内容')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '测试下一页' }))
  await waitFor(() => expect(quizService.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: 1, page: 2 }), expect.any(AbortSignal)))
  view.rerender(<MemoryRouter><QuestionTable {...props} filters={{ category_id: 2 }} /></MemoryRouter>)
  expect(screen.queryByText('分类一内容')).not.toBeInTheDocument()
  expect(await screen.findByText('分类二内容')).toBeInTheDocument()
  await act(async () => { late.resolve(result('迟到的分类一', 2)) })
  expect(screen.queryByText('迟到的分类一')).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox', { name: '测试每页数量' }), { target: { value: '2000' } })
  await waitFor(() => expect(quizService.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: 2, page: 1, page_size: 2000 }), expect.any(AbortSignal)))
  fireEvent.click(screen.getByRole('button', { name: '测试下一页' }))
  await waitFor(() => expect(quizService.listQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ category_id: 2, page: 2, page_size: 2000 }), expect.any(AbortSignal)))
  expect(screen.getByTestId('pagination')).toHaveTextContent('2:2000')
})
