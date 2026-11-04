import { useCallback, useEffect, useState } from 'react'

export const QUESTION_PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200, 500, 1000, 1500, 2000]

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
