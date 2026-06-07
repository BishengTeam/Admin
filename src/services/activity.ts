import { http } from '@/core/request'
import type { Training } from '@/types/training'
import type { PageData, PageParams } from '@/types/api'

export const activityService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<Training>> {
    return http.get<PageData<Training>>('/admin/activities', { params })
  },
  async create(data: Partial<Training>): Promise<Training> {
    return http.post<Training>('/admin/activities', data)
  },
  async update(id: number, data: Partial<Training>): Promise<void> {
    return http.put<void>(`/admin/activities/${id}`, data)
  },
  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/activities/${id}`)
  },
}
