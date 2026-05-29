import request from '@/core/request'
import type { Order, OrderFilter, OrderDetail, ReconciliationData } from '@/types/order'
import type { PageData, PageParams } from '@/types/api'

export const orderService = {
  async list(params: OrderFilter & PageParams): Promise<PageData<Order>> {
    return request.get('/admin/orders', { params })
  },

  async detail(id: number): Promise<OrderDetail> {
    return request.get(`/admin/orders/${id}`)
  },

  async refund(id: number, reason: string): Promise<void> {
    return request.post(`/admin/orders/${id}/refund`, { reason })
  },

  async export(params: OrderFilter): Promise<Blob> {
    return request.get('/admin/orders/export', { params, responseType: 'blob' })
  },

  async reconciliation(date: string): Promise<ReconciliationData> {
    return request.get('/admin/orders/reconciliation', { params: { date } })
  },
}
