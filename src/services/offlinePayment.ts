import { http } from '@/core/request'

export const OFFLINE_STATUS: Record<string, { text: string; color: string }> = {
  awaiting_proof: { text: '待提交凭证', color: 'orange' }, under_review: { text: '待核账', color: 'blue' },
  returned: { text: '待补交', color: 'orange' }, exception: { text: '异常待处理', color: 'red' },
  refunded: { text: '款项已退回', color: 'default' }, confirmed: { text: '已确认到账', color: 'green' }, closed: { text: '已关闭', color: 'default' },
}
export const CHANNEL_LABELS: Record<string, string> = { bank_transfer: '银行转账', wechat: '微信支付（历史）', free: '零元', unknown: '历史渠道待核实' }
export interface PaymentMaterial { id: number; filename: string; size_bytes: number; content_type: string }
export interface PaymentSubmission {
  version: number; status: string; reason: string | null; created_at: string; payer: string
  transfer_time: string; amount_cents: number; bank_reference: string; note: string; material_ids: number[]
}
export interface PaymentSettings {
  account_name: string; bank_name: string; account_number: string; transfer_note: string
  contact_name: string; contact_phone: string; contact_wechat: string; service_hours: string
  submit_hours: number; correction_hours: number; version: number
}
export interface OfflinePayment {
  order_id: number; order_status: string; amount_cents: number; current_version: number; status: string
  status_label: string; out_trade_no: string; account: PaymentSettings; message: string | null; deadline: string | null
  refund_business: string; generic_refund_approved: boolean
  business_link?: { vendor: 'h3c' | 'nisp' | 'renshe' | 'sangfor'; registration_id: number; batch_id: number } | null
  confirmed_at: string | null; submissions: PaymentSubmission[]; materials: PaymentMaterial[]
  entries: Array<{ kind: string; amount_cents: number; bank_reference: string; bank_time: string; created_at: string; material_ids: number[] }>
  audits: Array<{ action: string; actor_id: number; created_at: string; summary: { note?: string; version: number; amount_cents?: number | null; bank_reference?: string | null; bank_time?: string | null; deadline?: string | null; result?: string } }>
}
export const offlinePaymentService = {
  detail(id: number) { return http.get<OfflinePayment>(`/admin/orders/${id}/offline-payment`) },
  settings() { return http.get<PaymentSettings | null>('/admin/orders/offline-payment-settings') },
  saveSettings(body: PaymentSettings, token: string) { return http.put<PaymentSettings>('/admin/orders/offline-payment-settings', body, { headers: { 'X-Reauth-Token': token } }) },
  decide(id: number, action: string, body: Record<string, unknown>, token?: string) {
    return http.post<{ status: string }>(`/admin/orders/${id}/offline-payment/${action}`, body, { headers: token ? { 'X-Reauth-Token': token } : {} })
  },
  upload(id: number, file: File) { const body = new FormData(); body.append('file', file); return http.post<PaymentMaterial>(`/admin/orders/${id}/offline-payment/materials`, body) },
  content(id: number, materialId: number) { return http.get<Blob>(`/admin/orders/${id}/offline-payment/materials/${materialId}/content`, { responseType: 'blob' }) },
  summary() { return http.get<{ counts: Record<string, number>; products: Array<{ label: string; value: string }>; batches: Array<{ label: string; value: number }> }>('/admin/orders/offline-payment-summary') },
}
