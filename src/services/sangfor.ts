import { http } from '@/core/request'
import type { RegistrationPaymentSummary } from '@/types/registrationPayment'

export interface SangforBatch {
  id: number; product_code: string; product_name: string; name: string; status: string
  exam_direction: string; description: string | null; exam_date: string | null; exam_location: string | null
  apply_start: string | null; apply_end: string | null; price_cents: number; capacity: number; enrolled: number; remaining_count: number
}
export interface SangforRegistration {
  id: number; order_id: number; batch_id: number; registration_no: string; status: string; order_status: string
  revision: number; current_version: number; price_cents: number; created_at: string; updated_at: string
  correction_due_at: string | null; candidate_snapshot: Record<string, string>; batch_snapshot: Record<string, string>
  payment_summary: RegistrationPaymentSummary
  versions: Array<{ version: number; submitted_at: string; snapshot: Record<string, string> }>
  reviews: Array<{ action: string; reason: string; version: number; created_at: string; correction_due_at: string | null }>
  exports: Array<{ version: number; sha256: string; created_at: string }>
}
export const SANGFOR_STATUS: Record<string, string> = {
  pending_payment: '待付款／核账', pending_review: '待初审', returned: '待补正', approved: '初审通过',
  final_approved: '外审通过', refund_processing: '退款处理中', refunded_closed: '已退款', cancelled: '已关闭',
}
export const sangforService = {
  batches: () => http.get<SangforBatch[]>('/admin/cert-products/sangfor/batches'),
  batch: (id: number) => http.get<SangforBatch>(`/admin/cert-products/sangfor/batches/${id}`),
  createBatch: (data: Record<string, unknown>) => http.post('/admin/cert-products/sangfor/batches', data),
  updateBatch: (id: number, data: Record<string, unknown>) => http.put(`/admin/cert-products/sangfor/batches/${id}`, data),
  batchAction: (id: number, action: 'publish' | 'close') => http.post(`/admin/cert-products/sangfor/batches/${id}/${action}`),
  registrations: (params: Record<string, unknown>) => http.get<{ items: SangforRegistration[]; total: number; page: number; page_size: number }>('/admin/cert-products/sangfor/registrations', { params }),
  registration: (id: number) => http.get<SangforRegistration>(`/admin/cert-products/sangfor/registrations/${id}`),
  review: (id: number, data: Record<string, unknown>) => http.post<SangforRegistration>(`/admin/cert-products/sangfor/registrations/${id}/review`, data),
  export: (batchId: number, ids: number[], token: string) => http.post<Blob>(`/admin/cert-products/sangfor/batches/${batchId}/export`,
    { registration_ids: ids }, { responseType: 'blob', headers: { 'X-Reauth-Token': token } }),
}
