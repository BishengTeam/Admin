import { http } from '@/core/request'
import type { Job } from '@/types/job'
import type { PageData, PageParams } from '@/types/api'

export const jobService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<Job>> {
    return http.get<PageData<Job>>('/admin/jobs', { params })
  },
  async create(data: Partial<Job>): Promise<Job> {
    return http.post<Job>('/admin/jobs', data)
  },
  async update(id: number, data: Partial<Job>): Promise<void> {
    return http.put<void>(`/admin/jobs/${id}`, data)
  },
  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/jobs/${id}`)
  },
}
