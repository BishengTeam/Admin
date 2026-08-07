import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return { instance }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mocks.instance),
    isCancel: vi.fn(() => false),
  },
}))

vi.mock('antd', () => ({ message: { error: vi.fn() } }))

describe('DELETE request bodies', () => {
  beforeEach(() => mocks.instance.delete.mockClear())

  it('preserves Axios config.data', async () => {
    const { http } = await import('@/core/request')
    const body = { lock_version: 3 }
    await http.delete('/admin/quiz/questions/101', { data: body })
    expect(mocks.instance.delete).toHaveBeenCalledWith('/admin/quiz/questions/101', { data: body })
  })
})
