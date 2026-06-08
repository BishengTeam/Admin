/** Banner target_type 枚举 */
export type BannerTargetType = 'cert' | 'course' | 'activity' | 'zone' | 'url'

export const BANNER_TARGET_LABELS: Record<BannerTargetType, string> = {
  cert: '认证',
  course: '课程',
  activity: '活动',
  zone: '专区',
  url: '外链',
}

/** Banner 列表项，对应后端 BannerListItem */
export interface Banner {
  id: number
  image_url: string
  jump_link: string | null
  target_type: BannerTargetType | null
  target_id: number | null
  sort: number
  start_time: string | null
  end_time: string | null
  is_active: boolean
  created_at: string
}
