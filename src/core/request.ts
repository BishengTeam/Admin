import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import { getToken, clearAuth } from './auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

// 401 防抖：避免同一时刻多个并发请求各自触发 clearAuth
let authExpiredHandled = false

request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const { data, config } = response
    if (config.responseType === 'blob' || config.responseType === 'arraybuffer') {
      return data
    }
    if (data.code !== 0) {
      message.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message))
    }
    return data.data
  },
  (error) => {
    if (error.response?.status === 401) {
      // 当前就在登录页（登录失败）→ 不跳转，错误由登录页组件自行展示
      if (window.location.pathname.startsWith('/admin/login')) {
        return Promise.reject(error)
      }

      // 防抖：同一批 401 只处理一次
      if (!authExpiredHandled) {
        authExpiredHandled = true
        clearAuth()
        // clearAuth 会通知 Zustand store 清除 token，
        // AuthGuard 检测到 token 为 null 后通过 <Navigate> 无刷新跳转到登录页。
        // 重置防抖标志，为下次登录后再次过期做准备。
        setTimeout(() => {
          authExpiredHandled = false
        }, 1000)
      }

      return Promise.reject(error)
    }
    message.error(error.message || '网络错误')
    return Promise.reject(error)
  },
)

export default request

// ── 泛型包装：为服务层提供类型安全的 HTTP 方法 ──
// 拦截器已完成 .code 校验和 .data 抽取，泛型 T 对应抽取后的业务数据类型
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
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request.delete(url, config) as Promise<T>
  },
}
