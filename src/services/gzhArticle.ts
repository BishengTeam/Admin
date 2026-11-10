import { http } from '@/core/request'
import type {
  GzhArticle,
  GzhArticleBatchImportResult,
  GzhArticleImportItem,
} from '@/types/gzhArticle'
import type { PageData, PageParams } from '@/types/api'

export const gzhArticleService = {
  async list(params: { keyword?: string } & PageParams): Promise<PageData<GzhArticle>> {
    return http.get<PageData<GzhArticle>>('/admin/gzh-articles', { params })
  },
  async create(data: Partial<GzhArticle>): Promise<GzhArticle> {
    return http.post<GzhArticle>('/admin/gzh-articles', data)
  },
  async batchImport(items: GzhArticleImportItem[]): Promise<GzhArticleBatchImportResult> {
    return http.post<GzhArticleBatchImportResult>('/admin/gzh-articles/batch-import', { items })
  },
  async update(id: number, data: Partial<GzhArticle>): Promise<GzhArticle> {
    return http.put<GzhArticle>(`/admin/gzh-articles/${id}`, data)
  },
  async delete(id: number): Promise<void> {
    return http.delete<void>(`/admin/gzh-articles/${id}`)
  },
  async batchDelete(ids: number[]): Promise<number> {
    return http.post<number>('/admin/gzh-articles/batch-delete', { ids })
  },
}
