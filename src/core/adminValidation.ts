import { z } from 'zod'

const positiveInt = z.number().int().positive()
const dateString = z.string().min(1)
const nullableDate = dateString.nullable()

export const AdminAccountSchema = z.object({
  id: positiveInt,
  username: z.string().min(1),
  display_name: z.string().min(1),
  role: z.enum(['super_admin', 'quiz_admin', 'h3c_admin']),
  is_active: z.boolean(),
  must_change_password: z.boolean(),
  locked_until: nullableDate,
  last_login_at: nullableDate,
  created_at: dateString,
  updated_at: dateString,
}).strict()

export const AdminAuthSessionSchema = z.object({
  access_token: z.string().min(1),
  expires_in: positiveInt,
  admin: AdminAccountSchema,
  permissions: z.array(z.string()),
  session_mode: z.enum(['normal', 'restricted']),
  must_change_password: z.boolean(),
}).strict()

export const AdminMeSchema = AdminAuthSessionSchema.omit({
  access_token: true,
  expires_in: true,
}).strict()

export const ReauthResponseSchema = z.object({
  reauth_token: z.string().min(1),
  expires_in: positiveInt,
}).strict()

export const AdminAccountPageSchema = z.object({
  items: z.array(AdminAccountSchema),
  total: z.number().int().min(0),
  page: positiveInt,
  page_size: positiveInt,
}).strict()

export const AdminAccountMutationResultSchema = z.object({
  admin: AdminAccountSchema,
  temporary_password: z.string().min(12).max(128),
}).strict()

export const SecurityAuditItemSchema = z.object({
  // Legacy Renshe compatibility rows deliberately use negative IDs.
  id: z.number().int(),
  action: z.string().min(1),
  result: z.enum(['succeeded', 'failed']),
  reason_code: z.string().nullable(),
  actor_admin_id: positiveInt.nullable(),
  target_admin_id: positiveInt.nullable(),
  username: z.string().nullable(),
  request_id: z.string().nullable(),
  source_ip: z.string().nullable(),
  user_agent: z.string().nullable(),
  summary: z.record(z.string(), z.unknown()).nullable(),
  created_at: dateString,
}).strict()

export const SecurityAuditPageSchema = z.object({
  items: z.array(SecurityAuditItemSchema),
  total: z.number().int().min(0),
  page: positiveInt,
  page_size: positiveInt,
}).strict()

export const SystemUpdateVersionSchema = z.object({
  release_tag: z.string().min(1),
  backend_commit: z.string().min(1),
  admin_commit: z.string().min(1),
}).strict()

export const SystemUpdateAssetSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().min(0),
  download_url: z.string().url(),
}).strict()

export const SystemUpdateReleaseSchema = z.object({
  release_tag: z.string().min(1),
  published_at: dateString,
  html_url: z.string().url(),
  notes: z.string(),
  backend_commit: z.string().min(1),
  admin_commit: z.string().min(1),
  assets: z.array(SystemUpdateAssetSchema),
}).strict()

export const SystemUpdateCheckSchema = z.object({
  current: SystemUpdateVersionSchema,
  latest: SystemUpdateReleaseSchema.nullable(),
  update_available: z.boolean(),
  check_status: z.enum(['ok', 'unavailable']),
  checked_at: dateString,
  reason_code: z.string().nullable(),
  manual_upgrade_required: z.boolean(),
  dry_run_command: z.string().min(1),
  upgrade_command: z.string().min(1),
  estimated_downtime_seconds: z.number().int().min(1).max(3600),
}).strict()

export function parseAdminResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('[Admin API validation error]', result.error.format())
    throw new Error(`API response validation failed: ${result.error.message}`)
  }
  return result.data
}
