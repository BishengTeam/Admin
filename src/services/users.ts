import { http } from '@/core/request'
import type { User, UserFilter, UserDetail, UserProfileDetail, UserOrderSummary, UserConversationSummary } from '@/types/user'
import type { PageData, PageParams } from '@/types/api'

export const userService = {
  async list(params: UserFilter & PageParams): Promise<PageData<User>> {
    return http.get<PageData<User>>('/admin/users', { params })
  },

  async detail(id: number): Promise<UserDetail> {
    return http.get<UserDetail>(`/admin/users/${id}`)
  },

  async getOrders(id: number): Promise<UserOrderSummary[]> {
    return http.get<UserOrderSummary[]>(`/admin/users/${id}/orders`)
  },

  async getProfile(id: number): Promise<UserProfileDetail> {
    return http.get<UserProfileDetail>(`/admin/users/${id}/profile`)
  },

  async getConversations(id: number): Promise<UserConversationSummary[]> {
    return http.get<UserConversationSummary[]>(`/admin/users/${id}/conversations`)
  },

  async updateStatus(id: number, is_active: boolean): Promise<void> {
    return http.patch<void>(`/admin/users/${id}/status`, { is_active })
  },

  // ===== Level-2 审核 =====

  async reviewRealname(id: number, data: { status: string; comment?: string }): Promise<void> {
    return http.put<void>(`/admin/users/${id}/identity/review`, data)
  },

  /** @deprecated 使用 reviewRealname */
  reviewIdentity: (id: number, data: { status: string; comment?: string }) =>
    http.put<void>(`/admin/users/${id}/identity/review`, data),

  async reviewStudent(id: number, data: { status: string; comment?: string }): Promise<void> {
    return http.put<void>(`/admin/users/${id}/student/review`, data)
  },

  async reviewEnterprise(id: number, data: { status: string; comment?: string }): Promise<void> {
    return http.put<void>(`/admin/users/${id}/enterprise/review`, data)
  },

  async deleteUsers(ids: number[]): Promise<void> {
    return http.post<void>('/admin/users/batch-delete', { ids })
  },

  async exportUsers(params: UserFilter): Promise<Blob> {
    return http.get<Blob>('/admin/users/export', { params, responseType: 'blob' })
  },
}
