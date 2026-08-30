import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'
import type { Ticket } from '@/types/ticket'

export const ticketService = {
  /** GET /admin/tickets */
  async list(params: { status?: string } & PageParams): Promise<PageData<Ticket>> {
    return http.get<PageData<Ticket>>('/admin/tickets', { params })
  },

  /** PUT /admin/tickets/:id */
  async update(id: number, data: { status?: string; teacher_id?: number }): Promise<Ticket> {
    return http.put<Ticket>(`/admin/tickets/${id}`, data)
  },
}
