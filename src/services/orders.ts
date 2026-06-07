import { http } from '@/core/request'
import type { Order, OrderFilter, OrderDetail, ReconciliationData } from '@/types/order'
import type { PageData, PageParams } from '@/types/api'

function toApiParams(params: Record<string, unknown>): Record<string, unknown> {
  const { date_range, ...rest } = params
  if (Array.isArray(date_range) && date_range.length === 2) {
    return { ...rest, start_time: date_range[0], end_time: date_range[1] }
  }
  return rest
}

export const orderService = {
  async list(params: OrderFilter & PageParams): Promise<PageData<Order>> {
    return http.get<PageData<Order>>('/admin/orders', { params: toApiParams(params as Record<string, unknown>) })
  },

  async detail(id: number): Promise<OrderDetail> {
    return http.get<OrderDetail>(`/admin/orders/${id}`)
  },

  async refund(id: number, reason: string): Promise<void> {
    return http.post<void>(`/admin/orders/${id}/refund`, { reason })
  },

  async export(params: OrderFilter): Promise<Blob> {
    return http.get<Blob>('/admin/orders/export', { params: toApiParams(params as Record<string, unknown>), responseType: 'blob' })
  },

  async reconciliation(date: string): Promise<ReconciliationData> {
    return http.get<ReconciliationData>('/admin/orders/reconciliation', { params: { date } })
  },
}
