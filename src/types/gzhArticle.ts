export type GzhArticleSource = 'sync' | 'manual'

/** 公众号资讯（gzh_articles）：sync=同步 worker 维护，manual=Admin 手动维护 */
export interface GzhArticle {
  id: number
  title: string
  url: string
  thumb_url?: string | null
  publish_time?: string | null
  source: GzhArticleSource
  created_at: string
  updated_at: string
}

export interface GzhArticleImportError {
  index: number
  title: string
  message: string
}

export interface GzhArticleBatchImportResult {
  created: number
  skipped: number
  errors: GzhArticleImportError[]
}

/** 批量导入的单条载荷（后端 GzhArticleImportItem） */
export interface GzhArticleImportItem {
  title: string
  url: string
  thumb_url?: string | null
  publish_time?: string | null
}

/** 按链接自动拉取的文章信息（后端 GzhArticleFetchMetaResult） */
export interface GzhArticleFetchMeta {
  title: string
  thumb_url?: string | null
  publish_time?: string | null
  /** 链接已存在于资讯库（true 时其余字段为库内条目值） */
  exists: boolean
  source?: GzhArticleSource | null
}
