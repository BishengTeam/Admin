import request from '@/core/request'
import type { User, UserFilter, UserDetail, UserOrderSummary, UserConversationSummary } from '@/types/user'
import type { PageData, PageParams } from '@/types/api'

export const userService = {
  async list(params: UserFilter & PageParams): Promise<PageData<User>> {
    return request.get('/admin/users', { params })
  },

  async detail(id: number): Promise<UserDetail> {
    return request.get(`/admin/users/${id}`)
  },

  async getOrders(id: number): Promise<UserOrderSummary[]> {
    return request.get(`/admin/users/${id}/orders`)
  },

  async getConversations(id: number): Promise<UserConversationSummary[]> {
    return request.get(`/admin/users/${id}/conversations`)
  },

  async updateStatus(id: number, status: string): Promise<void> {
    return request.patch(`/admin/users/${id}/status`, { status })
  },

  async deleteUsers(ids: number[]): Promise<void> {
    return request.post('/admin/users/batch-delete', { ids })
  },

  async exportUsers(params: UserFilter): Promise<Blob> {
    return request.get('/admin/users/export', { params, responseType: 'blob' })
  },
}
