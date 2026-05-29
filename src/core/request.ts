import axios from 'axios'
import { message } from 'antd'
import { getToken, clearAuth } from './auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

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
    if (data.code !== 200 && data.code !== 201) {
      message.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message))
    }
    return data.data
  },
  (error) => {
    if (error.response?.status === 401) {
      clearAuth()
      window.location.href = '/admin/login'
    }
    message.error(error.message || '网络错误')
    return Promise.reject(error)
  },
)

export default request
