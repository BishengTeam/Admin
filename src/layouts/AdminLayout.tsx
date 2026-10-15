import { Suspense, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Layout, Menu, Button, Breadcrumb, Dropdown, Avatar, Spin, Result, Tag, message, theme } from 'antd'
import type { MenuProps } from 'antd'
import {
  AppstoreOutlined,
  TrophyOutlined,
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
  MonitorOutlined,
  GiftOutlined,
  BarChartOutlined,
  LineChartOutlined,
  CustomerServiceOutlined,
  SyncOutlined,
  SettingOutlined,
  CloudServerOutlined,
  FilePdfOutlined,
  KeyOutlined,
  LockOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import type { AppRoute } from '@/routes'
import { adminRoutes } from '@/routes'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getAdminRoleLabel } from '@/core/permission'
import type { AdminRole } from '@/types/admin'

const APP_TITLE: string = import.meta.env.VITE_APP_TITLE || '运营管理后台'

const { Header, Sider, Content } = Layout

// 注意：新增路由菜单时，若使用新图标，需同步更新此映射及顶部的 import。
// 路由 meta.icon 存的是字符串名称（lazy 组件无法序列化 ReactNode），
// AdminLayout 通过此映射在运行时解析为实际图标组件。
const iconMap: Record<string, ReactNode> = {
  AppstoreOutlined: <AppstoreOutlined />,
  TrophyOutlined: <TrophyOutlined />,
  CalendarOutlined: <CalendarOutlined />,
  DashboardOutlined: <DashboardOutlined />,
  TeamOutlined: <TeamOutlined />,
  ShoppingOutlined: <ShoppingOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  PictureOutlined: <PictureOutlined />,
  ReadOutlined: <ReadOutlined />,
  BookOutlined: <BookOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  GiftOutlined: <GiftOutlined />,
  IdcardOutlined: <IdcardOutlined />,
  SolutionOutlined: <SolutionOutlined />,
  AuditOutlined: <AuditOutlined />,
  FileSearchOutlined: <FileSearchOutlined />,
  ImportOutlined: <ImportOutlined />,
  ClusterOutlined: <ClusterOutlined />,
  FormOutlined: <FormOutlined />,
  FileZipOutlined: <FileZipOutlined />,
  RollbackOutlined: <RollbackOutlined />,
  MonitorOutlined: <MonitorOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  LineChartOutlined: <LineChartOutlined />,
  CustomerServiceOutlined: <CustomerServiceOutlined />,
  SyncOutlined: <SyncOutlined />,
  SettingOutlined: <SettingOutlined />,
  CloudServerOutlined: <CloudServerOutlined />,
  FilePdfOutlined: <FilePdfOutlined />,
  KeyOutlined: <KeyOutlined />,
  PlayCircleOutlined: <PlayCircleOutlined />,
}

export function hasRouteAccess(
  route: AppRoute,
  permissions: string[],
  initialized: boolean,
  role?: AdminRole | string,
) {
  if (!initialized) return true
  if (route.meta?.roles && (!role || !route.meta.roles.includes(role as AdminRole))) return false
  if (permissions.includes('*')) return true
  const required = route.meta?.permissions ?? (route.meta?.permission ? [route.meta.permission] : [])
  if (required.length === 0) return true
  // `permissions` is an any-of contract. Route-level narrow access is enforced
  // inside the page by hiding or rejecting the specific action.
  return required.some((permission) => permissions.includes(permission))
}

export function buildMenuItems(
  routes: AppRoute[],
  permissions: string[],
  initialized: boolean,
  role?: AdminRole | string,
): MenuProps['items'] {
  return routes.flatMap((route) => {
    const item = buildRouteMenuItem(route, '', permissions, initialized, role)
    return item ? [item] : []
  }) as MenuProps['items']
}

interface MenuTreeNode {
  key?: React.Key
  icon?: ReactNode
  label?: ReactNode
  children?: MenuTreeNode[]
}

export function getMenuAncestorKeys(items: MenuProps['items'], targetKey?: string): string[] {
  if (!targetKey) return []
  const ancestors: string[] = []

  const walk = (nodes: MenuTreeNode[] = [], parents: string[] = []): boolean => {
    for (const node of nodes) {
      if (node.key === undefined || node.key === null) continue
      const key = String(node.key)
      const nextParents = [...parents, key]
      if (key === targetKey) {
        ancestors.push(...parents)
        return true
      }
      if (node.children?.length && walk(node.children, nextParents)) return true
    }
    return false
  }

  walk((items ?? []) as MenuTreeNode[])
  return ancestors
}

function buildRouteMenuItem(
  route: AppRoute,
  parentPath: string,
  permissions: string[],
  initialized: boolean,
  role?: AdminRole | string,
): MenuTreeNode | undefined {
  if (!route.meta || route.meta.hidden) return undefined
  if (!hasRouteAccess(route, permissions, initialized, role)) return undefined

  const fullPath = route.index
    ? parentPath
    : [parentPath, route.path].filter(Boolean).join('/')
  const key = route.menuKey ?? fullPath
  const icon = route.meta.icon ? iconMap[route.meta.icon] : undefined

  if (route.children?.length) {
    const children = route.children
      .map(child => buildRouteMenuItem(child, fullPath, permissions, initialized, role))
      .filter((child): child is MenuTreeNode => Boolean(child))
    if (children.length) {
      return { key, icon, label: route.meta.title, children }
    }
    // A group whose index route renders the page is represented by the parent item.
    if (route.children.some(child => child.index)) {
      return { key, icon, label: route.meta.title }
    }
    return undefined
  }

  return { key, icon, label: route.meta.title }
}

export function routePathMatches(routePath: string, relativePath: string): boolean {
  const routeParts = routePath.split('/').filter(Boolean)
  const pathParts = relativePath.split('/').filter(Boolean)
  if (routeParts.length === 0 || pathParts.length === 0) return false
  return routeParts.length === pathParts.length && routeParts.every((part, index) => (
    part.startsWith(':') ? Boolean(pathParts[index]) : part === pathParts[index]
  ))
}

export function findBreadcrumb(
  relativePath: string,
  routes: AppRoute[],
  parentPath = '',
  detailTitle?: string,
  rootRoutes: AppRoute[] = routes,
): { title: string }[] {
  for (const r of routes) {
    const fullPath = r.index ? parentPath : [parentPath, r.path].filter(Boolean).join('/')
    if (r.children) {
      const found = findBreadcrumb(
        relativePath,
        r.children,
        r.path ? fullPath : parentPath,
        detailTitle,
        rootRoutes,
      )
      if (found.length) {
        if (r.meta?.title) {
          return [{ title: r.meta.title }, ...found]
        }
        return found
      }
    }
    if (routePathMatches(fullPath, relativePath)) {
      const title = detailTitle ?? r.meta?.title
      if (!title) return []
      if (!r.meta?.activeMenuKey) return [{ title }]
      const activeRoute = findActiveRoute(r.meta.activeMenuKey, rootRoutes)
      return activeRoute?.meta?.title
        ? [{ title: activeRoute.meta.title }, { title }]
        : [{ title }]
    }
  }
  return []
}

export function findActiveRoute(
  relativePath: string,
  routes: AppRoute[],
  parentPath = '',
): AppRoute | undefined {
  for (const route of routes) {
    const fullPath = route.index ? parentPath : [parentPath, route.path].filter(Boolean).join('/')
    if (route.children) {
      const child = findActiveRoute(relativePath, route.children, fullPath)
      if (child) return child
    }
    if (routePathMatches(fullPath, relativePath)) return route
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
    return buildMenuItems(adminRoutes, permissions, initialized, admin?.role)
  }, [permissions, initialized, admin?.role])

  const currentRoute = useMemo(() => {
    const pathname = location.pathname.replace(/^\/admin\/?/, '')
    return findActiveRoute(pathname, adminRoutes)
  }, [location])

  const routeAllowed = !currentRoute || hasRouteAccess(currentRoute, permissions, initialized, admin?.role)

  const breadcrumbItems = useMemo(() => {
    const relativePath = location.pathname.replace(/^\/admin\/?/, '')
    const stateTitle = (location.state as { breadcrumbTitle?: unknown } | null)?.breadcrumbTitle
    const detailTitle = typeof stateTitle === 'string' && stateTitle.trim()
      ? stateTitle.trim()
      : undefined
    const items = findBreadcrumb(relativePath, adminRoutes, '', detailTitle)
    return [{ title: '首页' }, ...items]
  }, [location])

  const selectedKeys = useMemo(() => {
    const relativePath = location.pathname.replace(/^\/admin\/?/, '')
    return [currentRoute?.meta?.activeMenuKey ?? relativePath]
  }, [location.pathname])

  const [manualOpenKeys, setManualOpenKeys] = useState<string[]>([])
  const openKeys = useMemo(() => {
    const routeOpenKeys = getMenuAncestorKeys(menuItems, selectedKeys[0])
    return Array.from(new Set([...manualOpenKeys, ...routeOpenKeys]))
  }, [manualOpenKeys, menuItems, selectedKeys])

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      message.warning('服务端未确认会话撤销，本地登录信息已清除；如有安全风险，请联系超级管理员处理。')
    } finally {
      navigate('/admin/login', { replace: true })
    }
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
          openKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => navigate(`/admin/${key}`)}
          onOpenChange={(keys) => setManualOpenKeys(keys.map(String))}
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
                  key: 'change-password',
                  icon: <LockOutlined />,
                  label: '修改密码',
                  onClick: () => navigate('/admin/change-password'),
                },
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
              <span>{admin?.display_name || admin?.username}</span>
              {admin?.role && <Tag style={{ marginInlineEnd: 0 }}>{getAdminRoleLabel(admin.role)}</Tag>}
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
