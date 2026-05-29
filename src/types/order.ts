export type OrderStatus = 'pending' | 'paid' | 'completed' | 'refunded' | 'abnormal'

export interface Order {
  id: number
  order_no: string
  user_name: string
  user_avatar: string
  cert_type: string
  amount: number
  status: OrderStatus
  user_phone: string
  created_at: string
}

export interface OrderFilter {
  status?: OrderStatus
  date_range?: [string, string]
  cert_type?: string
  user_phone?: string
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
