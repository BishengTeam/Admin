import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const state = vi.hoisted(() => ({
  batch: vi.fn(),
  update: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => false }))
vi.mock('@/hooks/usePagination', () => ({
  usePagination: () => ({
    data: {
      items: [
        { id: 11, user_id: 1, teacher_id: null, content: 'A', status: 'waiting_manual', created_at: '2026-11-20T10:00:00+08:00', updated_at: '2026-11-20T10:00:00+08:00' },
        { id: 12, user_id: 2, teacher_id: null, content: 'B', status: 'processing', created_at: '2026-11-20T10:00:00+08:00', updated_at: '2026-11-20T10:00:00+08:00' },
      ],
      total: 2,
      page: 1,
      page_size: 20,
    },
    loading: false,
    pagination: { current: 1, pageSize: 20, total: 2 },
    refresh: state.refresh,
  }),
}))
vi.mock('@/services/tickets', () => ({
  ticketService: {
    list: vi.fn(),
    update: state.update,
    batchUpdateStatus: state.batch,
  },
}))

import TicketManagement from '@/pages/tickets/index'

describe('ticket batch status', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    state.batch.mockReset()
    state.update.mockReset()
    state.refresh.mockReset()
  })
  afterEach(cleanup)

  it('keeps batch actions disabled until rows are selected', () => {
    render(<TicketManagement />)

    expect(screen.getByText('已选 0 条')).toBeTruthy()
    const processing = screen.getByRole('button', { name: '批量标记处理中' }) as HTMLButtonElement
    const resolved = screen.getByRole('button', { name: '批量标记已解决' }) as HTMLButtonElement
    expect(processing.disabled).toBe(true)
    expect(resolved.disabled).toBe(true)
  })

  it('confirms, posts the selected ids and clears the selection', async () => {
    state.batch.mockResolvedValue({ updated: 2, skipped: 0 })
    render(<TicketManagement />)

    // 第一个 checkbox 是表头全选，后两个是数据行
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    expect(screen.getByText('已选 1 条')).toBeTruthy()
    const resolved = screen.getByRole('button', { name: '批量标记已解决' }) as HTMLButtonElement
    expect(resolved.disabled).toBe(false)

    fireEvent.click(resolved)
    fireEvent.click(await screen.findByText('确认更新'))

    await waitFor(() => {
      expect(state.batch).toHaveBeenCalledWith([11], 'resolved')
    })
    expect(state.refresh).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText('已选 0 条')).toBeTruthy()
    })
  })
})
