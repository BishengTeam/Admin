import { lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { getAdminLandingPath } from '@/core/permission'
import type { AdminRole } from '@/types/admin'

export interface RouteMeta {
  title: string
  permission?: string
  permissions?: string[]
  icon?: string
  hidden?: boolean
  roles?: AdminRole[]
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
const QuizBehavior = lazy(() => import('@/pages/quiz/behavior'))
const QuizTaskMonitor = lazy(() => import('@/pages/quiz/tasks'))
const ContentManagement = lazy(() => import('@/pages/content'))
const CourseList = lazy(() => import('@/pages/courses/List'))
const CourseCategories = lazy(() => import('@/pages/courses/Categories'))
const CourseDetail = lazy(() => import('@/pages/courses/Detail'))
const CourseStudents = lazy(() => import('@/pages/courses/Students'))
const CourseAudit = lazy(() => import('@/pages/courses/Audit'))
const CertificationManagement = lazy(() => import('@/pages/certification'))
const JobManagement = lazy(() => import('@/pages/job'))
const TrainingManagement = lazy(() => import('@/pages/training'))
const ActivityManagement = lazy(() => import('@/pages/activity'))
const BannerManagement = lazy(() => import('@/pages/banner'))
const ReviewManagement = lazy(() => import('@/pages/review'))
const ChangePassword = lazy(() => import('@/pages/change-password'))
const AdminAccounts = lazy(() => import('@/pages/settings/admins'))
const SecurityAudit = lazy(() => import('@/pages/settings/security-audit'))
const SystemUpdates = lazy(() => import('@/pages/settings/updates'))
const H3CManagement = lazy(() => import('@/pages/h3c'))

import AuthGuard from '@/components/AuthGuard'
import LoginLayout from '@/layouts/LoginLayout'

function AdminLandingRedirect() {
  const role = useAuthStore((state) => state.admin?.role)
  return <Navigate to={getAdminLandingPath(role)} replace />
}

export const adminRoutes: AppRoute[] = [
  {
    path: 'change-password',
    element: <ChangePassword />,
    meta: { title: '修改密码', hidden: true },
  },
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
        path: 'behavior',
        element: <QuizBehavior />,
        meta: { title: '用户行为', icon: 'LineChartOutlined', permission: 'quiz:list' },
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
    meta: { title: '课程管理', icon: 'ReadOutlined', permission: 'course:read' },
    children: [
      { index: true, element: <Navigate to="list" replace /> },
      {
        path: 'list',
        element: <CourseList />,
        meta: { title: '课程列表', icon: 'ReadOutlined', permission: 'course:read' },
      },
      {
        path: 'categories',
        element: <CourseCategories />,
        meta: { title: '类目管理', icon: 'ClusterOutlined', permission: 'course:write' },
      },
      {
        path: 'students',
        element: <CourseStudents />,
        meta: { title: '报名学员', icon: 'TeamOutlined', permission: 'course:read' },
      },
      {
        path: 'audit',
        element: <CourseAudit />,
        meta: { title: '课程审计', icon: 'AuditOutlined', permission: 'course:read' },
      },
      {
        path: ':courseId',
        element: <CourseDetail />,
        meta: { title: '课程工作台', icon: 'PlayCircleOutlined', permission: 'course:read', hidden: true },
      },
    ],
  },
  {
    path: 'certification',
    meta: { title: '认证管理', icon: 'SafetyCertificateOutlined', permission: 'content:list' },
    children: [
      { index: true, element: <CertificationManagement /> },
      {
        path: 'h3c',
        element: <H3CManagement />,
        meta: { title: 'H3C 认证', permission: 'h3c:review' },
      },
    ],
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
  {
    path: 'settings',
    meta: { title: '系统管理', icon: 'SettingOutlined', roles: ['super_admin'] },
    children: [
      { index: true, element: <Navigate to="admins" replace /> },
      {
        path: 'admins',
        element: <AdminAccounts />,
        meta: { title: '管理员账号', icon: 'TeamOutlined', roles: ['super_admin'] },
      },
      {
        path: 'security-audit',
        element: <SecurityAudit />,
        meta: { title: '安全审计', icon: 'SafetyCertificateOutlined', roles: ['super_admin'] },
      },
      {
        path: 'updates',
        element: <SystemUpdates />,
        meta: { title: '版本与更新', icon: 'SyncOutlined', roles: ['super_admin'] },
      },
    ],
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
      { index: true, element: <AdminLandingRedirect /> },
      ...(adminRoutes as RouteObject[]),
    ],
  },
  {
    path: '*',
    element: <Navigate to="/admin/login" replace />,
  },
]
