import type { ReactNode } from 'react'
import {
  UserOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  CalendarOutlined,
  PercentageOutlined,
} from '@ant-design/icons'

export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100']
export const DEFAULT_PAGE_SIZE = 20

export const ORDER_STATUS_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待支付' },
  paid: { color: 'blue', text: '已支付' },
  completed: { color: 'green', text: '已完成' },
  refunded: { color: 'red', text: '已退款' },
  abnormal: { color: '#ff4d4f', text: '异常' },
  closed: { color: 'default', text: '已关闭' },
}

export const USER_STATUS_MAP: Record<string, { color: string; text: string }> = {
  true: { color: 'green', text: '正常' },
  false: { color: 'red', text: '已禁用' },
}

export const CONTENT_STATUS_MAP: Record<string, { color: string; text: string }> = {
  true: { color: 'green', text: '上架' },
  false: { color: 'default', text: '下架' },
}

export const STATUS_OPTIONS = [
  { label: '上架', value: true },
  { label: '下架', value: false },
]

export const COURSE_CATEGORIES = [
  { label: '基础', value: 'basic' },
  { label: 'H3C', value: 'h3c' },
  { label: '深信服', value: 'sangfor' },
  { label: 'NISP', value: 'nisp' },
  { label: '人社', value: 'renshe' },
]

export const COURSE_CATEGORY_COLOR_MAP: Record<string, string> = {
  basic: 'cyan',
  primary: 'blue',
  intermediate: 'geekblue',
  h3c: 'purple',
  sangfor: 'green',
  nisp: 'orange',
  renshe: 'magenta',
}

export const ZONE_OPTIONS = [
  { label: '华三认证', value: 'h3c' },
  { label: '深信服认证', value: 'sangfor' },
  { label: '竞赛专区', value: 'competition' },
  { label: '人社认证', value: 'renshe' },
]

export interface StatCardConfig {
  key: keyof import('@/types/dashboard').DashboardData
  title: string
  icon: ReactNode
  color: string
  suffix?: string
  /** 是否为金额字段（fen → 元，除以 100） */
  isAmount?: boolean
}

export const DASHBOARD_STAT_CARDS: StatCardConfig[] = [
  { key: 'total_users' as const, title: '注册用户数', icon: <UserOutlined />, color: '#1677ff' },
  { key: 'total_orders' as const, title: '订单总数', icon: <ShoppingCartOutlined />, color: '#722ed1' },
  { key: 'recent_orders_30d' as const, title: '近30日订单', icon: <CalendarOutlined />, color: '#eb2f96' },
  { key: 'paid_orders' as const, title: '已支付订单', icon: <CheckCircleOutlined />, color: '#13c2c2' },
  { key: 'recent_revenue_30d_fen' as const, title: '近30日营收', icon: <RiseOutlined />, color: '#fa8c16', suffix: '', isAmount: true },
  { key: 'conversion_rate' as const, title: '付费转化率', icon: <PercentageOutlined />, color: '#52c41a', suffix: '%' },
]

export const EMPTY_DASHBOARD_DATA: import('@/types/dashboard').DashboardData = {
  total_users: 0,
  total_orders: 0,
  recent_orders_30d: 0,
  paid_orders: 0,
  revenue_fen: 0,
  recent_revenue_30d_fen: 0,
  conversion_rate: 0,
}