import { useEffect } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '@/stores/authStore'
import AdminLayout from '@/layouts/AdminLayout'
import RestrictedSessionLayout from '@/layouts/RestrictedSessionLayout'

/** 解析 JWT payload 的 exp 字段，返回是否为已过期 */
export function isTokenExpired(token: string): boolean {
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
  const sessionMode = useAuthStore((s) => s.sessionMode)
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword)
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

  // 在 /me 返回前不渲染菜单或业务路由，避免旧权限短暂可见，
  // 也保证无权限页面组件不会提前发起业务请求。
  if (!initialized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  const restricted = sessionMode === 'restricted' || mustChangePassword
  const onChangePasswordPage = location.pathname === '/admin/change-password'

  if (restricted && !onChangePasswordPage) {
    return <Navigate to="/admin/change-password" replace />
  }

  if (restricted) {
    return (
      <RestrictedSessionLayout>
        <Outlet />
      </RestrictedSessionLayout>
    )
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}
