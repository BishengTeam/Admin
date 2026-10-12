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

export interface VirtualProduct {
  id: number
  product_type: 'course' | 'quiz_library'
  content_key: string
  course_id: number | null
  library_id: number | null
  name: string
  cover_url: string | null
  description: string | null
  points_price: number
  stock_limit: number | null
  remaining_stock: number | null
  total_redeemed: number
  entitlement_days: number | null
  available_from: string | null
  available_to: string | null
  status: 'draft' | 'published' | 'offline'
  version: number
  created_at: string
  updated_at: string
}

export interface VirtualProductPayload {
  product_type: 'course' | 'quiz_library'
  course_id?: number | null
  library_id?: number | null
  name: string
  cover_url?: string | null
  description?: string | null
  points_price: number
  stock_limit?: number | null
  entitlement_days?: number | null
  available_from?: string | null
  available_to?: string | null
  status?: 'draft' | 'published' | 'offline'
}

export interface VirtualOrder {
  id: number
  order_no: string
  user_id: number
  product_id: number
  product_type: 'course' | 'quiz_library'
  product_name: string
  course_id: number | null
  library_id: number | null
  points_cost: number
  entitlement_days: number | null
  starts_at: string
  ends_at: string | null
  status: 'completed' | 'refunded'
  completed_at: string
  refunded_at: string | null
  created_at: string
  updated_at: string
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
  listVirtualProducts(params: PageParams & {
    status?: string
    product_type?: string
  }): Promise<PageData<VirtualProduct>> {
    return http.get('/admin/points-mall/virtual-products', { params })
  },
  createVirtualProduct(data: VirtualProductPayload): Promise<VirtualProduct> {
    return http.post('/admin/points-mall/virtual-products', data)
  },
  updateVirtualProduct(
    id: number,
    data: Partial<VirtualProductPayload>,
  ): Promise<VirtualProduct> {
    return http.put(`/admin/points-mall/virtual-products/${id}`, data)
  },
  listVirtualOrders(params: PageParams & {
    user_id?: number
    status?: string
  }): Promise<PageData<VirtualOrder>> {
    return http.get('/admin/points-mall/virtual-orders', { params })
  },
  refundVirtualOrder(
    id: number,
    data: { reason_code: string; reason_detail: string },
    reauthToken: string,
  ): Promise<void> {
    return http.post(
      `/admin/points-mall/virtual-orders/${id}/refund`,
      data,
      { headers: { 'X-Reauth-Token': reauthToken } },
    )
  },
}
