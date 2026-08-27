import { describe, expect, it } from 'vitest'
import { adminRoutes } from '@/routes'
import { buildMenuItems, hasRouteAccess } from '@/layouts/AdminLayout'
import { ADMIN_CREATABLE_ROLE_OPTIONS, getAdminLandingPath } from '@/core/permission'

describe('fixed administrator role navigation', () => {
  it('uses the frozen role-specific login landing pages', () => {
    expect(getAdminLandingPath('super_admin')).toBe('/admin/dashboard')
    expect(getAdminLandingPath('quiz_admin')).toBe('/admin/quiz/questions')
    expect(getAdminLandingPath('course_admin')).toBe('/admin/courses')
  })

  it('only exposes preset non-super roles to the creation dialog', () => {
    expect(ADMIN_CREATABLE_ROLE_OPTIONS).toEqual([
      { label: '题库管理员', value: 'quiz_admin' },
      { label: 'H3C 管理员', value: 'h3c_admin' },
      { label: '课程管理员', value: 'course_admin' },
    ])
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

  it('shows the update checker only inside super-admin system management', () => {
    const settings = adminRoutes.find((route) => route.path === 'settings')!
    const updates = settings.children!.find((route) => route.path === 'updates')!
    expect(hasRouteAccess(updates, ['*'], true, 'super_admin')).toBe(true)
    expect(hasRouteAccess(updates, ['quiz:list'], true, 'quiz_admin')).toBe(false)
  })

 it('shows the H3C workbench to H3C and super administrators only', () => {
    const cert = adminRoutes.find((route) => route.path === 'certification')!
    const h3c = cert.children!.find((route) => route.path === 'h3c')!
   expect(hasRouteAccess(h3c, ['*'], true, 'super_admin')).toBe(true)
   expect(hasRouteAccess(h3c, ['h3c:review'], true, 'h3c_admin')).toBe(true)
   expect(hasRouteAccess(h3c, ['quiz:list'], true, 'quiz_admin')).toBe(false)
 })

  it('denies non-quiz routes even when a quiz administrator opens a URL directly', () => {
    const users = adminRoutes.find((route) => route.path === 'users')!
    const quizQuestions = adminRoutes
      .find((route) => route.path === 'quiz')!
      .children!.find((route) => route.path === 'questions')!
    expect(hasRouteAccess(users, ['quiz:list'], true, 'quiz_admin')).toBe(false)
    expect(hasRouteAccess(quizQuestions, ['quiz:list'], true, 'quiz_admin')).toBe(true)
  })
})
