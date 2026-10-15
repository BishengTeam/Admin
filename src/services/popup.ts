import { http } from '@/core/request'
import type { Popup } from '@/types/popup'
import type { PageData, PageParams } from '@/types/api'

export const popupService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<Popup>> {
    return http.get<PageData<Popup>>('/admin/popups', { params })
  },

  async create(data: Partial<Popup>): Promise<Popup> {
    return http.post<Popup>('/admin/popups', data)
  },

  async update(id: number, data: Partial<Popup>): Promise<void> {
    return http.put<void>(`/admin/popups/${id}`, data)
  },

  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/popups/${id}`)
  },

  async batchDelete(ids: number[]): Promise<void> {
    return http.post<void>('/admin/popups/batch-delete', { ids })
  },
}
