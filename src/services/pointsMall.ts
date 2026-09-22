import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'

export interface PointsMallItem {
  id: number
  name: string
  description: string | null
  discount_type: 'fixed' | 'percent'
  discount_value: number
  scope_type: 'global' | 'category' | 'product'
  scope_value: string | null
  min_order_amount_cents: number
  points_cost: number
  total_stock: number
  total_redeemed: number
  remaining_stock: number
  per_user_limit: number
  validity_type: 'days' | 'fixed_date'
  validity_days: number | null
  valid_until: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PointsMallItemPayload {
  name: string
  description?: string | null
  discount_type: 'fixed' | 'percent'
  discount_value: number
  scope_type: 'global' | 'category' | 'product'
  scope_value?: string | null
  min_order_amount_cents?: number
  points_cost: number
  total_stock?: number
  per_user_limit?: number
  validity_type: 'days' | 'fixed_date'
  validity_days?: number | null
  valid_until?: string | null
  sort_order?: number
}

export const pointsMallService = {
  list(params: PageParams): Promise<PageData<PointsMallItem>> {
    return http.get('/admin/points-mall/items', { params })
  },
  create(data: PointsMallItemPayload): Promise<PointsMallItem> {
    return http.post('/admin/points-mall/items', data)
  },
  update(id: number, data: Partial<PointsMallItemPayload> & { is_active?: boolean }): Promise<PointsMallItem> {
    return http.put(`/admin/points-mall/items/${id}`, data)
  },
  deactivate(id: number): Promise<void> {
    return http.delete(`/admin/points-mall/items/${id}`)
  },
}
