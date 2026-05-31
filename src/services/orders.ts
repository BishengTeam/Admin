import { http } from '@/core/request'
import type { Order, OrderFilter, OrderDetail, ReconciliationData } from '@/types/order'
import type { PageData, PageParams } from '@/types/api'

export const orderService = {
  async list(params: OrderFilter & PageParams): Promise<PageData<Order>> {
    return http.get<PageData<Order>>('/admin/orders', { params })
  },

  async detail(id: number): Promise<OrderDetail> {
    return http.get<OrderDetail>(`/admin/orders/${id}`)
  },

  async refund(id: number, reason: string): Promise<void> {
    return http.post<void>(`/admin/orders/${id}/refund`, { reason })
  },

  async export(params: OrderFilter): Promise<Blob> {
    return http.get<Blob>('/admin/orders/export', { params, responseType: 'blob' })
  },

  async reconciliation(date: string): Promise<ReconciliationData> {
    return http.get<ReconciliationData>('/admin/orders/reconciliation', { params: { date } })
  },
}
