import { expect, test, type Page, type Route } from '@playwright/test'

const TOKEN = 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'
const now = '2026-08-12T15:00:00+08:00'
const future = '2099-08-19T15:00:00+08:00'

const category = {
  id: 1,
  name: '网络基础',
  normalized_name: '网络基础',
  parent_id: null,
  depth: 1,
  description: null,
  status: 'active',
  sort_order: 0,
  ever_had_question: true,
  lock_version: 1,
  created_by: 1,
  updated_by: 1,
  created_at: now,
  updated_at: now,
}

const question = {
  id: 101,
  category_id: 1,
  question_type: 'single_choice',
  status: 'draft',
  question_text: 'HTTP 默认使用哪个端口？',
  normalized_question_text: 'HTTP 默认使用哪个端口？',
  options: { A: '80', B: '443', C: '22' },
  correct_answer: 'A',
  explanation: 'HTTP 默认端口是 80。',
  ever_published: false,
  published_at: null,
  disabled_at: null,
  lock_version: 1,
  created_by: 1,
  updated_by: 1,
  created_at: now,
  updated_at: now,
}

const failedImport = {
  id: 51,
  admin_id: 1,
  source_type: 'csv',
  status: 'failed',
  source_size_bytes: 1024,
  total_rows: 2,
  validated_rows: 0,
  created_count: 0,
  error_count: 1,
  heartbeat_at: now,
  started_at: now,
  finished_at: now,
  retry_count: 1,
  error_message: '后台处理失败',
  report_available: true,
  lock_version: 2,
  validation_version: 1,
  impact_version: null,
  missing_category_count: 0,
  affected_question_count: 0,
  confirmed_by: null,
  confirmed_at: null,
  execution_protected_until: null,
  expires_at: future,
  created_at: now,
  updated_at: now,
}

const awaitingImport = {
  ...failedImport,
  id: 53,
  source_type: 'json',
  status: 'awaiting_category_confirmation',
  total_rows: 2,
  validated_rows: 2,
  error_count: 0,
  error_message: null,
  report_available: false,
  missing_category_count: 2,
  affected_question_count: 2,
  impact_version: 'a'.repeat(64),
}

function envelope(data: object | object[] | null) {
  return { code: 0, message: 'ok', data }
}

async function json(route: Route, data: object | object[] | null) {
  // 页面路由和 API 路由同名（例如 /admin/quiz/categories）。
  // Playwright 的 glob 会同时命中 document 导航，必须先放行页面 HTML，
  // 只对随后发出的 XHR/fetch 请求返回契约数据。
  if (route.request().isNavigationRequest()) {
    await route.continue()
    return
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(data)) })
}

async function authenticate(page: Page, permissions = ['quiz:list', 'quiz:write', 'quiz:import']) {
  await page.addInitScript((token) => localStorage.setItem('admin_token', token), TOKEN)
  await page.route('**/admin/auth/me', (route) => json(route, {
    admin: { id: 1, username: 'quiz-admin', role: 'admin' },
    permissions,
  }))
}

async function mockCategories(page: Page) {
  await page.route('**/admin/quiz/categories', (route) => json(route, [category]))
}

test.describe('题库五页面新版契约冒烟', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page)
  })

  test('缺少页面权限时统一显示 403 且不调用业务接口', async ({ page }) => {
    await page.unroute('**/admin/auth/me')
    await authenticate(page, [])
    let businessCalled = false
    await page.route('**/admin/quiz/categories', async (route) => {
      if (route.request().isNavigationRequest()) await route.continue()
      else {
        businessCalled = true
        await json(route, [])
      }
    })

    await page.goto('/admin/quiz/categories')
    await expect(page.getByText('无权访问')).toBeVisible()
    expect(businessCalled).toBe(false)
  })

  test('旧分类路由重定向到统一页面且左树保留完整管理能力', async ({ page }) => {
    await mockCategories(page)
    await page.route('**/admin/quiz/questions?*', (route) => json(route, { items: [question], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/categories/1/impact?*', (route) => json(route, {
      category_id: 1,
      action: 'disable',
      target_parent_id: null,
      descendant_category_count: 2,
      draft_question_count: 3,
      published_question_count: 4,
      disabled_question_count: 1,
      affected_new_pool_question_count: 4,
      history_snapshot_affected: false,
      can_execute: true,
      blocking_reasons: [],
      calculated_at: now,
    }))

    await page.goto('/admin/quiz/categories')
    await expect(page).toHaveURL(/\/admin\/quiz\/questions$/)
    await expect(page.getByText('题库管理', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('tree').getByText('网络基础', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '为网络基础添加子分类' })).toBeVisible()
    await expect(page.getByRole('button', { name: '编辑分类网络基础' })).toBeVisible()
    await page.getByRole('button', { name: '停用分类网络基础' }).click()
    await expect(page.getByText('新题池影响')).toBeVisible()
    await expect(page.getByText('4 题')).toBeVisible()
    await expect(page.getByText('历史快照')).toBeVisible()
    await expect(page.getByText('不受影响')).toBeVisible()
  })

  test('题目页只批量处理当前页最多 100 个明确勾选项并二次确认', async ({ page }) => {
    await mockCategories(page)
    await page.route('**/admin/quiz/questions?*', (route) => json(route, { items: [question], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/questions/batch-publish', async (route) => {
      const body = route.request().postDataJSON() as { items: Array<{ question_id: number; lock_version: number }> }
      expect(body).toEqual({ items: [{ question_id: 101, lock_version: 1 }] })
      await json(route, { succeeded: true, updated_count: 1, errors: [] })
    })

    await page.goto('/admin/quiz/questions')
    await expect(page.getByText('HTTP 默认使用哪个端口？')).toBeVisible()
    await page.getByRole('checkbox').nth(1).check()
    await page.getByRole('button', { name: '批量发布 (1)' }).click()
    await expect(page.getByText('服务端将整批重新校验，任一题失败时整批不变。')).toBeVisible()
    await page.getByRole('button', { name: '确认发布' }).click()
    await expect(page.getByText('删除选中草稿？')).toHaveCount(0)
  })

  test('选择分类时按所选分类及后代筛选并把状态写入 URL', async ({ page }) => {
    await mockCategories(page)
    let query = new URLSearchParams()
    await page.route('**/admin/quiz/questions?*', (route) => {
      query = new URL(route.request().url()).searchParams
      return json(route, { items: [question], total: 1, page: 1, page_size: 20 })
    })

    await page.goto('/admin/quiz/questions')
    await page.getByRole('tree').getByText('网络基础', { exact: true }).click()
    await expect.poll(() => query.get('category_id')).toBe('1')
    expect(query.get('include_descendants')).toBe('true')
    const statusFilter = page.getByRole('combobox', { name: '题目状态' })
    await statusFilter.press('ArrowDown')
    await statusFilter.press('Enter')
    await expect(page).toHaveURL(/status=draft/)
  })

  test('批量操作原子失败展示逐题错误且保留服务端列表状态', async ({ page }) => {
    await mockCategories(page)
    await page.route('**/admin/quiz/questions?*', (route) => json(route, { items: [question], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/questions/batch-publish', (route) => json(route, {
      succeeded: false,
      updated_count: 0,
      errors: [{ question_id: 101, code: 40200, field: 'explanation', message: '发布校验失败' }],
    }))

    await page.goto('/admin/quiz/questions')
    await page.getByRole('checkbox').nth(1).check()
    await page.getByRole('button', { name: '批量发布 (1)' }).click()
    await page.getByRole('button', { name: '确认发布' }).click()
    await expect(page.getByRole('dialog', { name: '批量操作未完成（整批未提交）' })).toBeVisible()
    await expect(page.getByText(/题目 #101：explanation：发布校验失败/)).toBeVisible()
    await expect(page.getByText('草稿', { exact: true })).toBeVisible()
  })

  test('批量操作遇到 409 时刷新版本且不静默重试', async ({ page }) => {
    await mockCategories(page)
    let listCalls = 0
    let publishCalls = 0
    await page.route('**/admin/quiz/questions?*', (route) => {
      listCalls += 1
      return json(route, {
        items: [{ ...question, lock_version: listCalls > 1 ? 2 : 1 }],
        total: 1,
        page: 1,
        page_size: 20,
      })
    })
    await page.route('**/admin/quiz/questions/batch-publish', async (route) => {
      publishCalls += 1
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40201, message: '版本冲突', data: null }),
      })
    })

    await page.goto('/admin/quiz/questions')
    await page.getByRole('checkbox').nth(1).check()
    await page.getByRole('button', { name: '批量发布 (1)' }).click()
    await page.getByRole('button', { name: '确认发布' }).click()
    await expect.poll(() => listCalls).toBeGreaterThan(1)
    expect(publishCalls).toBe(1)
    await expect(page.getByRole('cell', { name: '2', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '批量发布 (1)' })).toHaveCount(0)
  })

  test('429 限流响应不会重复提交写操作', async ({ page }) => {
    await mockCategories(page)
    let publishCalls = 0
    await page.route('**/admin/quiz/questions?*', (route) => json(route, { items: [question], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/questions/batch-publish', async (route) => {
      publishCalls += 1
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40202, message: '操作过于频繁', data: null }),
      })
    })

    await page.goto('/admin/quiz/questions')
    await page.getByRole('checkbox').nth(1).check()
    await page.getByRole('button', { name: '批量发布 (1)' }).click()
    await page.getByRole('button', { name: '确认发布' }).click()
    await expect.poll(() => publishCalls).toBe(1)
    await expect(page.getByText('操作过于频繁')).toBeVisible()
    expect(publishCalls).toBe(1)
  })

  test('导入页在当前页面展示脱敏错误表并保留下载 JSON 和 failed 重试', async ({ page }) => {
    await page.route('**/admin/quiz/imports?*', (route) => json(route, { items: [failedImport], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/imports/51/errors?*', (route) => json(route, {
      items: [{ row: 2, question_index: 1, field: 'question_text', error_code: 'duplicate', message: '同一分类题干重复' }],
      total: 1,
      page: 1,
      page_size: 50,
      available_fields: ['question_text'],
      validation_version: 1,
    }))
    await page.route('**/admin/quiz/imports/51/retry', (route) => json(route, {
      ...failedImport,
      status: 'queued',
      retry_count: 2,
      finished_at: null,
      updated_at: '2026-08-12T15:01:00+08:00',
    }))

    await page.goto('/admin/quiz/imports')
    await expect(page.getByRole('link', { name: '下载 v1 模板' })).toHaveAttribute('href', '/templates/quiz-import-v1.csv')
    await expect(page.getByRole('button', { name: '源文件' })).toBeVisible()
    await page.getByRole('button', { name: '错误明细' }).click()
    await expect(page.getByText('错误详情已永久脱敏')).toBeVisible()
    await expect(page.getByRole('cell', { name: '第 2 行' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'question_text' })).toBeVisible()
    await expect(page.getByText('同一分类题干重复')).toBeVisible()
    await expect(page.getByRole('button', { name: '下载 JSON' })).toBeVisible()
    await page
      .getByRole('dialog', { name: '导入错误明细 #51' })
      .getByRole('button', { name: '关闭' })
      .click()
    await page.getByRole('button', { name: '重试' }).click()
    await page.getByRole('dialog', { name: '重试导入任务 #51？' }).getByRole('button', { name: /确\s*定/ }).click()
    await expect(page.getByText('排队中')).toBeVisible()
  })

  test('等待分类确认展示影响树并携带双版本原子确认', async ({ page }) => {
    let confirmBody: object | null = null
    await page.route('**/admin/quiz/imports?*', (route) => json(route, { items: [awaitingImport], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/imports/53', (route) => json(route, awaitingImport))
    await page.route('**/admin/quiz/imports/53/category-impact', (route) => json(route, {
      job_id: 53,
      status: 'awaiting_category_confirmation',
      tree: [{
        name: '网络工程', path: ['网络工程'], depth: 1, status: 'will_create', category_id: null,
        direct_question_count: 0, subtree_question_count: 2, blocking_reasons: [],
        children: [{
          name: '路由协议', path: ['网络工程', '路由协议'], depth: 2, status: 'will_create', category_id: null,
          direct_question_count: 2, subtree_question_count: 2, blocking_reasons: [], children: [],
        }],
      }],
      new_category_count: 2,
      reused_category_count: 0,
      affected_question_count: 2,
      blocking_reasons: [],
      lock_version: 2,
      impact_version: 'a'.repeat(64),
      calculated_at: now,
    }))
    await page.route('**/admin/quiz/imports/53/confirm-categories', async (route) => {
      confirmBody = route.request().postDataJSON()
      await json(route, { ...awaitingImport, status: 'queued', lock_version: 3, confirmed_by: 1, confirmed_at: now, execution_protected_until: future })
    })

    await page.goto('/admin/quiz/imports')
    await page.getByRole('button', { name: '分类影响' }).click()
    await expect(page.getByText('网络工程', { exact: true })).toBeVisible()
    await expect(page.getByText('路由协议', { exact: true })).toBeVisible()
    await expect(page.getByText('将新建', { exact: true })).toHaveCount(2)
    await page.getByRole('button', { name: '确认创建并导入' }).click()
    await page.getByRole('dialog', { name: /确认创建 2 个分类并导入 2 道题/ }).getByRole('button', { name: '确认创建并导入' }).click()
    await expect.poll(() => confirmBody).toEqual({ lock_version: 2, impact_version: 'a'.repeat(64) })
    await expect(page.getByText('排队中')).toBeVisible()
  })

  test('每次下载都重新申请短签，源文件过期后不显示入口', async ({ page }) => {
    let signedCalls = 0
    await page.route('**/admin/quiz/imports?*', (route) => json(route, {
      items: [failedImport, { ...failedImport, id: 52, expires_at: '2020-01-01T00:00:00+08:00' }],
      total: 2,
      page: 1,
      page_size: 20,
    }))
    await page.route('**/admin/quiz/imports/51/source-url', (route) => {
      signedCalls += 1
      return json(route, { url: `https://oss.example/source-${signedCalls}`, expires_at: future })
    })
    await page.route('https://oss.example/source-*', (route) => route.fulfill({
      status: 200,
      contentType: 'text/csv',
      headers: {
        'Content-Disposition': 'attachment; filename="quiz-import-51.csv"',
      },
      body: 'category_path,question_type,question_text,options,correct_answer,explanation\n',
    }))

    await page.goto('/admin/quiz/imports')
    const sourceButton = page.getByRole('button', { name: '源文件' })
    await expect(sourceButton).toHaveCount(1)
    const [firstDownload] = await Promise.all([
      page.waitForEvent('download'),
      sourceButton.click(),
    ])
    expect(firstDownload.suggestedFilename()).toBe('quiz-import-51.csv')
    await expect.poll(() => signedCalls).toBe(1)
    const [secondDownload] = await Promise.all([
      page.waitForEvent('download'),
      sourceButton.click(),
    ])
    expect(secondDownload.suggestedFilename()).toBe('quiz-import-51.csv')
    await expect.poll(() => signedCalls).toBe(2)
    await expect(page).toHaveURL(/\/admin\/quiz\/imports$/)
  })

  test('聚合统计页展示总览、水位、分页明细和一分钟延迟边界', async ({ page }) => {
    await mockCategories(page)
    await page.route('**/admin/quiz/stats/overview', (route) => json(route, {
      calculated_at: now,
      aggregated_through: now,
      category_count: 1,
      active_category_count: 1,
      disabled_category_count: 0,
      question_count: 1,
      draft_question_count: 1,
      published_question_count: 0,
      disabled_question_count: 0,
      practice_session_count: 8,
      practice_first_attempts: 20,
      practice_first_correct: 15,
      practice_first_accuracy: 75,
      completed_exam_count: 3,
      timed_out_exam_count: 1,
      exam_answers: 30,
      exam_correct: 24,
      exam_accuracy: 80,
    }))
    await page.route('**/admin/quiz/stats/questions?*', (route) => json(route, {
      items: [{
        question_id: 101,
        question_text: question.question_text,
        category_id: 1,
        category_name: category.name,
        question_type: 'single_choice',
        status: 'draft',
        practice_first_attempts: 20,
        practice_first_correct: 15,
        practice_first_accuracy: 75,
        exam_answers: 30,
        exam_correct: 24,
        exam_accuracy: 80,
        aggregated_through: now,
      }],
      total: 1,
      page: 1,
      page_size: 20,
    }))

    await page.goto('/admin/quiz/stats')
    await expect(page.getByText('管理端统计最多延迟 1 分钟，不提供用户下钻或导出。')).toBeVisible()
    await expect(page.getByText('练习首答正确率')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '考试正确率' })).toBeVisible()
    await expect(page.getByText(question.question_text)).toBeVisible()
  })

  test('审计页提供请求 ID 和起止时间筛选且保持只读', async ({ page }) => {
    let auditedRequestId: string | null = null
    await page.route('**/admin/quiz/audit-logs?*', async (route) => {
      auditedRequestId = new URL(route.request().url()).searchParams.get('request_id')
      await json(route, {
        items: [{
          id: 91,
          actor_type: 'admin',
          admin_id: 1,
          permission: 'quiz:write',
          request_id: 'req-quiz-001',
          ip_address: '127.0.0.1',
          action: 'question.publish',
          object_type: 'question',
          object_id: 101,
          result: 'succeeded',
          changed_fields: { status: { before: 'draft', after: 'published' } },
          target_ids: [101],
          error_summary: null,
          created_at: now,
        }],
        total: 1,
        page: 1,
        page_size: 20,
      })
    })

    await page.goto('/admin/quiz/audit-logs')
    await expect(page.getByText('question.publish')).toBeVisible()
    await page.getByPlaceholder('请求 ID').fill('req-quiz-001')
    await page.getByRole('button', { name: '刷新' }).click()
    await expect.poll(() => auditedRequestId).toBe('req-quiz-001')
    await expect(page.getByRole('button', { name: /删除|编辑|导出/ })).toHaveCount(0)
  })
})
