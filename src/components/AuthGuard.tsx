import { useEffect } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '@/stores/authStore'
import AdminLayout from '@/layouts/AdminLayout'

/** 解析 JWT payload 的 exp 字段，返回是否为已过期 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true // 非法格式视为过期
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return false // 无 exp 字段则不校验过期
    return Date.now() >= payload.exp * 1000
  } catch {
    return true // 解析失败视为过期
  }
}

export default function AuthGuard() {
  const token = useAuthStore((s) => s.token)
  const initialized = useAuthStore((s) => s.initialized)
  const initFromServer = useAuthStore((s) => s.initFromServer)
  const location = useLocation()

  useEffect(() => {
    if (token && !initialized) {
      initFromServer()
    }
  }, [token, initialized, initFromServer])

  // 无 token 或 token 已过期 → 重定向登录页
  if (!token || isTokenExpired(token)) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // 有 token 但未从服务端初始化 → 加载中
  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}
