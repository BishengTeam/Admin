// 后端实际返回的扁平统计数据结构
export interface DashboardData {
  total_users: number
  total_orders: number
  recent_orders_30d: number
  paid_orders: number
  revenue_fen: number
  recent_revenue_30d_fen: number
  conversion_rate: number
}
