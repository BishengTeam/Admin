import { http } from '@/core/request'
import type { Activity, ActivityRegistration } from '@/types/activity'
import type { PageData, PageParams } from '@/types/api'

export const activityService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<Activity>> {
    return http.get<PageData<Activity>>('/admin/activities', { params })
  },
  async create(data: Partial<Activity>): Promise<Activity> {
    return http.post<Activity>('/admin/activities', data)
  },
  async update(id: number, data: Partial<Activity>): Promise<void> {
    return http.put<void>(`/admin/activities/${id}`, data)
  },
  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/activities/${id}`)
  },
  async listRegistrations(
    activityId: number,
    params: PageParams,
  ): Promise<PageData<ActivityRegistration>> {
    return http.get<PageData<ActivityRegistration>>(
      `/admin/activities/${activityId}/registrations`,
      { params },
    )
  },
}
