import type { AdminCreatableRole, AdminRole } from '@/types/admin'

export function checkPermission(permissions: string[], code: string): boolean {
  return permissions.includes('*') || permissions.includes(code)
}

export function checkPermissionOneOf(permissions: string[], codes: string[]): boolean {
  return permissions.includes('*') || codes.some((code) => permissions.includes(code))
}

export function getAdminLandingPath(role: AdminRole | string | undefined): string {
  if (role === 'quiz_admin') return '/admin/quiz/questions'
  if (role === 'h3c_admin') return '/admin/h3c'
  if (role === 'course_admin') return '/admin/courses'
  return '/admin/dashboard'
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: '超级管理员',
  quiz_admin: '题库管理员',
  h3c_admin: 'H3C 管理员',
  course_admin: '课程管理员',
}

export const ADMIN_CREATABLE_ROLE_OPTIONS = [
  { label: ADMIN_ROLE_LABELS.quiz_admin, value: 'quiz_admin' },
  { label: ADMIN_ROLE_LABELS.h3c_admin, value: 'h3c_admin' },
  { label: ADMIN_ROLE_LABELS.course_admin, value: 'course_admin' },
] as const satisfies ReadonlyArray<{ label: string; value: AdminCreatableRole }>

export function getAdminRoleLabel(role: AdminRole | string | undefined): string {
  if (!role) return '-'
  return ADMIN_ROLE_LABELS[role as AdminRole] ?? role
}
