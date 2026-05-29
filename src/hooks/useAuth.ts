import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const token = useAuthStore((s) => s.token)
  const admin = useAuthStore((s) => s.admin)
  const permissions = useAuthStore((s) => s.permissions)

  return {
    token,
    admin,
    permissions,
    isAuthenticated: !!token,
  }
}
