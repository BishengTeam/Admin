import { http } from '@/core/request'
import type { Training } from '@/types/training'
import type { PageData, PageParams } from '@/types/api'

export const trainingService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<Training>> {
    return http.get<PageData<Training>>('/admin/training', { params })
  },
  async create(data: Partial<Training>): Promise<Training> {
    return http.post<Training>('/admin/training', data)
  },
  async update(id: number, data: Partial<Training>): Promise<void> {
    return http.put<void>(`/admin/training/${id}`, data)
  },
  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/training/${id}`)
  },
}
