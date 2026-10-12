import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import UserList from '@/pages/users'
import { userService } from '@/services/users'

vi.mock('@/services/users', () => ({
  userService: {
    list: vi.fn(),
    reviewSummary: vi.fn(),
  },
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermission: vi.fn(() => true),
}))

describe('user review summary', () => {
  beforeAll(() => {
    const native = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => native(element))
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
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(userService.list).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    })
    vi.mocked(userService.reviewSummary).mockResolvedValue({
      identity_pending_count: 3,
      student_pending_count: 2,
      latest_pending: [],
    })
  })

  afterEach(cleanup)

  it('shows separate pending counts and filters the existing user list', async () => {
    render(<UserList />)

    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(await screen.findByText('2')).toBeInTheDocument()
    fireEvent.click(screen.getByText('3'))
    await waitFor(() => expect(userService.list).toHaveBeenCalledWith(
      expect.objectContaining({ identity_status: 'pending' }),
    ))
  })

  it('shows an explicit empty state when both queues are empty', async () => {
    vi.mocked(userService.reviewSummary).mockResolvedValue({
      identity_pending_count: 0,
      student_pending_count: 0,
      latest_pending: [],
    })
    render(<UserList />)

    expect(await screen.findAllByText('暂无待审核用户')).not.toHaveLength(0)
  })
})
