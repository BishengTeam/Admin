import type { AdminRole } from '@/types/admin'

export function checkPermission(permissions: string[], code: string): boolean {
  return permissions.includes('*') || permissions.includes(code)
}

export function checkPermissionOneOf(permissions: string[], codes: string[]): boolean {
  return permissions.includes('*') || codes.some((code) => permissions.includes(code))
}

export function getAdminLandingPath(role: AdminRole | string | undefined): string {
  return role === 'quiz_admin' ? '/admin/quiz/questions' : '/admin/dashboard'
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: '超级管理员',
  quiz_admin: '题库管理员',
}

export function getAdminRoleLabel(role: AdminRole | string | undefined): string {
  if (!role) return '-'
  return ADMIN_ROLE_LABELS[role as AdminRole] ?? role
}
