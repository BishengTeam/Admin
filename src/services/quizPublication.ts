import { z } from 'zod'
import { http } from '@/core/request'
import { validateOrThrow } from '@/core/validation'

const target = z.object({ question_id: z.number().int().positive(), revision_id: z.number().int().positive(), lock_version: z.number().int().positive() }).strict()
const preflight = z.object({
  library_id: z.number(), lock_version: z.number(), status: z.string(), access_mode: z.string(), entry_open: z.boolean(),
  counts: z.object({ published: z.number(), draft: z.number(), abnormal: z.number(), default_ownership: z.number(), unavailable_ownership: z.number(), system_ownership: z.number() }).strict(),
  blockers: z.array(z.string()), repairable: z.array(z.string()), warnings: z.array(z.string()), waiting_import_count: z.number(),
  question_previews: z.record(z.string(), z.string()).optional(),
  candidates: z.array(target), preflight_version: z.string(),
}).strict()
const operation = z.object({
  id: z.number(), library_id: z.number(), status: z.enum(['queued', 'succeeded', 'failed']),
  progress: z.object({ questions: z.number(), library: z.boolean(), entry: z.boolean(), library_version: z.number(), phase: z.string() }).strict(),
  error_message: z.string().nullable(), created_at: z.string(), updated_at: z.string(),
}).strict()
export type PublicationPreflight = z.infer<typeof preflight>
export type PublicationOperation = z.infer<typeof operation>
export const quizPublication = {
  async check(libraryId: number, signal?: AbortSignal) { return validateOrThrow(preflight, await http.get(`/admin/quiz/libraries/${libraryId}/publication-preflight`, { signal })) },
  async start(libraryId: number, data: { request_key: string; preflight_version: string; lock_version: number; items: z.infer<typeof target>[]; publish_library: boolean; open_entry: boolean }) {
    return validateOrThrow(operation, await http.post(`/admin/quiz/libraries/${libraryId}/publication-operations`, data))
  },
  async list(libraryId: number, signal?: AbortSignal) { return validateOrThrow(z.array(operation), await http.get(`/admin/quiz/libraries/${libraryId}/publication-operations`, { signal })) },
  async get(id: number, signal?: AbortSignal) { return validateOrThrow(operation, await http.get(`/admin/quiz/publication-operations/${id}`, { signal })) },
  async resume(id: number, preflightVersion: string) { return validateOrThrow(operation, await http.post(`/admin/quiz/publication-operations/${id}/resume`, { preflight_version: preflightVersion })) },
  async move(libraryId: number, pointId: number, items: { question_id: number; lock_version: number }[]) {
    return validateOrThrow(z.object({ updated_count: z.number() }).strict(), await http.post('/admin/quiz/ownership-moves', { library_id: libraryId, knowledge_point_id: pointId, items }))
  },
}
