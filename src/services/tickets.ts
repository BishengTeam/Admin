import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'
import type { Ticket, TicketStatus } from '@/types/ticket'

export interface TicketBatchStatusResult {
  updated: number
  skipped: number
}

export const ticketService = {
  /** GET /admin/tickets */
  async list(params: { status?: string } & PageParams): Promise<PageData<Ticket>> {
    return http.get<PageData<Ticket>>('/admin/tickets', { params })
  },

  /** PUT /admin/tickets/:id */
  async update(id: number, data: { status?: string; teacher_id?: number }): Promise<Ticket> {
    return http.put<Ticket>(`/admin/tickets/${id}`, data)
  },

  /** POST /admin/tickets/batch-status —— 单事务批量改状态，返回更新/跳过条数 */
  async batchUpdateStatus(ids: number[], status: TicketStatus): Promise<TicketBatchStatusResult> {
    return http.post<TicketBatchStatusResult>('/admin/tickets/batch-status', { ids, status })
  },
}
