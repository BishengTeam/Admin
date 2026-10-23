/** Banner 列表项，对应后端 BannerListItem */
export interface Banner {
  id: number
  image_url: string
  jump_link: string | null
  sort: number
  start_time: string | null
  end_time: string | null
  is_active: boolean
  created_at: string
}

export type BannerJumpMode = 'none' | 'page' | 'activity' | 'job' | 'link'

/** 站内可选页面（与小程序 app.config.ts 路由对齐） */
export const BANNER_PAGE_GROUPS = [
  { label: '常用入口', options: [
    { label: '首页', value: '/pages/index/index' },
    { label: '学习／题库', value: '/pages/training/index' },
    { label: '认证专区', value: '/pages/registration/index' },
    { label: '我的', value: '/pages/profile/index' },
  ] },
  { label: '认证报名', options: [
    { label: 'H3C认证产品列表', value: '/pages/registration/category?vendor=H3C' },
    { label: 'NISP认证产品列表', value: '/pages/registration/category?vendor=NISP' },
    { label: 'NISP一级报名批次', value: '/pages/nisp/index?level=1' },
    { label: 'NISP二级报名批次', value: '/pages/nisp/index?level=2' },
    { label: '人社认证产品列表', value: '/pages/registration/category?vendor=%E4%BA%BA%E7%A4%BE' },
  ] },
  { label: '积分与权益', options: [
    { label: '积分商城', value: '/pages/mine/points' },
    { label: '积分明细', value: '/pages/mine/points-history' },
  ] },
  { label: '活动与就业', options: [
    { label: '活动', value: '/pages/activity-zone/index?tab=activity' },
    { label: '竞赛', value: '/pages/activity-zone/index?tab=competition' },
    { label: '就业岗位', value: '/pages/activity-zone/index?tab=employment' },
  ] },
  { label: '我的服务', options: [
    { label: '我的报名', value: '/pages/mine/registrations' },
    { label: '我的订单', value: '/pages/orders/index' },
    { label: '联系老师', value: '/pages/mine/contact-teachers' },
    { label: '意见反馈', value: '/pages/mine/feedback' },
    { label: '我的协议', value: '/pages/mine/agreements' },
    { label: '关于我们', value: '/pages/mine/about' },
    { label: 'AI咨询', value: '/pages/ai-consult/index' },
    { label: '题库练习', value: '/pages/quiz/index' },
  ] },
]
export const BANNER_PAGES = BANNER_PAGE_GROUPS.flatMap(group => group.options)

// 有效旧入口保留其原含义，仅用于编辑回显，不增加到营销页面列表。
const LEGACY_PAGE_LABELS: Record<string, string> = {
  '/pages/h3c/index': 'H3C认证报名批次',
  '/pages/activity-zone/index': '发现专区',
}
export const RETIRED_PAGE_ERROR = '目标页面已下线，请重新选择'
export function isRetiredPage(path: string): boolean {
  return ['/pages/course/index', '/pages/course/detail', '/pages/mine/courses'].includes(path.split('?')[0])
}
export function pageTargetLabel(path?: string): string | undefined {
  return BANNER_PAGES.find(item => item.value === path)?.label || (path ? LEGACY_PAGE_LABELS[path] : undefined)
}
export function pageTargetError(path?: string): string | undefined {
  if (!path) return '请选择页面'
  if (isRetiredPage(path)) return RETIRED_PAGE_ERROR
  if (!pageTargetLabel(path)) return '该目标不在可选页面中，请重新选择'
}

export const EXTERNAL_LINK_HINT = '仅支持HTTPS的自有域名（ztyyx.cn及其子域名）或微信公众号文章，且须已配置为小程序业务域名。'
export function externalLinkError(value?: string): string | undefined {
  if (!value?.trim()) return '请输入外部链接'
  const url = value.trim()
  const match = url.match(/^https:\/\/([a-z0-9.-]+)(?::443)?(?:[/?#]|$)/i)
  if (!match || /[\s\\]/.test(url)) return '请输入有效的HTTPS链接'
  const host = match[1].toLowerCase()
  if (!['mp.weixin.qq.com', 'ztyyx.cn'].some(suffix => host === suffix || host.endsWith(`.${suffix}`))) return '该链接域名不在小程序允许范围内'
  if (url.length > 512) return '链接不能超过512字符'
}

export interface JumpTargetValues {
  jump_mode: BannerJumpMode
  page_path?: string
  activity_id?: number
  job_id?: number
  link_url?: string
}

export function buildJumpLink(values: JumpTargetValues): string | null {
  if (values.jump_mode === 'none') return null
  if (values.jump_mode === 'page') {
    const error = pageTargetError(values.page_path)
    if (error) throw new Error(error)
    return values.page_path!
  }
  if (values.jump_mode === 'link') {
    const error = externalLinkError(values.link_url)
    if (error) throw new Error(error)
    return values.link_url!.trim()
  }
  const id = values.jump_mode === 'activity' ? values.activity_id : values.job_id
  if (!Number.isSafeInteger(id) || !id || id < 1) throw new Error(values.jump_mode === 'activity' ? '请选择活动' : '请选择岗位')
  return `${resourceDetailPrefix(values.jump_mode)}?id=${id}`
}

export const BANNER_ACTIVITY_DETAIL_PREFIX = '/pages/activity-zone/detail'
export const BANNER_JOB_DETAIL_PREFIX = '/pages/employment-zone/detail'

/** 从 jump_link 反解析跳转模式（编辑回显用） */
export function parseJumpMode(
  jumpLink: string | null | undefined,
): { mode: BannerJumpMode; path?: string; resourceId?: number; url?: string } {
  if (!jumpLink) return { mode: 'none' }
  if (jumpLink.split('?')[0] === BANNER_ACTIVITY_DETAIL_PREFIX) {
    const id = Number(new URLSearchParams(jumpLink.split('?')[1] ?? '').get('id'))
    return { mode: 'activity', resourceId: id > 0 ? id : undefined }
  }
  if (jumpLink.split('?')[0] === BANNER_JOB_DETAIL_PREFIX) {
    const id = Number(new URLSearchParams(jumpLink.split('?')[1] ?? '').get('id'))
    return { mode: 'job', resourceId: id > 0 ? id : undefined }
  }
  if (jumpLink.startsWith('/pages/')) return { mode: 'page', path: jumpLink }
  return { mode: 'link', url: jumpLink }
}

/** 资源型跳转模式 → 路径前缀 */
export function resourceDetailPrefix(mode: 'activity' | 'job'): string {
  if (mode === 'activity') return BANNER_ACTIVITY_DETAIL_PREFIX
  return BANNER_JOB_DETAIL_PREFIX
}
