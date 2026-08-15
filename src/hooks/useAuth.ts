import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const token = useAuthStore((s) => s.token)
  const admin = useAuthStore((s) => s.admin)
  const permissions = useAuthStore((s) => s.permissions)
  const sessionMode = useAuthStore((s) => s.sessionMode)
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword)
  const initialized = useAuthStore((s) => s.initialized)

  return {
    token,
    admin,
    permissions,
    sessionMode,
    mustChangePassword,
    initialized,
    isAuthenticated: !!token && initialized,
  }
}
