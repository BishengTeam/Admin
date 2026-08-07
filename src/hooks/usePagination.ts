import { useState, useEffect, useCallback, useRef } from 'react'
import { message } from 'antd'
import type { PageData, PageParams } from '@/types/api'
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/core/constants'
import { isApiError } from '@/core/request'

interface PaginationState {
  current: number
  pageSize: number
  total: number
}

export function usePagination<T>(
  fetchFn: (params: PageParams, signal?: AbortSignal) => Promise<PageData<T>>,
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
  const requestSeqRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)
  fetchFnRef.current = fetchFn

  const fetch = useCallback(
    async (page?: number, pageSize?: number) => {
      const currentPage = page ?? pagination.current
      const currentPageSize = pageSize ?? pagination.pageSize
      const seq = ++requestSeqRef.current
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      setLoading(true)
      try {
        const result = await fetchFnRef.current({
          page: currentPage,
          page_size: currentPageSize,
        }, controller.signal)
        if (mountedRef.current && seq === requestSeqRef.current) {
          setData(result)
          setPagination({
            current: result.page,
            pageSize: result.page_size,
            total: result.total,
          })
        }
      } catch (error) {
        if (!controller.signal.aborted && mountedRef.current && seq === requestSeqRef.current) {
          console.error('[pagination request failed]', error)
          // The request interceptor deliberately keeps business errors quiet
          // so quiz pages can render field-level details.  Generic paginated
          // pages still need a visible failure notification.
          if (!(isApiError(error) && (error.status == null || error.status >= 500))) {
            message.error(error instanceof Error ? error.message : '请求失败')
          }
        }
      } finally {
        if (mountedRef.current && seq === requestSeqRef.current) {
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
      controllerRef.current?.abort()
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
