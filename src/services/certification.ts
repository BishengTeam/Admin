import { http } from '@/core/request'
import type { Certification } from '@/types/certification'
import type { PageData, PageParams } from '@/types/api'

export const certificationService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<Certification>> {
    return http.get<PageData<Certification>>('/admin/certifications', { params })
  },
  async create(data: Partial<Certification>): Promise<Certification> {
    return http.post<Certification>('/admin/certifications', data)
  },
  async update(id: number, data: Partial<Certification>): Promise<void> {
    return http.put<void>(`/admin/certifications/${id}`, data)
  },
  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/certifications/${id}`)
  },
}
