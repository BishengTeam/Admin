import { http } from '@/core/request'
import type { SharePoster } from '@/types/sharePoster'
import type { PageData, PageParams } from '@/types/api'

export const sharePosterService = {
  async list(params: PageParams): Promise<PageData<SharePoster>> {
    return http.get<PageData<SharePoster>>('/admin/share-posters', { params })
  },

  async create(data: Partial<SharePoster>): Promise<SharePoster> {
    return http.post<SharePoster>('/admin/share-posters', data)
  },

  async update(id: number, data: Partial<SharePoster>): Promise<void> {
    return http.put<void>(`/admin/share-posters/${id}`, data)
  },

  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/share-posters/${id}`)
  },

  async batchDelete(ids: number[]): Promise<void> {
    return http.post<void>('/admin/share-posters/batch-delete', { ids })
  },
}
