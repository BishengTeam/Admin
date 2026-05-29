export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100']
export const DEFAULT_PAGE_SIZE = 20

export const ORDER_STATUS_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待支付' },
  paid: { color: 'blue', text: '已支付' },
  completed: { color: 'green', text: '已完成' },
  refunded: { color: 'red', text: '已退款' },
  abnormal: { color: '#ff4d4f', text: '异常' },
}

export const USER_STATUS_MAP: Record<string, { color: string; text: string }> = {
  active: { color: 'green', text: '正常' },
  banned: { color: 'red', text: '已禁用' },
}

export const CONTENT_STATUS_MAP: Record<string, { color: string; text: string }> = {
  online: { color: 'green', text: '上架' },
  offline: { color: 'default', text: '下架' },
}

export const STATUS_OPTIONS = [
  { label: '上架', value: 'online' },
  { label: '下架', value: 'offline' },
]

export const COURSE_CATEGORIES = [
  { label: '华三', value: 'h3c' },
  { label: '深信服', value: 'sangfor' },
]

export const COURSE_CATEGORY_COLOR_MAP: Record<string, string> = {
  h3c: 'blue',
  sangfor: 'green',
}

export const ZONE_OPTIONS = [
  { label: '华三认证', value: '华三认证' },
  { label: '深信服认证', value: '深信服认证' },
  { label: '竞赛专区', value: '竞赛专区' },
  { label: '人社认证', value: '人社认证' },
]
