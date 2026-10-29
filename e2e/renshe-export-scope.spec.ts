import { expect, test, type Page } from '@playwright/test'

async function prepare(page: Page, failCollectionOnce = false) {
  const collections: URL[] = [], exports: Record<string, unknown>[] = [], refundQueries: URL[] = [], errors: string[] = []
  const batches = [
    { id: 12, name: '信息安全管理员测试批次', product_type: 'RS-ZY', status: 'published', price_cents: 10000, capacity: 20, enrolled: 3, apply_start: null, apply_end: null, exam_date: null },
    { id: 35, name: '网络管理员测试批次', product_type: 'RS-OTHER', status: 'cancelled', price_cents: 10000, capacity: 10, enrolled: 0 },
  ]
  const row = (id: number) => ({ id, plan_id: 12, user_id: id, candidate_name: `测试考生${id}`, status: 'pending_external_review',
    current_version_id: id, current_version_exported: false, submitted_at: null,
    payment_summary: { order_id: id, payment_channel: 'bank_transfer', order_status: 'paid', offline_status: 'confirmed', review_payment_allowed: true, review_block_reason: null } })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/api/, '')
    if (!['fetch', 'xhr'].includes(req.resourceType())) return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort()
    const reply = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '测试管理员', role: 'super_admin', is_active: true,
      must_change_password: false, locked_until: null, last_login_at: null, created_at: '2026-10-30T00:00:00Z', updated_at: '2026-10-30T00:00:00Z' }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (path === '/admin/cert-products/renshe/batches') return reply(batches)
    if (path === '/admin/cert-products/renshe/applications') {
      const collect = url.searchParams.get('page_size') === '100'
      if (collect) {
        collections.push(url)
        if (failCollectionOnce) {
          failCollectionOnce = false
          return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 50000, message: '测试名单读取失败' }) })
        }
      }
      const filtered = url.searchParams.get('payment_state') === 'confirmed'
      return reply({ items: collect ? [row(url.searchParams.get('page') === '2' ? 102 : 101), ...(!filtered ? [row(999)] : [])] : [row(101)], total: collect ? 2 : 1, page: Number(url.searchParams.get('page') || 1), page_size: collect ? 100 : 20 })
    }
    if (path === '/admin/cert-products/renshe/plans/12/exports') {
      if (req.method() === 'POST') { exports.push(req.postDataJSON()); return reply({ id: 1, status: 'queued', candidate_total: 2, volumes: [], items: [] }) }
      return reply([])
    }
    if (path === '/admin/cert-products/renshe/refunds') {
      refundQueries.push(url)
      return reply({ items: [], total: 0, page: 1, page_size: 20, status_counts: {} })
    }
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 40001, message: `未配置测试接口 ${path}` }) })
  })
  return { collections, exports, refundQueries, errors }
}

async function selectConfirmed(page: Page) {
  await page.locator('.ant-select').filter({ has: page.getByText('核账状态', { exact: true }) }).locator('input').click()
  await page.locator('.ant-select-dropdown:visible').getByText('核账通过', { exact: true }).click()
}

test('人社导出当前筛选在每一页保留核账条件，工作台显示中文批次状态', async ({ page }) => {
  const state = await prepare(page)
  await page.goto('/admin/certification/renshe/batches/12')
  await expect(page.getByText('已发布', { exact: true })).toBeVisible()
  await selectConfirmed(page)
  await page.getByRole('button', { name: '导出当前筛选', exact: true }).click()
  await expect.poll(() => state.exports.length).toBe(1)
  expect(state.exports[0]).toEqual({ application_ids: [101, 102] })
  expect(state.collections.map(url => [url.searchParams.get('page'), url.searchParams.get('payment_state')])).toEqual([['1', 'confirmed'], ['2', 'confirmed']])
  expect(state.errors).toEqual([])
})

test('收集导出名单失败后显示错误并恢复按钮，重试重新读取名单', async ({ page }) => {
  const state = await prepare(page, true)
  await page.goto('/admin/certification/renshe/batches/12')
  await selectConfirmed(page)
  const button = page.getByRole('button', { name: '导出当前筛选', exact: true })
  await button.click()
  await expect(page.getByText('测试名单读取失败', { exact: true }).first()).toBeVisible()
  expect(state.exports).toHaveLength(0)
  await expect(button).not.toHaveClass(/ant-btn-loading/)
  await button.click()
  await expect.poll(() => state.exports.length).toBe(1)
  expect(state.exports[0]).toEqual({ application_ids: [101, 102] })
  expect(state.errors).toEqual([])
})

test('人社退款批次下拉包含其他产品，选择后使用其批次ID筛选', async ({ page }) => {
  const state = await prepare(page)
  await page.goto('/admin/certification/renshe?tab=refund')
  await page.locator('.ant-select').filter({ has: page.getByText('所属批次', { exact: true }) }).locator('input').click()
  await page.locator('.ant-select-dropdown:visible').getByText('网络管理员测试批次', { exact: true }).click()
  await expect.poll(() => state.refundQueries.some(url => url.searchParams.get('plan_id') === '35')).toBe(true)
  expect(state.errors).toEqual([])
})
