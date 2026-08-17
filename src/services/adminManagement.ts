import { http } from '@/core/request'
import {
  AdminAccountMutationResultSchema,
  AdminAccountPageSchema,
  AdminAccountSchema,
  parseAdminResponse,
  SecurityAuditPageSchema,
} from '@/core/adminValidation'
import type { PageData } from '@/types/api'
import type {
  AdminAccount,
  AdminAccountFilters,
  AdminAccountMutationResult,
  AdminCreatableRole,
  SecurityAuditFilters,
  SecurityAuditItem,
} from '@/types/admin'

function reauthConfig(reauthToken: string) {
  return { headers: { 'X-Reauth-Token': reauthToken } }
}

export function newAdminIdempotencyKey(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  // randomUUID is restricted to secure contexts in some browsers, while
  // getRandomValues remains available. Keep the fallback cryptographically
  // random and RFC 4122 version/variant compliant; never fall back to Math.random.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function credentialMutationConfig(reauthToken: string) {
  // This config is created once per public service call (one user action).
  // A transport-level retry of that same request keeps this fixed header;
  // invoking the service again creates a new key for the next user action.
  return {
    headers: {
      'X-Reauth-Token': reauthToken,
      'Idempotency-Key': newAdminIdempotencyKey(),
    },
  }
}

export const adminManagementService = {
  listAdmins(params: AdminAccountFilters, signal?: AbortSignal): Promise<PageData<AdminAccount>> {
    return http.get('/admin/settings/admins', { params, signal })
      .then((value) => parseAdminResponse(AdminAccountPageSchema, value))
  },

  createAdmin(
    payload: { username: string; display_name: string; role: AdminCreatableRole },
    reauthToken: string,
  ): Promise<AdminAccountMutationResult> {
    return http.post('/admin/settings/admins', payload, credentialMutationConfig(reauthToken))
      .then((value) => parseAdminResponse(AdminAccountMutationResultSchema, value))
  },

  updateDisplayName(adminId: number, displayName: string, reauthToken: string): Promise<AdminAccount> {
    return http.patch(
      `/admin/settings/admins/${adminId}`,
      { display_name: displayName },
      reauthConfig(reauthToken),
    ).then((value) => parseAdminResponse(AdminAccountSchema, value))
  },

  disableAdmin(adminId: number, reauthToken: string): Promise<AdminAccount> {
    return http.post(
      `/admin/settings/admins/${adminId}/disable`,
      {},
      reauthConfig(reauthToken),
    ).then((value) => parseAdminResponse(AdminAccountSchema, value))
  },

  enableAdmin(adminId: number, reauthToken: string): Promise<AdminAccountMutationResult> {
    return http.post(
      `/admin/settings/admins/${adminId}/enable`,
      {},
      credentialMutationConfig(reauthToken),
    ).then((value) => parseAdminResponse(AdminAccountMutationResultSchema, value))
  },

  resetPassword(adminId: number, reauthToken: string): Promise<AdminAccountMutationResult> {
    return http.post(
      `/admin/settings/admins/${adminId}/password-reset`,
      {},
      credentialMutationConfig(reauthToken),
    ).then((value) => parseAdminResponse(AdminAccountMutationResultSchema, value))
  },

  unlockAdmin(adminId: number, reauthToken: string): Promise<AdminAccount> {
    return http.post(
      `/admin/settings/admins/${adminId}/unlock`,
      {},
      reauthConfig(reauthToken),
    ).then((value) => parseAdminResponse(AdminAccountSchema, value))
  },

  listSecurityAudit(
    params: SecurityAuditFilters,
    signal?: AbortSignal,
  ): Promise<PageData<SecurityAuditItem>> {
    return http.get('/admin/settings/security-audit', { params, signal })
      .then((value) => parseAdminResponse(SecurityAuditPageSchema, value))
  },
}
