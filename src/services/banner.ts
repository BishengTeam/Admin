import { http } from '@/core/request'
import type { Banner } from '@/types/banner'
import type { PageData, PageParams } from '@/types/api'

export const bannerService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<Banner>> {
    return http.get<PageData<Banner>>('/admin/banners', { params })
  },

  async create(data: Partial<Banner>): Promise<Banner> {
    return http.post<Banner>('/admin/banners', data)
  },

  async update(id: number, data: Partial<Banner>): Promise<void> {
    return http.put<void>(`/admin/banners/${id}`, data)
  },

  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/banners/${id}`)
  },

  async batchDelete(ids: number[]): Promise<void> {
    return http.post<void>('/admin/banners/batch-delete', { ids })
  },
}
