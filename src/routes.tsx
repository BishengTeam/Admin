import { lazy } from 'react'
import { Navigate, useLocation, type RouteObject } from 'react-router-dom'
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
  activeMenuKey?: string
}

export interface AppRoute {
  path?: string
  menuKey?: string
  index?: boolean
  element?: React.ReactNode
  children?: AppRoute[]
  meta?: RouteMeta
}

const LoginPage = lazy(() => import('@/pages/login'))
const Dashboard = lazy(() => import('@/pages/dashboard'))
const UserList = lazy(() => import('@/pages/users'))
const OrderList = lazy(() => import('@/pages/orders'))
const TicketManagement = lazy(() => import('@/pages/tickets'))
const AgreementTemplates = lazy(() => import('@/pages/agreementTemplates'))
const QuizManagement = lazy(() => import('@/pages/quiz'))
const QuizWorkbench = lazy(() => import('@/pages/quiz/workbench'))
const QuizImportCenter = lazy(() => import('@/pages/quiz/import-center'))
const QuizAuditLogs = lazy(() => import('@/pages/quiz/audit-logs'))
const QuizAnalytics = lazy(() => import('@/pages/quiz/analytics'))
const QuizReviews = lazy(() => import('@/pages/quiz/reviews'))
const HomepageManagement = lazy(() => import('@/pages/operations/homepage'))
const CourseList = lazy(() => import('@/pages/courses/List'))
const CourseCategories = lazy(() => import('@/pages/courses/Categories'))
const CourseDetail = lazy(() => import('@/pages/courses/Detail'))
const CourseStudents = lazy(() => import('@/pages/courses/Students'))
const CourseAudit = lazy(() => import('@/pages/courses/Audit'))
const VideoWebCodes = lazy(() => import('@/pages/courses/Codes'))
const CertificationOverview = lazy(() => import('@/pages/certification'))
const TypeWorkbench = lazy(() => import('@/pages/certification/TypeWorkbench'))
const H3cBatchExportWorkbench = lazy(() => import('@/pages/certification/components/vendors/h3c/BatchExportWorkbench'))
const NispBatchWorkbench = lazy(() => import('@/pages/certification/components/vendors/nisp/BatchWorkbench'))
const RensheBatchWorkbench = lazy(() => import('@/pages/certification/components/vendors/renshe/BatchWorkbench'))
const SangforBatchWorkbench = lazy(() => import('@/pages/certification/components/vendors/sangfor/BatchWorkbench'))
const JobManagement = lazy(() => import('@/pages/operations/jobs'))
const TrainingManagement = lazy(() => import('@/pages/operations/training'))
const ActivityManagement = lazy(() => import('@/pages/operations/activities'))
const CompetitionManagement = lazy(() => import('@/pages/operations/competitions'))
const DocumentManagement = lazy(() => import('@/pages/operations/documents'))
const ClassroomManagement = lazy(() => import('@/pages/classrooms'))
const ClassroomWorkbench = lazy(() => import('@/pages/classrooms/Workbench'))
const PointsMallManagement = lazy(() => import('@/pages/pointsMall'))
const ReviewManagement = lazy(() => import('@/pages/review'))
const ChangePassword = lazy(() => import('@/pages/change-password'))
const AdminAccounts = lazy(() => import('@/pages/settings/admins'))
const SecurityAudit = lazy(() => import('@/pages/settings/security-audit'))
const SystemUpdates = lazy(() => import('@/pages/settings/updates'))

import AuthGuard from '@/components/AuthGuard'
import LoginLayout from '@/layouts/LoginLayout'

function AdminLandingRedirect() {
  const role = useAuthStore((state) => state.admin?.role)
  return <Navigate to={getAdminLandingPath(role)} replace />
}

function QuizTabRedirect({ path, tab }: { path: 'questions' | 'imports' | 'stats'; tab: string }) {
  const { search } = useLocation()
  const nextSearch = new URLSearchParams({ tab })
  new URLSearchParams(search).forEach((value, key) => {
    if (key !== 'tab') nextSearch.set(key, value)
  })
  return <Navigate to={{ pathname: `/admin/quiz/${path}`, search: `?${nextSearch.toString()}` }} replace />
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
    meta: { title: '数据概览', icon: 'DashboardOutlined', permission: 'dashboard:view' },
  },
  {
    menuKey: 'user-support',
    meta: { title: '用户与客服', icon: 'TeamOutlined' },
    children: [
      {
        path: 'users',
        element: <UserList />,
        meta: { title: '用户管理', icon: 'TeamOutlined', permission: 'user:list' },
      },
      {
        path: 'tickets',
        element: <TicketManagement />,
        meta: { title: '客服工单', icon: 'CustomerServiceOutlined', permission: 'user:list' },
      },
      {
        path: 'reviews',
        element: <ReviewManagement />,
        meta: { title: '审核记录', icon: 'AuditOutlined', permission: 'review:list' },
      },
      {
        path: 'agreement-templates',
        element: <Navigate to="/admin/content/agreement-templates" replace />,
        meta: { title: '协议模板', hidden: true },
      },
    ],
  },
  {
    path: 'certification',
    meta: {
      title: '认证报名',
      icon: 'SafetyCertificateOutlined',
      permissions: [
        'content:list',
        'h3c:review',
        'h3c:export',
        'h3c:refund',
        'user:list',
        'user:write',
        'order:list',
        'nisp:review',
        'nisp:export',
        'nisp:refund',
      ],
    },
    children: [
      {
        index: true,
        element: <Navigate to="overview" replace />,
        meta: { title: '认证总览', hidden: true },
      },
      {
        path: 'overview',
        element: <CertificationOverview />,
        meta: { title: '认证总览', icon: 'DashboardOutlined', permission: 'content:list' },
      },
      {
        path: 'h3c',
        element: <TypeWorkbench type='h3c' />,
        meta: {
          title: '新华三认证',
          icon: 'ClusterOutlined',
          permissions: ['h3c:review', 'h3c:export', 'h3c:refund'],
        },
      },
      {
        path: 'h3c/batches/:batchId',
        element: <H3cBatchExportWorkbench />,
        meta: {
          title: 'H3C 批次工作台',
          icon: 'FileZipOutlined',
          permissions: ['h3c:review', 'h3c:export', 'h3c:refund'],
          hidden: true,
          activeMenuKey: 'certification/h3c',
        },
      },
      {
        path: 'h3c/export/:batchId',
        element: <H3cBatchExportWorkbench />,
        meta: {
          title: 'H3C 批次工作台',
          icon: 'FileZipOutlined',
          permissions: ['h3c:review', 'h3c:export', 'h3c:refund'],
          hidden: true,
          activeMenuKey: 'certification/h3c',
        },
      },
      {
        path: 'renshe',
        element: <TypeWorkbench type='renshe' />,
        meta: {
          title: '人社认证',
          icon: 'AuditOutlined',
          permissions: ['user:list', 'user:write', 'order:list'],
        },
      },
      {
        path: 'renshe/batches/:batchId',
        element: <RensheBatchWorkbench />,
        meta: {
          title: '人社批次工作台',
          icon: 'AuditOutlined',
          permissions: ['user:list', 'user:write', 'order:list'],
          hidden: true,
          activeMenuKey: 'certification/renshe',
        },
      },
      {
        path: 'nisp',
        element: <TypeWorkbench type='nisp' />,
        meta: {
          title: 'NISP认证',
          icon: 'FileSearchOutlined',
          permissions: ['nisp:review', 'nisp:export', 'nisp:refund'],
        },
      },
      {
        path: 'nisp/batches/:batchId',
        element: <NispBatchWorkbench />,
        meta: {
          title: 'NISP 批次工作台',
          icon: 'FileZipOutlined',
          permissions: ['nisp:review', 'nisp:export', 'nisp:refund'],
          hidden: true,
          activeMenuKey: 'certification/nisp',
        },
      },
      {
        path: 'sangfor',
        element: <TypeWorkbench type='sangfor' />,
        meta: { title: '深信服认证', icon: 'SafetyCertificateOutlined', permissions: ['content:list', 'order:list'] },
      },
      {
        path: 'sangfor/batches/:batchId',
        element: <SangforBatchWorkbench />,
        meta: { title: '深信服批次工作台', icon: 'SafetyCertificateOutlined', permissions: ['order:list'], hidden: true, activeMenuKey: 'certification/sangfor' },
      },
    ],
  },
  {
    menuKey: 'learning',
    meta: { title: '课程与教学', icon: 'ReadOutlined' },
    children: [
      {
        path: 'courses',
        meta: { title: '课程商品', icon: 'ReadOutlined', permission: 'course:read' },
        children: [
          { index: true, element: <Navigate to="list" replace /> },
          {
            path: 'list',
            element: <CourseList />,
            meta: { title: '课程列表', icon: 'ReadOutlined', permission: 'course:read' },
          },
          {
            path: 'students',
            element: <CourseStudents />,
            meta: { title: '报名学员', icon: 'TeamOutlined', permission: 'course:read' },
          },
          {
            path: 'codes',
            element: <VideoWebCodes />,
            meta: { title: '课程兑换码', icon: 'KeyOutlined', permission: 'course:read' },
          },
          {
            path: 'categories',
            element: <CourseCategories />,
            meta: { title: '类目管理', icon: 'ClusterOutlined', permission: 'course:write' },
          },
          {
            path: 'audit',
            element: <CourseAudit />,
            meta: { title: '课程审计', icon: 'AuditOutlined', permission: 'course:read' },
          },
          {
            path: ':courseId',
            element: <CourseDetail />,
            meta: {
              title: '课程工作台',
              icon: 'PlayCircleOutlined',
              permission: 'course:read',
              hidden: true,
              activeMenuKey: 'courses/list',
            },
          },
        ],
      },
      {
        path: 'classrooms',
        meta: { title: '教学课堂', icon: 'TeamOutlined', permission: 'classroom:manage' },
        children: [
          {
            index: true,
            element: <ClassroomManagement />,
            meta: {
              title: '教学课堂',
              permission: 'classroom:manage',
              hidden: true,
              activeMenuKey: 'classrooms',
            },
          },
          {
            path: ':classroomId',
            element: <ClassroomWorkbench />,
            meta: {
              title: '课堂工作台',
              icon: 'TeamOutlined',
              permission: 'classroom:manage',
              hidden: true,
              activeMenuKey: 'classrooms',
            },
          },
        ],
      },
    ],
  },
  {
    path: 'quiz',
    meta: { title: '题库与考试', icon: 'BookOutlined' },
    children: [
      { index: true, element: <Navigate to="questions" replace /> },
      {
        path: 'libraries',
        element: <QuizTabRedirect path="questions" tab="libraries" />,
        meta: { title: '题库（已合并）', permission: 'quiz:list', hidden: true },
      },
      {
        path: 'categories',
        element: <QuizTabRedirect path="questions" tab="content" />,
        meta: { title: '分类管理（已合并）', permission: 'quiz:list', hidden: true },
      },
      {
        path: 'questions',
        element: <QuizWorkbench />,
        meta: { title: '题库工作台', icon: 'BookOutlined', permission: 'quiz:list' },
      },
      {
        path: 'legacy-questions',
        element: <QuizManagement />,
        meta: { title: '旧分类兼容（7 天）', permission: 'quiz:list', hidden: true },
      },
      {
        path: 'imports',
        element: <QuizImportCenter />,
        meta: { title: '导入与任务', icon: 'ImportOutlined', permission: 'quiz:list' },
      },
      {
        path: 'reviews',
        element: <QuizReviews />,
        meta: { title: '考试人工评阅', icon: 'AuditOutlined', permission: 'quiz_review' },
      },
      {
        path: 'stats',
        element: <QuizAnalytics />,
        meta: { title: '题库数据', icon: 'BarChartOutlined', permission: 'quiz:list' },
      },
      {
        path: 'behavior',
        element: <QuizTabRedirect path="stats" tab="behavior" />,
        meta: { title: '用户行为（已合并）', permission: 'quiz:list', hidden: true },
      },
      {
        path: 'audit-logs',
        element: <QuizAuditLogs />,
        meta: { title: '审计日志', icon: 'FileSearchOutlined', permission: 'quiz:list' },
      },
      {
        path: 'tasks',
        element: <QuizTabRedirect path="imports" tab="tasks" />,
        meta: { title: '任务监控（已合并）', permission: 'quiz:list', hidden: true },
      },
    ],
  },
  {
    path: 'orders',
    element: <OrderList />,
    meta: { title: '订单管理', icon: 'ShoppingOutlined', permission: 'order:list' },
  },
  {
    menuKey: 'content-operations',
    meta: { title: '内容与运营', icon: 'AppstoreOutlined' },
    children: [
      {
        path: 'content',
        element: <Navigate to="/admin/content/agreement-templates" replace />,
        meta: { title: '协议模板', hidden: true },
      },
      {
        path: 'operations',
        element: <Navigate to="/admin/operations/homepage" replace />,
        meta: { title: '首页配置', hidden: true },
      },
      {
        path: 'content/agreement-templates',
        element: <AgreementTemplates />,
        meta: { title: '协议模板', icon: 'AuditOutlined', permission: 'content:list' },
      },
      {
        path: 'content/documents',
        element: <DocumentManagement />,
        meta: { title: '文档管理', icon: 'FilePdfOutlined', permission: 'document:read' },
      },
      {
        path: 'operations/homepage',
        element: <HomepageManagement />,
        meta: { title: '首页配置', icon: 'PictureOutlined', permission: 'homepage:list' },
      },
      {
        path: 'operations/jobs',
        element: <JobManagement />,
        meta: { title: '招聘管理', icon: 'IdcardOutlined', permission: 'job:list' },
      },
      {
        path: 'operations/training',
        element: <TrainingManagement />,
        meta: { title: '培训活动', icon: 'SolutionOutlined', permission: 'training:list' },
      },
      {
        path: 'operations/activities',
        element: <ActivityManagement />,
        meta: { title: '活动管理', icon: 'CalendarOutlined', permission: 'activity:list' },
      },
      {
        path: 'operations/competitions',
        element: <CompetitionManagement />,
        meta: { title: '竞赛管理', icon: 'TrophyOutlined', permission: 'competition:list' },
      },
      {
        path: 'operations/documents',
        element: <Navigate to="/admin/content/documents" replace />,
        meta: { title: '文档管理', hidden: true },
      },
    ],
  },
  {
    path: 'points-mall',
    element: <PointsMallManagement />,
    meta: { title: '积分商城', icon: 'GiftOutlined', permission: 'points:manage' },
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
