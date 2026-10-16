import { http } from '@/core/request'
import type { Competition, CompetitionPayload, CompetitionRegistration, CompetitionSchoolStat } from '@/types/competition'
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

  /** 上传在线查阅附件 PDF，服务端转页图后返回标题与页图列表 */
  async uploadAttachment(file: File): Promise<{ title: string; page_count: number; pages: string[] }> {
    const formData = new FormData()
    formData.append('file', file)
    return http.post<{ title: string; page_count: number; pages: string[] }>(
      '/admin/competitions/attachment-upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 },
    )
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

  /** 按赛事导出报名 CSV（可按赛道筛选），返回 Blob 供浏览器下载 */
  async exportRegistrations(competitionId: number, trackId?: number): Promise<Blob> {
    return http.get<Blob>(
      `/admin/competitions/${competitionId}/registrations/export`,
      {
        params: { track_id: trackId },
        responseType: 'blob',
        timeout: 60000,
      },
    )
  },

  /** 按学校聚合报名人数（可按赛道筛选） */
  async getSchoolStats(competitionId: number, trackId?: number): Promise<CompetitionSchoolStat[]> {
    return http.get<CompetitionSchoolStat[]>(
      `/admin/competitions/${competitionId}/registrations/school-stats`,
      { params: { track_id: trackId } },
    )
  },
}
