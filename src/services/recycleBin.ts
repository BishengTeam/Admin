import { http } from '@/core/request'
import type { PageData, PageParams } from '@/types/api'

export type RecycleBinState = 'deleted' | 'archived'

export interface RecycleBinItem {
  module: string
  id: number
  title: string
  status: RecycleBinState
  deleted_at: string | null
  restore_until: string | null
  expired: boolean
  restorable: boolean
}

export interface RecycleBinSummary {
  module: string
  label: string
  deleted_count: number
  archived_count: number
}

export const recycleBinService = {
  async summary(): Promise<RecycleBinSummary[]> {
    return http.get<RecycleBinSummary[]>('/admin/recycle-bin/summary')
  },

  async list(
    params: { module: string; state: RecycleBinState; keyword?: string } & PageParams,
    signal?: AbortSignal,
  ): Promise<PageData<RecycleBinItem>> {
    return http.get<PageData<RecycleBinItem>>('/admin/recycle-bin/items', { params, signal })
  },

  async restore(module: string, ids: number[]): Promise<number> {
    return http.post<number>('/admin/recycle-bin/restore', { module, ids })
  },

  async archiveDelete(module: string, ids: number[]): Promise<number> {
    // 仅题库支持：归档条目移入回收站（删除态，启动 30 天倒计时）
    return http.post<number>('/admin/recycle-bin/archive-delete', { module, ids })
  },

  async purge(module: string, ids: number[], reauthToken: string): Promise<{ physical: number; tombstone: number }> {
    return http.post<{ physical: number; tombstone: number }>(
      '/admin/recycle-bin/purge',
      { module, ids },
      { headers: { 'X-Reauth-Token': reauthToken } },
    )
  },
}
