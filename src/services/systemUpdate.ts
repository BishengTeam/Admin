import { http } from '@/core/request'
import {
  parseAdminResponse,
  SystemUpdateCheckSchema,
} from '@/core/adminValidation'
import type { SystemUpdateCheck } from '@/types/admin'

export const systemUpdateService = {
  check(signal?: AbortSignal): Promise<SystemUpdateCheck> {
    return http.get('/admin/system/updates/check', { signal })
      .then((value) => parseAdminResponse(SystemUpdateCheckSchema, value))
  },
}
