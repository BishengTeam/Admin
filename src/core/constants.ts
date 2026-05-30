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
  { label: '华三', value: 'h3c' },
  { label: '深信服', value: 'sangfor' },
]

export const COURSE_CATEGORY_COLOR_MAP: Record<string, string> = {
  h3c: 'blue',
  sangfor: 'green',
}

export const ZONE_OPTIONS = [
  { label: '华三认证', value: 'h3c' },
  { label: '深信服认证', value: 'sangfor' },
  { label: '竞赛专区', value: 'competition' },
  { label: '人社认证', value: 'renshe' },
]
