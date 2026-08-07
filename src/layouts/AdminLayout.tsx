import { Suspense, useMemo, type ReactNode } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Layout, Menu, Button, Breadcrumb, Dropdown, Avatar, Spin, Result, theme } from 'antd'
import type { MenuProps } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  CalendarOutlined,
  DashboardOutlined,
  TeamOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  PictureOutlined,
  ReadOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
  SolutionOutlined,
  AuditOutlined,
  FileSearchOutlined,
  ImportOutlined,
  ClusterOutlined,
  FormOutlined,
  FileZipOutlined,
  RollbackOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import type { AppRoute } from '@/routes'
import { adminRoutes } from '@/routes'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const APP_TITLE: string = import.meta.env.VITE_APP_TITLE || '运营管理后台'

const { Header, Sider, Content } = Layout

// 注意：新增路由菜单时，若使用新图标，需同步更新此映射及顶部的 import。
// 路由 meta.icon 存的是字符串名称（lazy 组件无法序列化 ReactNode），
// AdminLayout 通过此映射在运行时解析为实际图标组件。
const iconMap: Record<string, ReactNode> = {
  CalendarOutlined: <CalendarOutlined />,
  DashboardOutlined: <DashboardOutlined />,
  TeamOutlined: <TeamOutlined />,
  ShoppingOutlined: <ShoppingOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  PictureOutlined: <PictureOutlined />,
  ReadOutlined: <ReadOutlined />,
  BookOutlined: <BookOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  IdcardOutlined: <IdcardOutlined />,
  SolutionOutlined: <SolutionOutlined />,
  AuditOutlined: <AuditOutlined />,
  FileSearchOutlined: <FileSearchOutlined />,
  ImportOutlined: <ImportOutlined />,
  ClusterOutlined: <ClusterOutlined />,
  FormOutlined: <FormOutlined />,
  FileZipOutlined: <FileZipOutlined />,
  RollbackOutlined: <RollbackOutlined />,
}

function hasRoutePermission(route: AppRoute, permissions: string[], initialized: boolean) {
  if (!initialized) return true
  if (permissions.includes('*')) return true
  const required = route.meta?.permissions ?? (route.meta?.permission ? [route.meta.permission] : [])
  return required.every((permission) => permissions.includes(permission))
}

function buildMenuItems(routes: AppRoute[], permissions: string[], initialized: boolean): MenuProps['items'] {
  return routes.flatMap((r) => {
      if (!r.meta || r.meta.hidden || !hasRoutePermission(r, permissions, initialized)) return []
      const icon = r.meta?.icon ? iconMap[r.meta.icon] : undefined
      if (r.children) {
        const visibleChildren = r.children.filter((c) => c.meta && !c.meta.hidden && hasRoutePermission(c, permissions, initialized))
        if (visibleChildren.length === 0) return []
        return [{
          key: r.path!,
          icon,
          label: r.meta?.title,
          children: visibleChildren.map((c) => ({
            key: `${r.path}/${c.path}`,
            icon: c.meta?.icon ? iconMap[c.meta.icon] : undefined,
            label: c.meta?.title,
          })),
        }]
      }
      return [{
        key: r.path!,
        icon,
        label: r.meta?.title,
      }]
    })
}

function findBreadcrumb(relativePath: string, routes: AppRoute[], parentPath = ''): { title: string }[] {
  for (const r of routes) {
    const fullPath = r.index ? parentPath : [parentPath, r.path].filter(Boolean).join('/')
    if (r.children) {
      const found = findBreadcrumb(relativePath, r.children, r.path ? fullPath : parentPath)
      if (found.length) {
        if (r.meta?.title) {
          return [{ title: r.meta.title }, ...found]
        }
        return found
      }
    }
    if (relativePath === fullPath) {
      return r.meta?.title ? [{ title: r.meta.title }] : []
    }
  }
  return []
}

function findActiveRoute(relativePath: string, routes: AppRoute[], parentPath = ''): AppRoute | undefined {
  for (const route of routes) {
    const fullPath = route.index ? parentPath : [parentPath, route.path].filter(Boolean).join('/')
    if (route.children) {
      const child = findActiveRoute(relativePath, route.children, fullPath)
      if (child) return child
    }
    if (relativePath === fullPath) return route
  }
  return undefined
}

export default function AdminLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleCollapsed = useAppStore((s) => s.toggleCollapsed)
  const { admin, permissions, initialized } = useAuth()
  const logout = useAuthStore((s) => s.logout)
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const menuItems = useMemo(() => {
    return buildMenuItems(adminRoutes, permissions, initialized)
  }, [permissions, initialized])

  const currentRoute = useMemo(() => {
    const pathname = location.pathname.replace(/^\/admin\/?/, '')
    return findActiveRoute(pathname, adminRoutes)
  }, [location.pathname])

  const routeAllowed = !currentRoute || hasRoutePermission(currentRoute, permissions, initialized)

  const breadcrumbItems = useMemo(() => {
    const relativePath = location.pathname.replace(/^\/admin\/?/, '')
    const items = findBreadcrumb(relativePath, adminRoutes)
    return [{ title: '首页' }, ...items]
  }, [location.pathname])

  const selectedKeys = useMemo(() => {
    const path = location.pathname.replace('/admin/', '')
    return [path]
  }, [location.pathname])

  const openKeys = useMemo(() => {
    const parts = location.pathname.replace('/admin/', '').split('/')
    if (parts.length > 1) {
      return [parts[0]]
    }
    return []
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={240}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: collapsed ? 16 : 20,
            letterSpacing: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {collapsed ? '后台' : APP_TITLE}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => navigate(`/admin/${key}`)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 9,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
            />
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{ admin?.username }</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
          }}
        >
          <ErrorBoundary level="page">
            <Suspense
              fallback={
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Spin size="large" />
                </div>
              }
            >
              {routeAllowed ? (children || <Outlet />) : <Result status="403" title="无权访问" subTitle="当前管理员没有该页面所需权限" />}
            </Suspense>
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  )
}
