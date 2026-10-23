import type { BannerJumpMode } from '@/types/banner'

/** 与Banner复用相同的跳转能力，仍使用jump_link存储。 */
export type PopupJumpMode = BannerJumpMode

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
