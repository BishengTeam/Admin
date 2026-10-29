import { expect, test, type Page } from '@playwright/test'

async function fixture(page: Page) {
  const errors: string[] = [], queries: URL[] = [], prechecks: Record<string, unknown>[] = []
  let cancelled = false
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTk5OTl9.'))
  page.on('pageerror', error => errors.push(error.message))
  const batch = { id: 14, name: '测试考试批次', plan_name: '测试考试批次', product_code: 'TEST', certification_code: 'TEST', level: '1', status: 'published', plan_status: 'published', prices: [], registration_types: ['full'], registration_counts: {}, occupied_count: 0, enrolled: 0, capacity: 10 }
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/api/, '')
    if (!['fetch', 'xhr'].includes(req.resourceType())) return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort()
    const reply = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '测试管理员', role: 'super_admin', is_active: true, must_change_password: false,
      locked_until: null, last_login_at: null, created_at: '2026-10-29T00:00:00Z', updated_at: '2026-10-29T00:00:00Z' }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (path.endsWith('/stats')) return reply([])
    if (path === '/admin/cert-products') return reply({ items: [], total: 0, page: 1, page_size: 100 })
    if (path.endsWith('/cancel')) { cancelled = true; return reply({ ...batch, plan_status: 'cancelled' }) }
    if (path.endsWith('/precheck')) {
      prechecks.push(req.postDataJSON())
      return reply({ batch_id: 14, exportable_count: 0, blocked_count: 1, exportable_registration_ids: [], counts_by_type: { full: 0, student: 0, coupon: 0 }, people: [{ registration_id: 10, registration_no: 'TEST-10', name: '测试考生', registration_type: 'full', exportable: false, reason: '当前报名状态不支持导出' }] })
    }
    if (path.endsWith('/batches/14')) return reply(batch)
    if (path.endsWith('/batches')) {
      if (path.includes('sangfor') || path.includes('renshe')) return reply([])
      return reply({ items: [{ ...batch, plan_status: cancelled ? 'cancelled' : 'published' }], total: 1, page: 1, page_size: 20 })
    }
    if (path.endsWith('/projects') || path.endsWith('/programs')) return reply([])
    if (path.endsWith('/refunds')) {
      queries.push(url)
      if (url.searchParams.get('registration_id') === '0') return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 40001, message: '参数校验失败' }) })
    }
    return reply({ items: [], total: 0, page: 1, page_size: 20, status_counts: {} })
  })
  return { errors, queries, prechecks }
}

test('总览四类卡片首次点击进入对应批次页，切换不跳登录、不出现加载失败', async ({ page }) => {
  const state = await fixture(page)
  for (const [vendor, label] of [['h3c', '新华三'], ['nisp', 'NISP'], ['renshe', '人社'], ['sangfor', '深信服']]) {
    await page.goto('/admin/certification/overview')
    await page.locator('.ant-card-hoverable').filter({ hasText: label }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/certification/${vendor}$`))
    await expect(page.getByText('批次管理', { exact: true })).toBeVisible()
    await expect(page.getByText('页面加载失败', { exact: true })).toHaveCount(0)
  }
  expect(state.errors).toEqual([])
})

test('H3C工作台退款筛选不传0人员ID，批次状态中文显示，空退款无孤立0', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/admin/certification/h3c/batches/14')
  await expect(page.getByText('已发布', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: '退款记录', exact: true }).click()
  await expect(page.getByText('没有符合条件的退款记录')).toBeVisible()
  await page.getByRole('tab', { name: /待处理（0）/ }).click()
  await page.locator('.ant-select').filter({ has: page.getByText('退款原因', { exact: true }) }).locator('input').click()
  await page.getByText('审核未通过', { exact: true }).click()
  await expect.poll(() => state.queries.length).toBeGreaterThan(1)
  expect(state.queries.every(url => !url.searchParams.has('registration_id'))).toBe(true)
  await expect(page.getByText('0', { exact: true })).toHaveCount(0)
  await expect(page.getByText('参数校验失败')).toHaveCount(0)
  expect(state.errors).toEqual([])
})

test('未选择审核状态时预检明确传null，关闭报名计入暂不可导出', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/admin/certification/h3c/batches/14')
  await page.getByRole('button', { name: '导出当前筛选结果' }).click()
  await expect(page.getByText('当前筛选结果：可导出 0 人，暂不可导出 1 人')).toBeVisible()
  expect(state.prechecks[0].status).toBeNull()
  await expect(page.getByText('测试考生', { exact: true })).toBeVisible()
  expect(state.errors).toEqual([])
})

test('NISP取消批次后不再提供没有可用操作的更多按钮', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/admin/certification/nisp')
  await page.getByRole('button', { name: /更多/ }).click()
  await page.getByText('取消批次', { exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /确|取消批次/ }).last().click()
  await expect(page.getByText('已取消', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /更多/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '管理报名' })).toBeVisible()
  expect(state.errors).toEqual([])
})
