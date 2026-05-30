export type OrderStatus = 'pending' | 'paid' | 'completed' | 'refunded' | 'abnormal' | 'closed'

export interface Order {
  id: number
  out_trade_no: string
  candidate_name: string
  cert_type: string
  price: number
  status: OrderStatus
  candidate_phone: string
  created_at: string
}

export interface OrderFilter {
  status?: OrderStatus
  start_time?: string
  end_time?: string
  cert_type?: string
}

export interface OrderDetail extends Order {
  pay_time?: string
  refund_time?: string
  refund_reason?: string
  refund_amount?: number
}

export interface ReconciliationData {
  date: string
  order_total: number
  refund_total: number
  net_income: number
  order_count: number
}
