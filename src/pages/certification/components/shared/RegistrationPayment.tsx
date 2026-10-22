import { Tag } from 'antd'
import { OFFLINE_STATUS } from '@/services/offlinePayment'

import type { RegistrationPaymentSummary } from '@/types/registrationPayment'
export type { RegistrationPaymentSummary } from '@/types/registrationPayment'


export const PAYMENT_FILTER_OPTIONS = [
  { value: 'awaiting_proof', label: '待提交凭证' }, { value: 'under_review', label: '待核账' },
  { value: 'returned', label: '待补交凭证' }, { value: 'exception', label: '付款异常' },
  { value: 'confirmed', label: '核账通过' }, { value: 'closed', label: '已关闭' },
]

export function PaymentStatusTag({ summary }: { summary?: RegistrationPaymentSummary | null }) {
  if (!summary) return <Tag>待核实</Tag>
  if (summary.order_status === 'refunded' || summary.order_status === 'closed') return <Tag>已退款／关闭</Tag>
  if (summary.review_payment_allowed) return <Tag color='green'>核账通过</Tag>
  const state = summary.offline_status ? OFFLINE_STATUS[summary.offline_status] : null
  return <Tag color={summary.offline_status === 'exception' ? 'red' : 'orange'} title={summary.review_block_reason || undefined}>{state?.text || summary.review_block_reason || '待付款'}</Tag>
}
