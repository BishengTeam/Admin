import { useState, useEffect, useCallback } from 'react'
import { dashboardService } from '@/services/dashboard'
import { EMPTY_DASHBOARD_DATA } from '@/core/constants'
import type { DashboardData } from '@/types/dashboard'

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await dashboardService.getData()
      setData({ ...EMPTY_DASHBOARD_DATA, ...raw })
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refresh: fetch }
}
