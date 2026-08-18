import type { PageParams } from './api'

export type AdminRole = 'super_admin' | 'quiz_admin'
export type AdminCreatableRole = Exclude<AdminRole, 'super_admin'>
export type AdminSessionMode = 'normal' | 'restricted'

export interface AdminInfo {
  id: number
  username: string
  display_name: string
  role: AdminRole
  is_active: boolean
  must_change_password: boolean
  locked_until: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminAuthSession {
  access_token: string
  expires_in: number
  admin: AdminInfo
  permissions: string[]
  session_mode: AdminSessionMode
  must_change_password: boolean
}

export interface AdminMe {
  admin: AdminInfo
  permissions: string[]
  session_mode: AdminSessionMode
  must_change_password: boolean
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface ReauthResponse {
  reauth_token: string
  expires_in: number
}

export type AdminAccount = AdminInfo

export interface AdminAccountFilters extends PageParams {
  search?: string
  role?: AdminRole
  is_active?: boolean
  is_locked?: boolean
  must_change_password?: boolean
}

export interface AdminAccountMutationResult {
  admin: AdminAccount
  temporary_password: string
}

export type SecurityAuditResult = 'succeeded' | 'failed'

export interface SecurityAuditItem {
  id: number
  action: string
  result: SecurityAuditResult
  reason_code: string | null
  actor_admin_id: number | null
  target_admin_id: number | null
  username: string | null
  request_id: string | null
  source_ip: string | null
  user_agent: string | null
  summary: Record<string, unknown> | null
  created_at: string
}

export interface SecurityAuditFilters extends PageParams {
  actor_admin_id?: number
  target_admin_id?: number
  action?: string
  result?: SecurityAuditResult
  username?: string
  request_id?: string
  started_at?: string
  ended_at?: string
}

export interface SystemUpdateVersion {
  release_tag: string
  backend_commit: string
  admin_commit: string
}

export interface SystemUpdateAsset {
  name: string
  size: number
  download_url: string
}

export interface SystemUpdateRelease {
  release_tag: string
  published_at: string
  html_url: string
  notes: string
  backend_commit: string
  admin_commit: string
  assets: SystemUpdateAsset[]
}

export interface SystemUpdateCheck {
  current: SystemUpdateVersion
  latest: SystemUpdateRelease | null
  update_available: boolean
  check_status: 'ok' | 'unavailable'
  checked_at: string
  reason_code: string | null
  manual_upgrade_required: boolean
  dry_run_command: string
  upgrade_command: string
  estimated_downtime_seconds: number
}
