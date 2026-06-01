import { useState, useEffect, useCallback } from 'react'
import { contentService } from '@/services/content'
import type { Banner } from '@/types/content'

export function useBannerList() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await contentService.listBanners()
      setBanners(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { banners, loading, refresh }
}
