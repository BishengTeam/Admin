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

  it('keeps all 21 management calls on /admin/quiz without a duplicated /api prefix', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/services/quiz.ts'), 'utf8')
    expect(source).not.toContain('/api/admin/quiz')
    expect(source.match(/\/admin\/quiz/g)).toHaveLength(21)
  })

  it('uses the new question paths and array-shaped multiple answers', async () => {
    const { quizService } = await import('@/services/quiz')
    await quizService.createQuestion({
      category_id: 1,
      question_type: 'multiple_choice',
      question_text: '选择协议',
      options: { A: 'OSPF', B: 'HTTP', C: 'BGP', D: 'FTP' },
      correct_answer: ['A', 'C'],
    })
    expect(http.post).toHaveBeenCalledWith('/admin/quiz/questions', expect.objectContaining({ correct_answer: ['A', 'C'] }), { signal: undefined })
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
      heartbeat_at: null,
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
})
