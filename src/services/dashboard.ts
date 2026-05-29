import request from '@/core/request'
import type { DashboardData } from '@/types/dashboard'

export const dashboardService = {
  async getData(): Promise<DashboardData> {
    return request.get('/admin/statistics/dashboard')
  },
}
