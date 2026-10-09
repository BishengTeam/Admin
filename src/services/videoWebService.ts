import { http } from '@/core/request'
import type { PageData } from '@/types/api'

export interface VideoWebCodeItem {
  id: number
  code: string
  course_id: number
  status: 'issued' | 'redeemed' | 'revoked' | 'refunded'
  source_type?: string | null
  source_order_id?: number | null
  owner_miniapp_user_id?: number | null
  redeemed_by?: number | null
  redeemed_at?: string | null
  revoked_at?: string | null
  created_at: string
}

export interface VideoWebCodeFilter {
  course_id?: number
  status?: VideoWebCodeItem['status']
  page?: number
  page_size?: number
}

export const videoWebService = {
  listCodes(params: VideoWebCodeFilter, signal?: AbortSignal): Promise<PageData<VideoWebCodeItem>> {
    return http.get('/admin/videoweb/codes', { params, signal })
  },

  createCodes(data: { course_id: number; quantity: number; note?: string }): Promise<VideoWebCodeItem[]> {
    return http.post('/admin/videoweb/codes', data)
  },

  revokeCode(id: number, reason?: string): Promise<VideoWebCodeItem> {
    return http.post(`/admin/videoweb/codes/${id}/revoke`, { reason })
  },

  refundCode(id: number, reason?: string): Promise<VideoWebCodeItem> {
    return http.post(`/admin/videoweb/codes/${id}/refund`, { reason })
  },
}
