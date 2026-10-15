import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { adminRoutes } from '@/routes'
import {
  buildMenuItems,
  findActiveRoute,
  findBreadcrumb,
  getMenuAncestorKeys,
  hasRouteAccess,
} from '@/layouts/AdminLayout'
import { ADMIN_CREATABLE_ROLE_OPTIONS, getAdminLandingPath } from '@/core/permission'

describe('fixed administrator role navigation', () => {
  it('uses the frozen role-specific login landing pages', () => {
    expect(getAdminLandingPath('super_admin')).toBe('/admin/dashboard')
    expect(getAdminLandingPath('quiz_admin')).toBe('/admin/quiz/questions')
    expect(getAdminLandingPath('cert_admin')).toBe('/admin/certification')
    expect(getAdminLandingPath('course_admin')).toBe('/admin/courses')
  })

  it('only exposes preset non-super roles to the creation dialog', () => {
    expect(ADMIN_CREATABLE_ROLE_OPTIONS).toEqual([
      { label: '题库管理员', value: 'quiz_admin' },
      { label: '认证管理员', value: 'cert_admin' },
      { label: '课程管理员', value: 'course_admin' },
      { label: '老师', value: 'teacher' },
    ])
  })

  it('keeps role-specific navigation to nine primary workspaces for super administrators', () => {
    type MenuItem = { key: string; label: string; children?: Array<{ key: string; label: string }> }
    const superMenu = buildMenuItems(adminRoutes, ['*'], true, 'super_admin') as MenuItem[]

    expect(superMenu.map((item) => item.key)).toEqual([
      'dashboard',
      'user-support',
      'certification',
      'learning',
      'quiz',
      'orders',
      'content-operations',
      'points-mall',
      'settings',
    ])
    expect(superMenu.map((item) => item.label)).toEqual([
      '数据概览',
      '用户与客服',
      '认证报名',
      '课程与教学',
      '题库与考试',
      '订单管理',
      '内容与运营',
      '积分商城',
      '系统管理',
    ])
    expect(superMenu.find((item) => item.key === 'user-support')?.children?.map((child) => child.label))
      .toEqual(['用户管理', '客服工单', '审核记录'])
  })

  it('shows system management only to the unique super administrator', () => {
    const settings = adminRoutes.find((route) => route.path === 'settings')!
    expect(hasRouteAccess(settings, ['*'], true, 'super_admin')).toBe(true)
    expect(hasRouteAccess(settings, ['quiz:list'], true, 'quiz_admin')).toBe(false)

    const superMenu = buildMenuItems(adminRoutes, ['*'], true, 'super_admin') as Array<{ key: string }>
    const quizMenu = buildMenuItems(adminRoutes, ['quiz:list', 'quiz:write', 'quiz:import'], true, 'quiz_admin') as Array<{ key: string }>
    expect(superMenu.some((item) => item.key === 'settings')).toBe(true)
    expect(quizMenu.map((item) => item.key)).toEqual(['quiz'])
  })

  it('groups course products and teaching classrooms for administrators and teachers', () => {
    type MenuItem = { key: string; label: string; children?: Array<{ key: string; label: string }> }

    const superMenu = buildMenuItems(adminRoutes, ['*'], true, 'super_admin') as MenuItem[]
    const teacherMenu = buildMenuItems(
      adminRoutes,
      ['classroom:manage'],
      true,
      'teacher',
    ) as MenuItem[]

    const superLearning = superMenu.find((item) => item.key === 'learning')
    const teacherLearning = teacherMenu.find((item) => item.key === 'learning')

    expect(superLearning).toMatchObject({
      key: 'learning',
      label: '课程与教学',
    })
    expect(superLearning?.children?.map((child) => child.key)).toEqual(['courses', 'classrooms'])
    expect(teacherLearning).toMatchObject({
      key: 'learning',
      label: '课程与教学',
    })
    expect(teacherLearning?.children?.map((child) => child.key)).toEqual(['classrooms'])
  })

  it('shows the update checker only inside super-admin system management', () => {
    const settings = adminRoutes.find((route) => route.path === 'settings')!
    const updates = settings.children!.find((route) => route.path === 'updates')!
    expect(hasRouteAccess(updates, ['*'], true, 'super_admin')).toBe(true)
    expect(hasRouteAccess(updates, ['quiz:list'], true, 'quiz_admin')).toBe(false)
  })

  it('shows the certification workbench based on content permission', () => {
    const superMenu = buildMenuItems(adminRoutes, ['*'], true, 'super_admin') as Array<{
      key: string
      children?: Array<{ key: string; label: string }>
    }>
    const certMenu = superMenu.find((item) => item.key === 'certification')
    expect(certMenu).toBeDefined()
    expect(certMenu!.children!.map((child) => child.key)).toEqual([
      'certification/overview',
      'certification/h3c',
      'certification/renshe',
      'certification/nisp',
      'certification/sangfor',
    ])

    const certAdminPermissions = [
      'content:read',
      'content:list',
      'content:write',
      'user:list',
      'user:write',
      'order:list',
      'h3c:batch_manage',
      'h3c:review',
      'h3c:export',
      'h3c:refund',
      'h3c:order_close',
    ]
    const certAdminMenu = buildMenuItems(adminRoutes, certAdminPermissions, true, 'cert_admin') as Array<{
      key: string
      children?: Array<{ key: string }>
    }>
    const certAdminCert = certAdminMenu.find((item) => item.key === 'certification')
    expect(certAdminCert).toBeDefined()
    expect(certAdminCert!.children!.map((child) => child.key)).toEqual([
      'certification/overview',
      'certification/h3c',
      'certification/renshe',
      'certification/sangfor',
    ])

    const quizMenu = buildMenuItems(adminRoutes, ['quiz:list'], true, 'quiz_admin') as Array<{ key: string }>
    expect(quizMenu.find((item) => item.key === 'certification')).toBeUndefined()
  })

  it('denies non-quiz routes even when a quiz administrator opens a URL directly', () => {
    const users = findActiveRoute('users', adminRoutes)!
    const quizQuestions = adminRoutes
      .find((route) => route.path === 'quiz')!
      .children!.find((route) => route.path === 'questions')!
    expect(hasRouteAccess(users, ['quiz:list'], true, 'quiz_admin')).toBe(false)
    expect(hasRouteAccess(quizQuestions, ['quiz:list'], true, 'quiz_admin')).toBe(true)
  })

  it('keeps detail pages attached to their owning menu entries', () => {
    const cases = [
      { path: 'certification/renshe/batches/12', menuKey: 'certification/renshe' },
      { path: 'certification/h3c/batches/34', menuKey: 'certification/h3c' },
      { path: 'certification/nisp/batches/56', menuKey: 'certification/nisp' },
      { path: 'courses/78', menuKey: 'courses/list' },
      { path: 'classrooms/90', menuKey: 'classrooms' },
    ]

    for (const item of cases) {
      const route = findActiveRoute(item.path, adminRoutes)
      expect(route?.meta?.activeMenuKey).toBe(item.menuKey)
    }
  })

  it('builds breadcrumbs for dynamic detail routes and real detail titles', () => {
    expect(findBreadcrumb('certification/renshe/batches/12', adminRoutes, '', undefined)).toEqual([
      { title: '认证报名' },
      { title: '人社认证' },
      { title: '人社批次工作台' },
    ])
    expect(findBreadcrumb(
      'certification/renshe/batches/12',
      adminRoutes,
      '',
      '2026 春季批次',
    )).toEqual([
      { title: '认证报名' },
      { title: '人社认证' },
      { title: '2026 春季批次' },
    ])
  })

  it('opens every menu layer needed by a nested workbench', () => {
    const menu = buildMenuItems(adminRoutes, ['*'], true, 'super_admin')
    expect(getMenuAncestorKeys(menu, 'courses/list')).toEqual(['learning', 'courses'])
    expect(getMenuAncestorKeys(menu, 'certification/h3c')).toEqual(['certification'])
    expect(getMenuAncestorKeys(menu, 'operations/competitions')).toEqual(['content-operations'])
  })

  it('passes real business names into detail breadcrumbs', () => {
    const paths = [
      'src/pages/certification/components/vendors/h3c/BatchOverrides.tsx',
      'src/pages/certification/components/vendors/nisp/BatchOverrides.tsx',
      'src/pages/certification/components/vendors/renshe/BatchOverrides.tsx',
      'src/pages/courses/List.tsx',
      'src/pages/classrooms/index.tsx',
    ]
    for (const path of paths) {
      expect(readFileSync(resolve(process.cwd(), path), 'utf8'), path)
        .toContain('breadcrumbTitle')
    }
  })

  it('keeps the sidebar at native size', () => {
    const globalStyles = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')
    expect(globalStyles).not.toContain('--admin-shell-zoom')
    expect(globalStyles).not.toContain('zoom:')
  })

  it('consolidates quiz navigation without hiding task monitoring from list-only admins', () => {
    const quiz = adminRoutes.find((route) => route.path === 'quiz')!
    const visibleChildren = quiz.children!.filter((route) => route.meta && !route.meta.hidden)
    const imports = quiz.children!.find((route) => route.path === 'imports')!

    expect(visibleChildren.map((route) => route.path)).toEqual([
      'questions',
      'imports',
      'reviews',
      'stats',
      'audit-logs',
    ])
    expect(visibleChildren.map((route) => route.meta!.title)).toEqual([
      '题库工作台',
      '导入与任务',
      '考试人工评阅',
      '题库数据',
      '审计日志',
    ])
    expect(hasRouteAccess(imports, ['quiz:list'], true, 'quiz_admin')).toBe(true)
  })
})
