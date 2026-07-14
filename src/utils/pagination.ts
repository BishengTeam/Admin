import type { PageData } from '@/types/api'

export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PageData<T>>,
  pageSize = 100,
): Promise<T[]> {
  const first = await fetchPage(1, pageSize)
  const effectivePageSize = first.page_size || pageSize
  const totalPages = Math.ceil(first.total / effectivePageSize)

  if (totalPages <= 1) return first.items

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2, pageSize)),
  )
  return [first, ...remaining].flatMap((page) => page.items)
}
