import { http } from '@/core/request'
import type { Competition, CompetitionPayload, CompetitionRegistration } from '@/types/competition'
import type { PageData, PageParams } from '@/types/api'

export const competitionAdminService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<Competition>> {
    return http.get<PageData<Competition>>('/admin/competitions', { params })
  },

  async create(data: CompetitionPayload): Promise<Competition> {
    return http.post<Competition>('/admin/competitions', data)
  },

  async update(id: number, data: Partial<CompetitionPayload>): Promise<Competition> {
    return http.put<Competition>(`/admin/competitions/${id}`, data)
  },

  async remove(id: number): Promise<void> {
    return http.delete<void>(`/admin/competitions/${id}`)
  },

  async listRegistrations(
    competitionId: number,
    params: { track_id?: number } & PageParams,
  ): Promise<PageData<CompetitionRegistration>> {
    return http.get<PageData<CompetitionRegistration>>(
      `/admin/competitions/${competitionId}/registrations`,
      { params },
    )
  },
}
