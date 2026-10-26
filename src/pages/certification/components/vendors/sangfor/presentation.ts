import type { SangforRegistration } from '@/services/sangfor'
import { SANGFOR_STATUS } from '@/services/sangfor'

export const BATCH_STATUS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' }, published: { text: '已发布', color: 'green' },
  registration_closed: { text: '报名关闭', color: 'orange' }, finalized: { text: '已结束', color: 'blue' },
  archived: { text: '已归档', color: 'default' }, cancelled: { text: '已取消', color: 'red' },
}
const COLORS: Record<string, string> = { pending_payment: 'orange', pending_review: 'orange', returned: 'red',
  approved: 'green', final_approved: 'green', refund_processing: 'processing', refunded_closed: 'default', cancelled: 'default' }
export const REGISTRATION_STATUS = Object.fromEntries(Object.entries(SANGFOR_STATUS).map(([key, text]) => [key, { text, color: COLORS[key] || 'default' }]))
export const STATUS_OPTIONS = Object.entries(BATCH_STATUS).map(([value, item]) => ({ value, label: item.text }))
export const BATCH_LIST_CONTEXT_KEY = 'sangfor.batch-list.context'
export interface BatchListContext { keyword?: string; product?: string; status?: string; page?: number; pageSize?: number }
export function readBatchListContext(): BatchListContext {
  try { return JSON.parse(window.sessionStorage.getItem(BATCH_LIST_CONTEXT_KEY) || '{}') as BatchListContext }
  catch { return {} }
}
export function exportable(row: SangforRegistration): boolean {
  return ['approved', 'final_approved'].includes(row.status) && row.payment_summary.review_payment_allowed
}
