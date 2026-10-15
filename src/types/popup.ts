import type { BannerJumpMode } from '@/types/banner'

/** 弹窗海报仅支持站内跳转，不提供外链模式 */
export type PopupJumpMode = Exclude<BannerJumpMode, 'link'>

/** 弹窗海报列表项，对应后端 PopupListItem */
export interface Popup {
  id: number
  image_url: string
  jump_link: string | null
  sort: number
  start_time: string | null
  end_time: string | null
  is_active: boolean
  created_at: string
}
