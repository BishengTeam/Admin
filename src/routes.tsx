import { lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'

export interface RouteMeta {
  title: string
  permission?: string
  permissions?: string[]
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
const RensheBatches = lazy(() => import('@/pages/renshe/batches'))
const RensheApplications = lazy(() => import('@/pages/renshe/applications'))
const RensheExports = lazy(() => import('@/pages/renshe/exports'))
const RensheRefunds = lazy(() => import('@/pages/renshe/refunds'))
const QuizManagement = lazy(() => import('@/pages/quiz'))
const QuizLibraries = lazy(() => import('@/pages/quiz/libraries'))
const QuizV2Workbench = lazy(() => import('@/pages/quiz/v2-workbench'))
const QuizImports = lazy(() => import('@/pages/quiz/imports'))
const QuizAuditLogs = lazy(() => import('@/pages/quiz/audit-logs'))
const QuizStats = lazy(() => import('@/pages/quiz/stats'))
const QuizTaskMonitor = lazy(() => import('@/pages/quiz/tasks'))
const ContentManagement = lazy(() => import('@/pages/content'))
const CourseList = lazy(() => import('@/pages/content/courses'))
const CertificationManagement = lazy(() => import('@/pages/certification'))
const JobManagement = lazy(() => import('@/pages/job'))
const TrainingManagement = lazy(() => import('@/pages/training'))
const ActivityManagement = lazy(() => import('@/pages/activity'))
const BannerManagement = lazy(() => import('@/pages/banner'))
const ReviewManagement = lazy(() => import('@/pages/review'))

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
    path: 'renshe',
    meta: { title: '人社报名', icon: 'SolutionOutlined' },
    children: [
      { index: true, element: <Navigate to="batches" replace /> },
      {
        path: 'batches',
        element: <RensheBatches />,
        meta: { title: '批次管理', icon: 'ClusterOutlined', permission: 'user:list' },
      },
      {
        path: 'applications',
        element: <RensheApplications />,
        meta: { title: '报名审核', icon: 'FormOutlined', permission: 'user:list' },
      },
      {
        path: 'exports',
        element: <RensheExports />,
        meta: { title: '导出中心', icon: 'FileZipOutlined', permission: 'user:list' },
      },
      {
        path: 'refunds',
        element: <RensheRefunds />,
        meta: { title: '退款工作台', icon: 'RollbackOutlined', permission: 'order:list' },
      },
    ],
  },
  {
    path: 'reviews',
    element: <ReviewManagement />,
    meta: { title: '审核管理', icon: 'AuditOutlined', permission: 'review:list' },
  },
  {
    path: 'quiz',
    meta: { title: '题库管理', icon: 'BookOutlined' },
    children: [
      { index: true, element: <Navigate to="questions" replace /> },
      {
        path: 'libraries',
        element: <QuizLibraries />,
        meta: { title: '题库', icon: 'BookOutlined', permission: 'quiz:list' },
      },
      {
        path: 'categories',
        element: <Navigate to="../questions" replace />,
        meta: { title: '分类管理（已合并）', permission: 'quiz:list', hidden: true },
      },
      {
        path: 'questions',
        element: <QuizV2Workbench />,
        meta: { title: '内容工作台', icon: 'BookOutlined', permission: 'quiz:list' },
      },
      {
        path: 'legacy-questions',
        element: <QuizManagement />,
        meta: { title: '旧分类兼容（7 天）', permission: 'quiz:list', hidden: true },
      },
      {
        path: 'imports',
        element: <QuizImports />,
        meta: { title: '导入任务', icon: 'ImportOutlined', permissions: ['quiz:list', 'quiz:import'] },
      },
      {
        path: 'stats',
        element: <QuizStats />,
        meta: { title: '聚合统计', icon: 'BarChartOutlined', permission: 'quiz:list' },
      },
      {
        path: 'audit-logs',
        element: <QuizAuditLogs />,
        meta: { title: '审计日志', icon: 'FileSearchOutlined', permission: 'quiz:list' },
      },
      {
        path: 'tasks',
        element: <QuizTaskMonitor />,
        meta: { title: '任务监控', icon: 'MonitorOutlined', permission: 'quiz:list' },
      },
    ],
  },
  {
    path: 'content',
    element: <ContentManagement />,
    meta: { title: '内容配置', icon: 'FileTextOutlined', permission: 'content:list' },
  },
  {
    path: 'courses',
    element: <CourseList />,
    meta: { title: '课程管理', icon: 'ReadOutlined', permission: 'course:list' },
  },
  {
    path: 'certification',
    element: <CertificationManagement />,
    meta: { title: '认证管理', icon: 'SafetyCertificateOutlined', permission: 'content:list' },
  },
  {
    path: 'job',
    element: <JobManagement />,
    meta: { title: '就业管理', icon: 'IdcardOutlined', permission: 'content:list' },
  },
  {
    path: 'training',
    element: <TrainingManagement />,
    meta: { title: '培训管理', icon: 'SolutionOutlined', permission: 'content:list' },
  },
  {
    path: 'activity',
    element: <ActivityManagement />,
    meta: { title: '活动管理', icon: 'CalendarOutlined', permission: 'content:write' },
  },
  {
    path: 'banner',
    element: <BannerManagement />,
    meta: { title: 'Banner 管理', icon: 'PictureOutlined', permission: 'content:write' },
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
