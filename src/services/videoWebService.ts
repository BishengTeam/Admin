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

  // 生成兑换码必须绑定归属人（方案决策 8：码仅本人可用）
  createCodes(data: { course_id: number; owner_user_id: number; quantity: number; note?: string }): Promise<VideoWebCodeItem[]> {
    return http.post('/admin/videoweb/codes', data)
  },

  searchOwners(keyword: string): Promise<PageData<VideoWebCodeOwner>> {
    return http.get('/admin/videoweb/users', { params: { keyword, page: 1, page_size: 20 } })
  },

  revokeCode(id: number, reason?: string): Promise<VideoWebCodeItem> {
    return http.post(`/admin/videoweb/codes/${id}/revoke`, { reason })
  },

  refundCode(id: number, reason?: string): Promise<VideoWebCodeItem> {
    return http.post(`/admin/videoweb/codes/${id}/refund`, { reason })
  },
}
