import { useState, useEffect, useCallback, useRef } from 'react'
import type { PageData, PageParams } from '@/types/api'
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/core/constants'

interface PaginationState {
  current: number
  pageSize: number
  total: number
}

export function usePagination<T>(
  fetchFn: (params: PageParams) => Promise<PageData<T>>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<PageData<T> | null>(null)
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  })
  const mountedRef = useRef(true)
  const fetchFnRef = useRef(fetchFn)
  fetchFnRef.current = fetchFn

  const fetch = useCallback(
    async (page?: number, pageSize?: number) => {
      const currentPage = page ?? pagination.current
      const currentPageSize = pageSize ?? pagination.pageSize
      setLoading(true)
      try {
        const result = await fetchFnRef.current({
          page: currentPage,
          page_size: currentPageSize,
        })
        if (mountedRef.current) {
          setData(result)
          setPagination({
            current: result.page,
            pageSize: result.page_size,
            total: result.total,
          })
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    // fetchFn is kept in a ref — only re-fetch when deps change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )

  useEffect(() => {
    mountedRef.current = true
    fetch(1, pagination.pageSize)
    return () => {
      mountedRef.current = false
    }
  }, [fetch])

  const refresh = useCallback(() => {
    fetch(pagination.current, pagination.pageSize)
  }, [fetch, pagination.current, pagination.pageSize])

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      fetch(page, pageSize)
    },
    [fetch],
  )

  return {
    data,
    loading,
    pagination: {
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showTotal: (total: number) => `共 ${total} 条`,
      onChange: handlePageChange,
    },
    refresh,
  }
}
