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

  it('recognizes the frozen 404/40300 not-found contract', async () => {
    const { ApiError, isNotFoundError, isPermissionError, isRateLimitError } = await import('@/core/request')
    expect(isNotFoundError(new ApiError({ message: '不存在', status: 404 }))).toBe(true)
    expect(isNotFoundError(new ApiError({ message: '不存在', code: 40300 }))).toBe(true)
    expect(isNotFoundError(new ApiError({ message: '冲突', status: 409, code: 40201 }))).toBe(false)
    expect(isPermissionError(new ApiError({ message: '无权限', status: 403, code: 40101 }))).toBe(true)
    expect(isRateLimitError(new ApiError({ message: '限流', status: 429, code: 40202 }))).toBe(true)
  })
})
