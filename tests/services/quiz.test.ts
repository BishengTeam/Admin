import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const http = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/core/request', () => ({ http }))

const question = {
  id: 101,
  category_id: 1,
  question_type: 'multiple_choice',
  status: 'draft',
  question_text: '选择协议',
  normalized_question_text: '选择协议',
  options: { A: 'OSPF', B: 'HTTP', C: 'BGP', D: 'FTP' },
  correct_answer: ['A', 'C'],
  explanation: null,
  image_urls: [],
  option_image_urls: {},
  ever_published: false,
  published_at: null,
  disabled_at: null,
  lock_version: 2,
  created_by: 7,
  updated_by: 7,
  created_at: '2026-08-06T00:00:00+08:00',
  updated_at: '2026-08-06T00:00:00+08:00',
}

const category = {
  id: 12,
  name: '网络基础',
  normalized_name: '网络基础',
  parent_id: 3,
  depth: 2,
  description: null,
  status: 'active',
  sort_order: 20,
  ever_had_question: false,
  lock_version: 4,
  created_by: 7,
  updated_by: 7,
  created_at: '2026-08-06T00:00:00+08:00',
  updated_at: '2026-08-08T00:00:00+08:00',
}

describe('quizService frozen admin contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    http.get.mockResolvedValue({ items: [question], total: 1, page: 1, page_size: 20 })
    http.post.mockImplementation((url: string) => url.includes('batch-disable') || url.includes('batch-publish')
      ? { succeeded: true, updated_count: 1, errors: [] }
      : question)
    http.put.mockResolvedValue(question)
    http.delete.mockResolvedValue(null)
  })

  it('keeps all legacy and V2 management calls on /admin/quiz without a duplicated /api prefix', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/services/quiz.ts'), 'utf8')
    expect(source).not.toContain('/api/admin/quiz')
    expect(source.match(/\/admin\/quiz/g)).toHaveLength(59)
    for (const path of [
      '/admin/quiz/course-options',
      '/admin/quiz/categories/${id}/impact',
      '/admin/quiz/imports/${id}/source-url',
      '/admin/quiz/imports/${id}/retry',
      '/admin/quiz/stats/overview',
      '/admin/quiz/stats/questions',
      '/admin/quiz/migration-report',
      '/admin/quiz/libraries/${libraryId}/content-tree',
      '/admin/quiz/questions/${id}/revisions',
      '/admin/quiz/knowledge-points/${id}/undo-delete',
    ]) expect(source).toContain(path)
  })

  it('loads course binding options from the narrow quiz endpoint with a strict response schema', async () => {
    const { quizService } = await import('@/services/quiz')
    const signal = new AbortController().signal
    const options = [{ id: 81, title: '网络工程师课程' }]
    http.get.mockResolvedValueOnce(options)

    await expect(quizService.listCourseOptions('网络', signal)).resolves.toEqual(options)
    expect(http.get).toHaveBeenCalledWith('/admin/quiz/course-options', {
      params: { keyword: '网络', limit: 100 },
      signal,
    })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      http.get.mockResolvedValueOnce([{ ...options[0], is_active: true }])
      await expect(quizService.listCourseOptions()).rejects.toThrow('API response validation failed')
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('keeps V2 lifecycle responses on the strict V2 question schema', async () => {
    const { quizService } = await import('@/services/quiz')
    const v2Question = {
      ...question,
      // Migrated V2 questions retain their legacy category for traceability;
      // library_id + knowledge_point_id remain the active content ownership.
      category_id: 7,
      library_id: 9,
      knowledge_point_id: 12,
      status: 'published',
      deleted_at: null,
      restore_until: null,
      current_revision_id: 501,
      current_revision_no: 1,
      pending_revision_id: null,
      pending_revision_no: null,
      has_pending_revision: false,
    }
    http.post.mockResolvedValue(v2Question)

    await expect(quizService.publishV2Question(101, 2)).resolves.toEqual(v2Question)
    await expect(quizService.disableV2Question(101, 2)).resolves.toEqual(v2Question)
    await expect(quizService.restoreV2Question(101, 2)).resolves.toEqual(v2Question)
  })

  it('loads migration issue details and sends an explicit migration recheck', async () => {
    const { quizService } = await import('@/services/quiz')
    const report = {
      generated_at: '2026-08-14T10:00:00+08:00',
      library_count: 1,
      ready_library_count: 0,
      pending_library_count: 1,
      open_blocking_issue_count: 1,
      mapped_category_count: 2,
      mapped_question_count: 3,
      issues: [{
        id: 91,
        library_id: 9,
        severity: 'blocking',
        status: 'open',
        issue_code: 'question_attached_to_module',
        legacy_object_type: 'question',
        legacy_id: 101,
        original_path: [{ id: 1, name: '网络' }, { id: 2, name: '基础' }],
        resolution: '请人工归类',
        resolved_at: null,
        created_at: '2026-08-13T10:00:00+08:00',
      }],
    }
    const library = {
      id: 9,
      library_code: 'QL00000009',
      name: '网络题库',
      normalized_name: '网络题库',
      description: '旧数据迁移题库',
      cover_url: null,
      details: null,
      access_mode: 'access_mode_pending',
      system_kind: 'none',
      migration_state: 'ready',
      status: 'draft',
      v2_enabled: false,
      sort_order: 0,
      lock_version: 4,
      published_at: null,
      suspended_at: null,
      archived_at: null,
      deleted_at: null,
      restore_until: null,
      open_migration_issue_count: 0,
      module_count: 1,
      knowledge_point_count: 1,
      question_count: 3,
      created_at: '2026-08-13T10:00:00+08:00',
      updated_at: '2026-08-14T10:00:00+08:00',
    }
    http.get.mockResolvedValueOnce(report)
    http.post.mockResolvedValueOnce(library)

    await expect(quizService.getMigrationReport()).resolves.toEqual(report)
    expect(http.get).toHaveBeenCalledWith('/admin/quiz/migration-report', { signal: undefined })
    await expect(quizService.transitionLibrary(9, 'reconcile_migration', 3)).resolves.toEqual(library)
    expect(http.post).toHaveBeenCalledWith('/admin/quiz/libraries/9/lifecycle', { action: 'reconcile_migration', lock_version: 3 }, { signal: undefined })
  })

  it('uses the new question paths and array-shaped multiple answers', async () => {
    const { quizService } = await import('@/services/quiz')
    await quizService.createQuestion({
      category_id: 1,
      question_type: 'multiple_choice',
      question_text: '选择协议',
      options: { A: 'OSPF', B: 'HTTP', C: 'BGP', D: 'FTP' },
      correct_answer: ['A', 'C'],
      image_urls: ['https://example.com/protocol.png'],
    })
    expect(http.post).toHaveBeenCalledWith('/admin/quiz/questions', expect.objectContaining({ correct_answer: ['A', 'C'], image_urls: ['https://example.com/protocol.png'] }), { signal: undefined })
    expect(http.post.mock.calls[0][1]).not.toHaveProperty('category_name')

    await quizService.publishQuestion(101, 2)
    expect(http.post).toHaveBeenCalledWith('/admin/quiz/questions/101/publish', { lock_version: 2 }, { signal: undefined })

    // Partial updates omit question_type; an answer-only edit must still be
    // accepted for an existing multiple-choice question.
    await quizService.updateQuestion(101, { lock_version: 2, correct_answer: ['B', 'D'] })
    expect(http.put).toHaveBeenCalledWith('/admin/quiz/questions/101', { lock_version: 2, correct_answer: ['B', 'D'] }, { signal: undefined })
  })

  it('moves and sorts a category through PUT with the current lock version', async () => {
    const { quizService } = await import('@/services/quiz')
    http.put.mockResolvedValueOnce(category)

    await quizService.updateCategory(12, { parent_id: 3, sort_order: 20, lock_version: 3 })

    expect(http.put).toHaveBeenCalledWith('/admin/quiz/categories/12', {
      parent_id: 3,
      sort_order: 20,
      lock_version: 3,
    }, { signal: undefined })
  })

  it('reads task metrics from health and keeps a 503 ready payload usable', async () => {
    const { quizService } = await import('@/services/quiz')
    const snapshot = {
      source: 'redis',
      heartbeat_at: null,
      signals: {
        ready: true,
        stale: false,
        heartbeat_age_seconds: null,
        total_queue_depth: 0,
        total_failures: 0,
        stuck_processors: [],
        stats_lag_seconds: null,
        stats_lagging: false,
        exam_timeout_queue_depth: 0,
        oss_cleanup_queue_depth: 0,
      },
      processors: {
        'quiz-import': {
          name: 'quiz-import', runs: 1, successes: 1, failures: 0, failure_count: 0,
          retries: 0, retry_count: 0, total_runtime_seconds: 0.1, runtime_seconds: 0.1,
          last_runtime_seconds: 0.1, last_started_at: null, last_finished_at: null,
          last_heartbeat_at: null, last_error: null, last_error_type: null,
          queue_depth: 0, did_work: false,
        },
      },
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ code: 0, data: { status: 'ok', checks: {}, details: { quiz_tasks: snapshot } } }) })
      .mockResolvedValueOnce({ status: 503, ok: false, json: async () => ({ code: 50000, status: 'not_ready', checks: {}, details: { quiz_tasks: snapshot } }) })
    vi.stubGlobal('fetch', fetchMock)
    try {
      const health = await quizService.getTaskProbe('health')
      const ready = await quizService.getTaskProbe('ready')
      expect(health.quiz_tasks.processors['quiz-import'].successes).toBe(1)
      expect(ready.http_status).toBe(503)
      expect(fetchMock).toHaveBeenNthCalledWith(1, '/health', expect.objectContaining({ headers: { Accept: 'application/json' } }))
      expect(fetchMock).toHaveBeenNthCalledWith(2, '/ready', expect.objectContaining({ headers: { Accept: 'application/json' } }))
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('sends lock_version in DELETE body and uses batch-disable', async () => {
    const { quizService } = await import('@/services/quiz')
    await quizService.deleteQuestion(101, 2)
    expect(http.delete).toHaveBeenCalledWith('/admin/quiz/questions/101', { data: { lock_version: 2 }, signal: undefined })

    await quizService.batchDisable({ items: [{ question_id: 101, lock_version: 2 }] })
    expect(http.post).toHaveBeenCalledWith('/admin/quiz/questions/batch-disable', { items: [{ question_id: 101, lock_version: 2 }] }, { signal: undefined })
  })

  it('calls category impact, source/retry and aggregate statistics endpoints including deleted history', async () => {
    const { quizService } = await import('@/services/quiz')
    const impact = {
      category_id: 12, action: 'disable', target_parent_id: null,
      descendant_category_count: 1, draft_question_count: 2,
      published_question_count: 3, disabled_question_count: 0,
      affected_new_pool_question_count: 3, history_snapshot_affected: false,
      can_execute: true, blocking_reasons: [], calculated_at: '2026-08-06T00:00:00+08:00',
    }
    const signed = { url: 'https://oss.example/signed', expires_at: '2026-08-06T00:05:00+08:00' }
    const job = {
      id: 5, admin_id: 7, source_type: 'csv', status: 'failed', source_size_bytes: 10,
      total_rows: 1, validated_rows: 1, created_count: 0, error_count: 1,
      heartbeat_at: null, started_at: null, finished_at: '2026-08-06T00:00:00+08:00',
      retry_count: 1, error_message: 'worker failed', report_available: true,
      lock_version: 2, validation_version: 1, impact_version: null,
      missing_category_count: 0, affected_question_count: 0,
      confirmed_by: null, confirmed_at: null, execution_protected_until: null,
      expires_at: '2026-08-07T00:00:00+08:00', created_at: '2026-08-06T00:00:00+08:00',
      updated_at: '2026-08-06T00:00:00+08:00',
    }
    const overview = {
      calculated_at: '2026-08-06T00:00:00+08:00', aggregated_through: null,
      library_count: 1, draft_library_count: 0, published_library_count: 1,
      suspended_library_count: 0, archived_library_count: 0,
      module_count: 1, active_module_count: 1, disabled_module_count: 0,
      knowledge_point_count: 1, active_knowledge_point_count: 1,
      disabled_knowledge_point_count: 0,
      question_count: 1, draft_question_count: 1, published_question_count: 0,
      disabled_question_count: 0, practice_session_count: 0, practice_first_attempts: 0,
      practice_first_correct: 0, practice_first_accuracy: 0, completed_exam_count: 0,
      timed_out_exam_count: 0, exam_answers: 0, exam_correct: 0, exam_accuracy: 0,
    }
    const statsItem = {
      question_id: 101, question_text: '选择协议', library_id: 11, library_name: '网络工程师题库',
      module_id: 21, module_name: '网络基础', knowledge_point_id: 31, knowledge_point_name: 'HTTP 协议',
      question_type: 'multiple_choice', status: 'deleted', practice_first_attempts: 0,
      practice_first_correct: 0, practice_first_accuracy: 0, exam_answers: 0,
      exam_correct: 0, exam_accuracy: 0, aggregated_through: null,
    }
    http.get
      .mockResolvedValueOnce(impact)
      .mockResolvedValueOnce(signed)
      .mockResolvedValueOnce(overview)
      .mockResolvedValueOnce({ items: [statsItem], total: 1, page: 1, page_size: 20 })
    http.post
      .mockResolvedValueOnce(job)

    await expect(quizService.previewCategoryImpact(12, { action: 'disable' })).resolves.toEqual(impact)
    expect(http.get).toHaveBeenNthCalledWith(1, '/admin/quiz/categories/12/impact', { params: { action: 'disable' }, signal: undefined })
    await expect(quizService.getImportSourceUrl(5)).resolves.toEqual(signed)
    expect(http.get).toHaveBeenNthCalledWith(2, '/admin/quiz/imports/5/source-url', { signal: undefined })
    await expect(quizService.getStatsOverview()).resolves.toEqual(overview)
    expect(http.get).toHaveBeenNthCalledWith(3, '/admin/quiz/stats/overview', { signal: undefined })
    await expect(quizService.listQuestionStats({ library_id: 11, module_id: 21, knowledge_point_id: 31, status: 'deleted', page: 1, page_size: 20 })).resolves.toEqual({ items: [statsItem], total: 1, page: 1, page_size: 20 })
    expect(http.get).toHaveBeenNthCalledWith(4, '/admin/quiz/stats/questions', { params: { library_id: 11, module_id: 21, knowledge_point_id: 31, status: 'deleted', page: 1, page_size: 20 }, signal: undefined })
    await expect(quizService.retryImport(5)).resolves.toEqual(job)
    expect(http.post).toHaveBeenNthCalledWith(1, '/admin/quiz/imports/5/retry', undefined, { signal: undefined })
  })

  it('rejects batches larger than the server limit of 100 before making a request', async () => {
    const { quizService } = await import('@/services/quiz')
    const items = Array.from({ length: 101 }, (_, index) => ({ question_id: index + 1, lock_version: 1 }))
    await expect(quizService.batchPublish({ items })).rejects.toThrow('请求模型校验失败')
    expect(http.post).not.toHaveBeenCalled()
  })

  it('uses fixed multipart field names for CSV imports', async () => {
    const { quizService } = await import('@/services/quiz')
    const file = new File(['category_path,question_type,question_text,options,correct_answer,explanation\n'], 'questions.csv', { type: 'text/csv' })
    http.post.mockResolvedValueOnce({
      id: 5,
      admin_id: 7,
      source_type: 'csv',
      status: 'queued',
      source_size_bytes: file.size,
      total_rows: 0,
      validated_rows: 0,
      created_count: 0,
      error_count: 0,
      heartbeat_at: null,
      started_at: null,
      finished_at: null,
      retry_count: 0,
      error_message: null,
      report_available: false,
      lock_version: 1,
      validation_version: 0,
      impact_version: null,
      missing_category_count: 0,
      affected_question_count: 0,
      confirmed_by: null,
      confirmed_at: null,
      execution_protected_until: null,
      expires_at: '2026-08-07T00:00:00+08:00',
      created_at: '2026-08-06T00:00:00+08:00',
      updated_at: '2026-08-06T00:00:00+08:00',
    })
    await quizService.importCsv(file, { filename: file.name, size_bytes: file.size })
    const body = http.post.mock.calls[0][1] as FormData
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('file')).toBe(file)
    expect(body.get('filename')).toBe('questions.csv')
    expect(body.get('size_bytes')).toBe(String(file.size))
  })

  it('uses paged errors and optimistic category confirmation endpoints', async () => {
    const { quizService } = await import('@/services/quiz')
    const impactVersion = 'a'.repeat(64)
    const errorPage = {
      items: [{ row: 2, question_index: 1, field: 'category_path', error_code: 'missing_category', message: '分类不存在' }],
      total: 1,
      page: 1,
      page_size: 50 as const,
      available_fields: ['category_path'],
      validation_version: 1,
    }
    const impact = {
      job_id: 5,
      status: 'awaiting_category_confirmation',
      tree: [{
        name: '新分类', path: ['新分类'], depth: 1, status: 'will_create', category_id: null,
        direct_question_count: 1, subtree_question_count: 1, blocking_reasons: [], children: [],
      }],
      new_category_count: 1,
      reused_category_count: 0,
      affected_question_count: 1,
      blocking_reasons: [],
      lock_version: 2,
      impact_version: impactVersion,
      calculated_at: '2026-08-13T00:00:00+08:00',
    }
    const queued = {
      id: 5, admin_id: 7, source_type: 'json', status: 'queued', source_size_bytes: 10,
      total_rows: 1, validated_rows: 1, created_count: 0, error_count: 0,
      heartbeat_at: null, started_at: null, finished_at: null, retry_count: 0,
      error_message: null, report_available: false, lock_version: 3, validation_version: 1,
      impact_version: impactVersion, missing_category_count: 1, affected_question_count: 1,
      confirmed_by: 7, confirmed_at: '2026-08-13T00:01:00+08:00',
      execution_protected_until: '2026-08-13T00:31:00+08:00',
      expires_at: '2026-08-20T00:00:00+08:00', created_at: '2026-08-13T00:00:00+08:00',
      updated_at: '2026-08-13T00:01:00+08:00',
    }
    const cancelled = { ...queued, status: 'cancelled', confirmed_by: null, confirmed_at: null, execution_protected_until: null }
    http.get.mockResolvedValueOnce(errorPage).mockResolvedValueOnce(impact)
    http.post.mockResolvedValueOnce(queued).mockResolvedValueOnce(cancelled)

    await expect(quizService.listImportErrors(5, { field: 'category_path', page: 1 })).resolves.toEqual(errorPage)
    expect(http.get).toHaveBeenNthCalledWith(1, '/admin/quiz/imports/5/errors', { params: { field: 'category_path', page: 1 }, signal: undefined })
    await expect(quizService.getImportCategoryImpact(5)).resolves.toEqual(impact)
    expect(http.get).toHaveBeenNthCalledWith(2, '/admin/quiz/imports/5/category-impact', { signal: undefined })
    await expect(quizService.confirmImportCategories(5, { lock_version: 2, impact_version: impactVersion })).resolves.toEqual(queued)
    expect(http.post).toHaveBeenNthCalledWith(1, '/admin/quiz/imports/5/confirm-categories', { lock_version: 2, impact_version: impactVersion }, { signal: undefined })
    await expect(quizService.cancelImport(5, { lock_version: 2 })).resolves.toEqual(cancelled)
    expect(http.post).toHaveBeenNthCalledWith(2, '/admin/quiz/imports/5/cancel', { lock_version: 2 }, { signal: undefined })
  })
})
