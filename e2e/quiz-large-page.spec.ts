import { test, expect } from '@playwright/test'

test('题目每页2000条使用虚拟表格，翻页保留数量并可切换题库', async ({ page }) => {
  const stamp = '2026-11-04T00:00:00Z'
  const queries: Array<{ library: number; page: number; size: number }> = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1600, height: 1200 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  const library = (id: number) => ({ id, name: `测试题库${id}`, library_code: `QL${id}`, normalized_name: `测试题库${id}`,
    description: null, cover_url: null, details: null, access_mode: 'free', vendor_tag: 'none', price_cents: 0,
    system_kind: 'none', migration_state: 'ready', status: 'draft', v2_enabled: false, sort_order: 0, lock_version: 1,
    published_at: null, suspended_at: null, archived_at: null, deleted_at: null, restore_until: null,
    open_migration_issue_count: 0, module_count: 1, knowledge_point_count: 1, question_count: 2001, created_at: stamp, updated_at: stamp })
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue()
    const reply = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data, message: 'ok' }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '题库管理员', role: 'super_admin', is_active: true,
      must_change_password: false, locked_until: null, last_login_at: null, created_at: stamp, updated_at: stamp }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (path === '/admin/quiz/libraries') return reply([library(1), library(2)])
    const tree = path.match(/^\/admin\/quiz\/libraries\/(\d+)\/content-tree$/)
    if (tree) return reply({ library_id: Number(tree[1]), modules: [] })
    if (path === '/admin/quiz/questions') {
      const current = Number(url.searchParams.get('page') || 1), size = Number(url.searchParams.get('page_size') || 20)
      const id = Number(url.searchParams.get('library_id'))
      queries.push({ library: id, page: current, size })
      const items = Array.from({ length: Math.min(size, 2001 - (current - 1) * size) }, (_, index) => {
        const number = (current - 1) * size + index + 1
        return { id: number, category_id: null, library_id: id, knowledge_point_id: id, question_type: 'judge', status: 'draft',
          question_text: `题库${id}题目${number}`, normalized_question_text: `题库${id}题目${number}`, options: null, correct_answer: 'A', explanation: null,
          image_urls: [], option_image_urls: {}, score: null, tags: [], ever_published: false, published_at: null, disabled_at: null, deleted_at: null, restore_until: null,
          current_revision_id: null, current_revision_no: null, pending_revision_id: number, pending_revision_no: 1, has_pending_revision: true,
          lock_version: 1, created_by: 1, updated_by: 1, created_at: stamp, updated_at: stamp }
      })
      return reply({ items, total: 2001, page: current, page_size: size })
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 40400, message: path }) })
  })
  await page.goto('/admin/quiz/questions?tab=content&library_id=1')
  await expect(page.getByText('题库1题目1', { exact: true })).toBeVisible()
  await page.locator('.ant-pagination-options-size-changer').click()
  await page.getByTitle('2000 条/页', { exact: true }).click()
  await expect.poll(() => queries.at(-1)).toEqual({ library: 1, page: 1, size: 2000 })
  const holder = page.locator('.ant-table-tbody-virtual-holder')
  await expect(holder).toBeVisible()
  expect(await page.locator('.ant-table-row').count()).toBeLessThan(100)
  await page.locator('.ant-table-thead input[type="checkbox"]').click()
  await expect(page.getByText('每批最多处理100道题，已选择前100道；可分批继续处理')).toBeVisible()
  await expect(page.getByRole('button', { name: '批量发布修订 (100)', exact: true })).toBeVisible()
  await expect(async () => {
    await holder.evaluate(element => { element.scrollTop = element.scrollHeight })
    await expect(page.getByText('题库1题目2000', { exact: true })).toBeVisible({ timeout: 500 })
  }).toPass()
  await page.locator('.ant-pagination-next button').click()
  await expect(page.getByText('题库1题目2001', { exact: true })).toBeVisible()
  expect(queries.at(-1)).toEqual({ library: 1, page: 2, size: 2000 })
  await page.getByTitle('测试题库1 (QL1)', { exact: true }).click()
  await page.getByText('测试题库2 (QL2)', { exact: true }).click()
  await expect(page.getByText('题库2题目1', { exact: true })).toBeVisible()
  expect(queries.at(-1)).toEqual({ library: 2, page: 1, size: 2000 })
  await expect(page.getByText('题库1题目2001', { exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})
