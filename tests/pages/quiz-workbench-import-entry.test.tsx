import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import QuizV2Workbench from '@/pages/quiz/v2-workbench'
import { quizService } from '@/services/quiz'
import { useAuthStore } from '@/stores/authStore'

vi.mock('antd', async original => ({ ...await original<typeof import('antd')>(), Table: () => null }))
vi.mock('@/pages/quiz/components/V2QuestionModal', () => ({ default: () => null }))
vi.mock('@/services/quiz', () => ({ quizService: { listLibraries: vi.fn(), getLibrary: vi.fn(), getContentTree: vi.fn(), listV2Questions: vi.fn() } }))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}{location.search}</output>
}

beforeAll(() => {
  const computedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => computedStyle(element))
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} })) })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
beforeEach(() => { vi.clearAllMocks(); useAuthStore.setState({ permissions: ['quiz:list', 'quiz:import'], initialized: true }) })
afterEach(cleanup)

it('工作台内嵌导入记录已移除；上传题库跳转导入与任务页并携带当前题库', async () => {
  vi.mocked(quizService.listLibraries).mockResolvedValue([
    { id: 7, name: '导入目标库', library_code: 'QL7', status: 'draft', question_count: 3, practice_counts: { practicable: 3 } },
  ] as any)
  vi.mocked(quizService.getContentTree).mockResolvedValue({ library_id: 7, modules: [] } as any)
  vi.mocked(quizService.listV2Questions).mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0 } as any)
  render(
    <MemoryRouter initialEntries={['/admin/quiz/questions?tab=content&library_id=7']}>
      <Routes>
        <Route path="/admin/quiz/questions" element={<><QuizV2Workbench /><LocationProbe /></>} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(await screen.findByRole('button', { name: '上传题库' })).toBeInTheDocument()
  // 内嵌导入记录 Tab 与工具栏「导入」按钮均已删除
  expect(screen.queryByText('导入记录')).toBeNull()
  expect(screen.queryByRole('button', { name: '导入' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '上传题库' }))
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/quiz/imports?library_id=7'))
})
