import { test, expect } from '@playwright/test'

test('同一题库内检查、整理和分阶段发布，失败结果与重试准确展示', async ({ page }) => {
  const stamp = '2026-11-05T00:00:00Z'
  const errors: string[] = []
  const requests: Record<string, unknown>[] = []
  let resumed = false
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  const library = { id: 1, name: '网络工程师题库', library_code: 'QL1', normalized_name: '网络工程师题库', description: null,
    cover_url: null, details: null, access_mode: 'activation_code', vendor_tag: 'h3c', price_cents: 0, system_kind: 'none',
    migration_state: 'ready', status: 'draft', v2_enabled: false, sort_order: 0, lock_version: 1, published_at: null,
    suspended_at: null, archived_at: null, deleted_at: null, restore_until: null, open_migration_issue_count: 0,
    module_count: 1, knowledge_point_count: 1, question_count: 1, created_at: stamp, updated_at: stamp }
  const point = { id: 2, library_id: 1, module_id: 3, name: '综合练习', normalized_name: '综合练习', description: null,
    status: 'active', system_kind: 'none', is_import_default: true, sort_order: 0, lock_version: 1, question_count: 1,
    disabled_at: null, deleted_at: null, restore_until: null, created_at: stamp, updated_at: stamp }
  const question = { id: 4, category_id: null, library_id: 1, knowledge_point_id: 2, question_type: 'judge', status: 'draft',
    import_default_ownership: true, question_text: 'TCP面向连接。', normalized_question_text: 'TCP面向连接。', options: null,
    correct_answer: 'A', explanation: null, image_urls: [], option_image_urls: {}, score: null, tags: [], ever_published: false,
    published_at: null, disabled_at: null, deleted_at: null, restore_until: null, current_revision_id: null, current_revision_no: null,
    pending_revision_id: 5, pending_revision_no: 1, has_pending_revision: true, lock_version: 1, created_by: 1, updated_by: 1, created_at: stamp, updated_at: stamp }
  const operation = (status: string, entry = false) => ({ id: 8, library_id: 1, status, progress: { questions: 1, library: true, entry, library_version: 2, phase: entry ? 'completed' : 'library' }, error_message: status === 'failed' ? '入口未开启：请处理课程绑定' : null, created_at: stamp, updated_at: stamp })
  await page.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    if (!['xhr', 'fetch'].includes(request.resourceType())) return route.continue()
    const reply = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '题库管理员', role: 'super_admin', is_active: true, must_change_password: false, locked_until: null, last_login_at: null, created_at: stamp, updated_at: stamp }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (path === '/admin/quiz/libraries') return reply([library])
    if (path.endsWith('/content-tree')) return reply({ library_id: 1, modules: [{ ...point, id: 3, name: '基础题目', normalized_name: '基础题目', module_id: undefined, knowledge_points: [point] }] })
    if (path === '/admin/quiz/questions') return reply({ items: [question], total: 1, page: 1, page_size: 20 })
    if (path === '/admin/quiz/imports') return reply({ items: [], total: 0, page: 1, page_size: 20 })
    if (path.endsWith('/publication-preflight')) return reply({ library_id: 1, lock_version: 1, status: 'draft', access_mode: 'activation_code', entry_open: false,
      counts: { published: 0, draft: 1, abnormal: 0, default_ownership: 1, unavailable_ownership: 0, system_ownership: 0 }, blockers: ['没有有效的已发布题目'], repairable: [], warnings: ['默认归属可以发布及练习'], waiting_import_count: 0,
      candidates: [{ question_id: 4, revision_id: 5, lock_version: 1 }], question_previews: { '4': 'TCP面向连接。' }, preflight_version: 'a'.repeat(64) })
    if (path.endsWith('/publication-operations')) {
      if (request.method() === 'GET') return reply([])
      requests.push(request.postDataJSON())
      return reply(operation('queued'))
    }
    if (path.endsWith('/resume')) { resumed = true; return reply(operation('queued')) }
    if (path === '/admin/quiz/publication-operations/8') return reply(operation(resumed ? 'succeeded' : 'failed', resumed))
    return route.fulfill({ status: 404, body: path })
  })
  await page.goto('/admin/quiz/questions?tab=content&library_id=1')
  await expect(page.getByText('TCP面向连接。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '上传题库', exact: true }).click()
  await expect(page.getByRole('combobox', { name: '导入目标题库' })).toBeDisabled()
  await expect(page.getByText('提交导入任务')).toBeVisible()
  await page.getByRole('tab', { name: '题目', exact: true }).click()
  await page.getByRole('button', { name: '检查并发布', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('TCP面向连接。', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: '确认执行' })).toBeDisabled()
  await dialog.locator('.ant-table-tbody input[type=checkbox]').check()
  await dialog.getByRole('checkbox', { name: '发布题库', exact: true }).check()
  await dialog.getByRole('checkbox', { name: /同时开放小程序入口/ }).check()
  await dialog.getByRole('button', { name: '确认执行' }).click()
  await expect(dialog.getByText('部分阶段未完成', { exact: false })).toBeVisible()
  expect(requests[0]).toMatchObject({ items: [{ question_id: 4, revision_id: 5, lock_version: 1 }], publish_library: true, open_entry: true })
  await expect(dialog.getByText('题库发布：已完成')).toBeVisible()
  await page.screenshot({ path: '.temp/quiz-publication-review.png', fullPage: true })
  await dialog.getByRole('button', { name: '重新检查并继续' }).click()
  await dialog.getByRole('button', { name: '确认继续未完成阶段' }).click()
  await expect(dialog.getByText(/已完成全部选定操作/)).toBeVisible()
  expect(errors).toEqual([])
})
