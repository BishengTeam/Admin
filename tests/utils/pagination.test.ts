import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages } from '@/utils/pagination'

describe('fetchAllPages', () => {
  it('单页数据只请求一次', async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      items: [1, 2],
      total: 2,
      page: 1,
      page_size: 100,
    })

    await expect(fetchAllPages(fetchPage)).resolves.toEqual([1, 2])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('根据 total 拉取并合并剩余分页', async () => {
    const fetchPage = vi.fn(async (page: number, pageSize: number) => ({
      items: [page],
      total: 250,
      page,
      page_size: pageSize,
    }))

    await expect(fetchAllPages(fetchPage)).resolves.toEqual([1, 2, 3])
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 100)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 100)
    expect(fetchPage).toHaveBeenNthCalledWith(3, 3, 100)
  })
})
