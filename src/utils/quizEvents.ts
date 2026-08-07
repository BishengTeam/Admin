/** Cross-page invalidation event for completed import jobs. */
export const QUIZ_IMPORT_SUCCEEDED_EVENT = 'admin-quiz-import-succeeded'

export function notifyQuizImportSucceeded(jobId: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUIZ_IMPORT_SUCCEEDED_EVENT, { detail: { jobId } }))
  }
}
