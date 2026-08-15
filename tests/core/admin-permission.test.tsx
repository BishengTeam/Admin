import { describe, expect, it } from 'vitest'
import { adminRoutes } from '@/routes'
import { buildMenuItems, hasRouteAccess } from '@/layouts/AdminLayout'
import { getAdminLandingPath } from '@/core/permission'

describe('fixed administrator role navigation', () => {
  it('uses the frozen role-specific login landing pages', () => {
    expect(getAdminLandingPath('super_admin')).toBe('/admin/dashboard')
    expect(getAdminLandingPath('quiz_admin')).toBe('/admin/quiz/questions')
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

  it('denies non-quiz routes even when a quiz administrator opens a URL directly', () => {
    const users = adminRoutes.find((route) => route.path === 'users')!
    const quizQuestions = adminRoutes
      .find((route) => route.path === 'quiz')!
      .children!.find((route) => route.path === 'questions')!
    expect(hasRouteAccess(users, ['quiz:list'], true, 'quiz_admin')).toBe(false)
    expect(hasRouteAccess(quizQuestions, ['quiz:list'], true, 'quiz_admin')).toBe(true)
  })
})
