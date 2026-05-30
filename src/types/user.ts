export interface User {
  id: number
  openid: string
  phone: string
  is_active: boolean
  created_at: string
}

export interface UserFilter {
  openid?: string
  phone?: string
  created_at_start?: string
  created_at_end?: string
}

export interface UserDetail extends User {
  phone: string
  email?: string
  school?: string
  orders: UserOrderSummary[]
  conversations: UserConversationSummary[]
}

export interface UserOrderSummary {
  id: number
  out_trade_no: string
  price: number
  status: string
  created_at: string
}

export interface UserConversationSummary {
  id: number
  message: string
  intent: string
  created_at: string
}
