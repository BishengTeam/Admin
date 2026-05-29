import { lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'

export interface RouteMeta {
  title: string
  permission?: string
  icon?: string
  hidden?: boolean
}

export interface AppRoute {
  path?: string
  index?: boolean
  element?: React.ReactNode
  children?: AppRoute[]
  meta?: RouteMeta
}

const LoginPage = lazy(() => import('@/pages/login'))
const Dashboard = lazy(() => import('@/pages/dashboard'))
const UserList = lazy(() => import('@/pages/users'))
const OrderList = lazy(() => import('@/pages/orders'))
const QuizManagement = lazy(() => import('@/pages/quiz'))
const QuizImport = lazy(() => import('@/pages/quiz/import'))
const ContentManagement = lazy(() => import('@/pages/content'))
const BannerConfig = lazy(() => import('@/pages/content/banners'))
const CourseList = lazy(() => import('@/pages/content/courses'))

import AuthGuard from '@/components/AuthGuard'
import LoginLayout from '@/layouts/LoginLayout'

export const adminRoutes: AppRoute[] = [
  {
    path: 'dashboard',
    element: <Dashboard />,
    meta: { title: '数据看板', icon: 'DashboardOutlined', permission: 'dashboard:view' },
  },
  {
    path: 'users',
    element: <UserList />,
    meta: { title: '用户管理', icon: 'TeamOutlined', permission: 'user:list' },
  },
  {
    path: 'orders',
    element: <OrderList />,
    meta: { title: '订单管理', icon: 'ShoppingOutlined', permission: 'order:list' },
  },
  {
    path: 'quiz',
    element: <QuizManagement />,
    meta: { title: '题库管理', icon: 'BookOutlined', permission: 'quiz:list' },
  },
  {
    path: 'quiz/import',
    element: <QuizImport />,
    meta: { title: '批量导入', hidden: true, permission: 'quiz:import' },
  },
  {
    path: 'content',
    element: <ContentManagement />,
    meta: { title: '内容管理', icon: 'FileTextOutlined', permission: 'content:list' },
  },
  {
    path: 'content/banners',
    element: <BannerConfig />,
    meta: { title: 'Banner配置', icon: 'PictureOutlined', permission: 'content:banner' },
  },
  {
    path: 'content/courses',
    element: <CourseList />,
    meta: { title: '课程管理', icon: 'ReadOutlined', permission: 'course:list' },
  },
]

export const routes: RouteObject[] = [
  {
    path: '/admin/login',
    element: <LoginLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AuthGuard />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      ...(adminRoutes as RouteObject[]),
    ],
  },
  {
    path: '*',
    element: <Navigate to="/admin/login" replace />,
  },
]
