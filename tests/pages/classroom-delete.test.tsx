import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ClassroomManagement from '@/pages/classrooms'
import { classroomService } from '@/services/classroom'
import { useAuthStore } from '@/stores/authStore'

const mocks = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn() }))

vi.mock('@/services/classroom', () => ({
  classroomService: { list: mocks.list, remove: mocks.remove, create: vi.fn() },
}))

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
      matches: false, addListener() {}, removeListener() {}, addEventListener() {},
      removeEventListener() {}, dispatchEvent() {}, media: '',
    })),
  })
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    permissions: ['classroom:manage'],
    initialized: true,
    admin: {
      id: 1, username: 'teacher01', display_name: '王老师', role: 'teacher',
      is_active: true, must_change_password: false, locked_until: null,
      last_login_at: null, created_at: '', updated_at: '',
    },
  })
  vi.mocked(classroomService.list).mockResolvedValue({
    items: [{
      id: 42, name: '九月 H3C 晚班', status: 'active', teacher_name: '王老师',
      join_code: '123456', join_code_expires_at: null, student_count: 3,
      video_count: 2, question_count: 5, ongoing_quiz: false, created_at: '2026-09-01T10:00:00+08:00',
    }],
    total: 1,
    page: 1,
    page_size: 20,
  })
  vi.mocked(classroomService.remove).mockResolvedValue(undefined)
})

afterEach(cleanup)

it('课堂卡片提供删除入口，确认后调用删除接口并刷新列表', async () => {
  render(
    <MemoryRouter>
      <ClassroomManagement />
    </MemoryRouter>,
  )

  expect(await screen.findByText('九月 H3C 晚班')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /删除/ }))
  expect(await screen.findByText(/30 天内可在「回收站 → 教学课堂」恢复/)).toBeInTheDocument()

  // ConfirmButton 未指定 okText，直接点气泡里的主按钮
  const okButton = document.querySelector('.ant-popover:not(.ant-popover-hidden) .ant-btn-primary')
  expect(okButton).not.toBeNull()
  fireEvent.click(okButton!)

  await waitFor(() => expect(classroomService.remove).toHaveBeenCalledWith(42))
  await waitFor(() => expect(classroomService.list).toHaveBeenCalledTimes(2))
})
