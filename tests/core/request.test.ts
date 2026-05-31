import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock axios before importing the module under test
vi.mock('axios', () => {
  const mockInstance = {
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
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  }
})

// Mock antd message
vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
  },
}))

describe('request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('http 对象导出 get/post/put/patch/delete 方法', async () => {
    const { http } = await import('@/core/request')
    expect(typeof http.get).toBe('function')
    expect(typeof http.post).toBe('function')
    expect(typeof http.put).toBe('function')
    expect(typeof http.patch).toBe('function')
    expect(typeof http.delete).toBe('function')
  })
})
