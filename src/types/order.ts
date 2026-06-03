export type OrderStatus = 'pending' | 'paid' | 'completed' | 'refunded' | 'closed'

// ── 各认证类型差异化报名数据 ──

export interface H3CExtraData {
  gender: string
  education: string
  organization: string
  country: string
  language: string
  first_name: string
  last_name: string
  exam_date: string
}

export interface SangforExtraData {
  exam_date: string
  email: string
  first_name: string
  last_name: string
  mailing_address: string
  organization: string
  exam_direction: string
}

export interface Nisp1ExtraData {
  pinyin: string
  major: string
  school: string
  province: string
}

export interface Nisp2ExtraData {
  pinyin: string
  school: string
  gender: string
  age: string
  education: string
  major: string
  province: string
  address: string
  zip_code: string
}

export interface RensheExtraData {
  branch: string
}

export type CertExtraData =
  | H3CExtraData
  | SangforExtraData
  | Nisp1ExtraData
  | Nisp2ExtraData
  | RensheExtraData
  | Record<string, unknown>

// ── 订单 ──

export interface Order {
  id: number
  out_trade_no: string
  candidate_name: string
  cert_type: string
  price: number
  status: OrderStatus
  candidate_phone: string
  created_at: string
  extra_data: CertExtraData | null
  attachments: string[] | null
}

export interface OrderFilter {
  status?: OrderStatus
  start_time?: string
  end_time?: string
  cert_type?: string
  phone?: string
  date_range?: [string, string]
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
