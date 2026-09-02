import type { AdminCreatableRole, AdminRole } from '@/types/admin'

export function checkPermission(permissions: string[], code: string): boolean {
  return permissions.includes('*') || permissions.includes(code)
}

export function checkPermissionOneOf(permissions: string[], codes: string[]): boolean {
  return permissions.includes('*') || codes.some((code) => permissions.includes(code))
}

export function getAdminLandingPath(role: AdminRole | string | undefined): string {
  if (role === 'quiz_admin') return '/admin/quiz/questions'
  if (role === 'cert_admin') return '/admin/certification'
  if (role === 'course_admin') return '/admin/courses'
  if (role === 'teacher') return '/admin/classrooms'
  return '/admin/dashboard'
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: '超级管理员',
  quiz_admin: '题库管理员',
  cert_admin: '认证管理员',
  course_admin: '课程管理员',
  teacher: '老师',
}

export const ADMIN_CREATABLE_ROLE_OPTIONS = [
  { label: ADMIN_ROLE_LABELS.quiz_admin, value: 'quiz_admin' },
  { label: ADMIN_ROLE_LABELS.cert_admin, value: 'cert_admin' },
  { label: ADMIN_ROLE_LABELS.course_admin, value: 'course_admin' },
  { label: ADMIN_ROLE_LABELS.teacher, value: 'teacher' },
] as const satisfies ReadonlyArray<{ label: string; value: AdminCreatableRole }>

export function getAdminRoleLabel(role: AdminRole | string | undefined): string {
  if (!role) return '-'
  return ADMIN_ROLE_LABELS[role as AdminRole] ?? role
}
