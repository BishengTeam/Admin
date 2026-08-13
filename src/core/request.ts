import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import { getToken, clearAuth } from './auth'
import { captureError } from './sentry'

export interface ApiFieldError {
  loc?: Array<string | number>
  field?: string
  msg?: string
  reason?: string
  message?: string
}

export class ApiError extends Error {
  readonly status?: number
  readonly code?: number
  readonly detail?: unknown
  readonly fields: ApiFieldError[]
  readonly requestId?: string

  constructor(input: {
    message: string
    status?: number
    code?: number
    detail?: unknown
    fields?: ApiFieldError[]
    requestId?: string
  }) {
    super(input.message)
    this.name = 'ApiError'
    this.status = input.status
    this.code = input.code
    this.detail = input.detail
    this.fields = input.fields ?? []
    this.requestId = input.requestId
  }
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

let authExpiredHandled = false

request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function getFields(detail: unknown): ApiFieldError[] {
  if (Array.isArray(detail)) return detail as ApiFieldError[]
  if (detail && typeof detail === 'object' && Array.isArray((detail as { errors?: unknown }).errors)) {
    return (detail as { errors: ApiFieldError[] }).errors
  }
  return []
}

function isQuietBusinessError(status?: number, code?: number) {
  return status === 409 || status === 422 || status === 429 || code === 40200 || code === 40201 || code === 40202
}

function toApiError(error: AxiosError): ApiError {
  const responseData = error.response?.data as { code?: number; message?: string; detail?: unknown } | undefined
  const status = error.response?.status
  const code = responseData?.code
  const detail = responseData?.detail ?? (Array.isArray(responseData) ? responseData : undefined)
  const requestId = (error.response?.headers?.['x-request-id'] as string | undefined)
    ?? (error.response?.headers?.['x-request-id'.toLowerCase()] as string | undefined)
  return new ApiError({
    message: responseData?.message || error.message || '请求失败',
    status,
    code,
    detail,
    fields: getFields(detail),
    requestId,
  })
}

function recordServerFailure(error: ApiError, url?: string) {
  if (error.status != null && error.status < 500 && error.code !== 50000) return
  captureError(error, {
    request_id: error.requestId,
    status: error.status,
    code: error.code,
    url,
  })
}

request.interceptors.response.use(
  (response) => {
    const { data, config } = response
    if (config.responseType === 'blob' || config.responseType === 'arraybuffer') return data
    if (!data || data.code !== 0) {
      const apiError = new ApiError({
        message: data?.message || '请求失败',
        status: response.status,
        code: data?.code,
        detail: data?.detail,
        fields: getFields(data?.detail),
        requestId: response.headers?.['x-request-id'],
      })
      recordServerFailure(apiError, config.url)
      if (!isQuietBusinessError(apiError.status, apiError.code)) message.error(apiError.message)
      return Promise.reject(apiError)
    }
    return data.data
  },
  (error: AxiosError) => {
    if (error.code === 'ERR_CANCELED' || (typeof axios.isCancel === 'function' && axios.isCancel(error))) return Promise.reject(error)
    if (error.response?.status === 401) {
      if (!window.location.pathname.startsWith('/admin/login') && !authExpiredHandled) {
        authExpiredHandled = true
        clearAuth()
        setTimeout(() => { authExpiredHandled = false }, 1000)
      }
      return Promise.reject(toApiError(error))
    }

    const apiError = toApiError(error)
    recordServerFailure(apiError, error.config?.url)
    if (!isQuietBusinessError(apiError.status, apiError.code) && (apiError.status == null || apiError.status >= 500)) {
      message.error(apiError.status == null ? '网络错误，请检查网络连接' : '服务器暂时不可用，请稍后重试')
    }
    return Promise.reject(apiError)
  },
)

export default request

function looksLikeConfig(value: unknown): value is AxiosRequestConfig {
  if (!value || typeof value !== 'object') return false
  const keys = ['data', 'params', 'headers', 'signal', 'timeout', 'responseType', 'onUploadProgress', 'withCredentials']
  return keys.some((key) => key in (value as Record<string, unknown>))
}

export const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request.get(url, config) as Promise<T>
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request.post(url, data, config) as Promise<T>
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request.put(url, data, config) as Promise<T>
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request.patch(url, data, config) as Promise<T>
  },
  delete<T>(url: string, dataOrConfig?: unknown, config?: AxiosRequestConfig): Promise<T> {
    // Support both the service-layer form ``delete(url, body, config)`` and
    // Axios's native ``delete(url, { data: body, signal })`` form.  Do not
    // spread an explicit ``data: undefined`` over a caller-provided config;
    // that would silently drop the JSON DELETE body.
    let resolvedConfig: AxiosRequestConfig | undefined
    let data: unknown
    if (config) {
      resolvedConfig = config
      data = dataOrConfig
    } else if (looksLikeConfig(dataOrConfig)) {
      resolvedConfig = dataOrConfig as AxiosRequestConfig
      data = resolvedConfig.data
    } else {
      data = dataOrConfig
    }
    const requestConfig: AxiosRequestConfig = { ...(resolvedConfig ?? {}) }
    if (data !== undefined) requestConfig.data = data
    return request.delete(url, requestConfig) as Promise<T>
  },
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isConflictError(error: unknown): error is ApiError {
  return isApiError(error) && (error.status === 409 || error.code === 40201)
}

export function isValidationError(error: unknown): error is ApiError {
  return isApiError(error) && (error.status === 422 || error.code === 40001 || error.code === 40200)
}

export function isNotFoundError(error: unknown): error is ApiError {
  return isApiError(error) && (error.status === 404 || error.code === 40300)
}

export function isPermissionError(error: unknown): error is ApiError {
  return isApiError(error) && (error.status === 403 || error.code === 40101)
}

export function isRateLimitError(error: unknown): error is ApiError {
  return isApiError(error) && (error.status === 429 || error.code === 40202)
}
