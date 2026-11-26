import { http } from '@/core/request'
import type { PageData } from '@/types/api'

export interface VideoWebCodeOwner {
  user_id: number
  display_name: string
  real_name?: string | null
  declared_name?: string | null
  nickname?: string | null
  phone?: string | null
}

export interface VideoWebCodeItem {
  id: number
  code: string
  course_id: number
  status: 'issued' | 'redeemed' | 'revoked' | 'refunded'
  source_type?: string | null
  source_order_id?: number | null
  owner_user_id?: number | null
  owner?: VideoWebCodeOwner | null
  owner_miniapp_user_id?: number | null
  redeemed_by?: number | null
  redeemed_at?: string | null
  revoked_at?: string | null
  revoke_reason?: string | null
  revoked_by?: number | null
  note?: string | null
  created_at: string
}

export interface VideoWebLearner {
  user_id: number
  display_name: string
  phone?: string | null
  created_at: string
  entitlement_count: number
  last_learned_at?: string | null
  access_disabled_at?: string | null
  is_active: boolean
}

export interface VideoWebEntitlement {
  enrollment_id: number
  course_id: number
  course_title: string
  course_status: string
  status: string
  learning_access: boolean
  source?: string | null
  course_code_id?: number | null
  access_granted_at?: string | null
  access_revoked_at?: string | null
}

export interface VideoWebCodeFilter {
  course_id?: number
  status?: VideoWebCodeItem['status']
  owner_user_id?: number
  page?: number
  page_size?: number
}

export const videoWebService = {
  listCodes(params: VideoWebCodeFilter, signal?: AbortSignal): Promise<PageData<VideoWebCodeItem>> {
    return http.get('/admin/videoweb/codes', { params, signal })
  },

  // 匿名码：生成时不绑人，兑换时绑定兑换人
  createCodes(data: { course_id: number; quantity: number; note?: string }): Promise<VideoWebCodeItem[]> {
    return http.post('/admin/videoweb/codes', data)
  },

  revokeCode(id: number, reason?: string): Promise<VideoWebCodeItem> {
    return http.post(`/admin/videoweb/codes/${id}/revoke`, { reason })
  },

  listLearners(params: { keyword?: string; page?: number; page_size?: number }): Promise<PageData<VideoWebLearner>> {
    return http.get('/admin/videoweb/learners', { params })
  },

  listEntitlements(userId: number): Promise<VideoWebEntitlement[]> {
    return http.get(`/admin/videoweb/learners/${userId}/entitlements`)
  },

  setAccess(userId: number, enabled: boolean): Promise<{ user_id: number; enabled: boolean; access_disabled_at: string | null }> {
    return http.post(`/admin/videoweb/learners/${userId}/access-status`, { enabled })
  },

  refundCode(id: number, reason?: string): Promise<VideoWebCodeItem> {
    return http.post(`/admin/videoweb/codes/${id}/refund`, { reason })
  },
}
