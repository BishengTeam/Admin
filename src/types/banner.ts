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

export type BannerJumpMode = 'none' | 'page' | 'course' | 'activity' | 'job' | 'link'

/** 站内可选页面（与小程序 app.config.ts 路由对齐） */
export const BANNER_PAGES: { label: string; value: string }[] = [
  { label: '首页', value: '/pages/index/index' },
  { label: '培训', value: '/pages/training/index' },
  { label: '活动专区', value: '/pages/activity-zone/index' },
  { label: '我的', value: '/pages/profile/index' },
  { label: '就业专区', value: '/pages/employment-zone/index' },
  { label: '题库练习', value: '/pages/quiz/index' },
  { label: '课程列表', value: '/pages/course/index' },
  { label: '报名入口', value: '/pages/registration/index' },
  { label: 'H3C 认证', value: '/pages/h3c/index' },
  { label: 'AI 咨询', value: '/pages/ai-consult/index' },
  { label: '我的课程', value: '/pages/mine/courses' },
  { label: '联系老师', value: '/pages/mine/contact-teachers' },
]

export const BANNER_ACTIVITY_DETAIL_PREFIX = '/pages/activity-zone/detail'
export const BANNER_JOB_DETAIL_PREFIX = '/pages/employment-zone/detail'

/** 从 jump_link 反解析跳转模式（编辑回显用） */
export function parseJumpMode(
  jumpLink: string | null | undefined,
): { mode: BannerJumpMode; path?: string; resourceId?: number; url?: string } {
  if (!jumpLink) return { mode: 'none' }
  if (jumpLink.startsWith(BANNER_ACTIVITY_DETAIL_PREFIX)) {
    const id = Number(new URLSearchParams(jumpLink.split('?')[1] ?? '').get('id'))
    return { mode: 'activity', resourceId: id > 0 ? id : undefined }
  }
  if (jumpLink.startsWith(BANNER_JOB_DETAIL_PREFIX)) {
    const id = Number(new URLSearchParams(jumpLink.split('?')[1] ?? '').get('id'))
    return { mode: 'job', resourceId: id > 0 ? id : undefined }
  }
  if (jumpLink.startsWith('/pages/course/detail')) {
    const id = Number(new URLSearchParams(jumpLink.split('?')[1] ?? '').get('id'))
    return { mode: 'course', resourceId: id > 0 ? id : undefined }
  }
  if (jumpLink.startsWith('/pages/')) return { mode: 'page', path: jumpLink }
  return { mode: 'link', url: jumpLink }
}

/** 资源型跳转模式 → 路径前缀 */
export function resourceDetailPrefix(mode: 'course' | 'activity' | 'job'): string {
  if (mode === 'course') return '/pages/course/detail'
  if (mode === 'activity') return BANNER_ACTIVITY_DETAIL_PREFIX
  return BANNER_JOB_DETAIL_PREFIX
}
