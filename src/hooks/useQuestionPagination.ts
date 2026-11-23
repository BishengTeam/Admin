import { useCallback, useEffect, useState } from 'react'

import { PAGE_SIZE_OPTIONS } from '@/core/constants'

/** 与全站列表共用同一组每页条数，避免题库工作台与其它页面的下拉漂移 */
export const QUESTION_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS

/** Reset filters and pagination together, before a new-scope request can use an old page. */
export function useQuestionPagination(scope: string) {
  const [state, setState] = useState({ scope, page: 1, pageSize: 20 })
  const page = state.scope === scope ? state.page : 1
  useEffect(() => {
    setState(current => current.scope === scope ? current : { ...current, scope, page: 1 })
  }, [scope])
  const changePage = useCallback((nextPage: number, nextSize: number) => {
    setState(current => ({ scope, page: nextSize !== current.pageSize ? 1 : nextPage, pageSize: nextSize }))
  }, [scope])
  return { page, pageSize: state.pageSize, changePage }
}
