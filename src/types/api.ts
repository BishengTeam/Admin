export interface ApiResponse<T> {
  code: number
  message: string
  data?: T // 后端在错误场景下 data 为 null/undefined，改为可选避免运行时崩溃
}

export interface PageData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface PageParams {
  page?: number
  page_size?: number
}
