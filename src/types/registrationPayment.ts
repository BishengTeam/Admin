export interface RegistrationPaymentSummary {
  order_id: number | null
  payment_channel: string
  order_status: string | null
  offline_status: string | null
  review_payment_allowed: boolean
  review_block_reason: string | null
}
