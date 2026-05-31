import { http } from '@/core/request'
import type { DashboardData } from '@/types/dashboard'

export const dashboardService = {
  async getData(): Promise<DashboardData> {
    return http.get<DashboardData>('/admin/statistics/dashboard')
  },
}
