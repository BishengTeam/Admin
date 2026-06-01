import { useAuthStore } from '@/stores/authStore'

export function usePermission(code: string): boolean {
  const permissions = useAuthStore((s) => s.permissions)
  // permissions 包含 "*" 表示超级管理员，拥有全部权限
  return permissions.includes('*') || permissions.includes(code)
}
