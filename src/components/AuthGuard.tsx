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

  // 有 token 但未从服务端初始化 → 显示布局骨架 + 加载中
  // 直接渲染 AdminLayout 而非独立的 loading 容器，避免初始化完成
  // 后因 DOM 结构突变（div → Layout）产生整体重排闪烁。
  if (!initialized) {
    return (
      <AdminLayout>
        <Spin size="large" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}
