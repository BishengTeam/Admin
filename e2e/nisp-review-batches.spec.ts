import { expect, test, type Page } from '@playwright/test'

const firstBatch = { id: 18, name: '2026年11月考试批次', level: '2', status: 'archived' }
const secondBatch = { id: 37, name: firstBatch.name, level: '1', status: 'cancelled' }
const nextBatch = { id: 77, name: '第二页历史考试批次', level: '2', status: 'finalized' }
const firstPage = [firstBatch, secondBatch, ...Array.from({ length: 18 }, (_, index) => ({
  id: 300 + index, name: `2026年历史考试批次${index + 1}`, level: '1', status: 'registration_closed',
}))]
const payment = { order_id: 7, payment_channel: 'wechat', order_status: 'paid', offline_status: null,
  review_payment_allowed: true, review_block_reason: null }
const registration = { id: 7, registration_no: 'NISP-2-00000007', batch_id: 18, batch_name: firstBatch.name, level: '2',
  status: 'pending_review', candidate_snapshot: { name: '张三', phone: '13800000000', school: '审核测试学院' },
  order_status: 'paid', price_cents: 48000, resubmission_count: 0, rejection_count: 0, materials: [],
  created_at: '2026-10-27T00:00:00Z', latest_review: null, payment_summary: payment }
const rows = [registration,
  { ...registration, id: 8, registration_no: 'NISP-1-00000008', batch_id: 37, level: '1', candidate_snapshot: { name: '李四' } },
  { ...registration, id: 9, registration_no: 'NISP-2-00000009', batch_id: 55, batch_name: null, candidate_snapshot: { name: '王五' } }]

async function prepare(page: Page, failOptionsOnce = false) {
  await page.setViewportSize({ width: 1560, height: 1050 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  const errors: string[] = [], unexpected: string[] = [], writes: string[] = []
  const registrations: Record<string, string>[] = [], options: Record<string, string>[] = []
  page.on('pageerror', error => errors.push(error.message))
  // Every fetch/XHR is fulfilled here, including unknown routes and writes.
  // This review-only fixture cannot reach or mutate an actual API.
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (!['fetch', 'xhr'].includes(request.resourceType())) {
      if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue()
      return route.abort()
    }
    const path = url.pathname.replace(/^\/api/, '')
    const reply = (data: unknown, status = 200, message = 'ok') => route.fulfill({ status,
      contentType: 'application/json', body: JSON.stringify({ code: status === 200 ? 0 : 50000, data, message }) })
    if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return reply(null, 405, '测试禁止写入') }
    if (path === '/admin/auth/me') return reply({ admin: { id: 3, username: 'nisp-review-fixture', display_name: 'NISP审核员', role: 'cert_admin',
      is_active: true, must_change_password: false, locked_until: null, last_login_at: null,
      created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' },
      permissions: ['nisp:review'], session_mode: 'normal', must_change_password: false })
    if (path === '/admin/nisp/review-batch-options') {
      const params = Object.fromEntries(url.searchParams); options.push(params)
      if (failOptionsOnce) { failOptionsOnce = false; return reply(null, 503, '测试批次接口暂时失败') }
      const items = params.keyword ? [nextBatch] : params.page === '2' ? [nextBatch] : firstPage
      return reply({ items, total: params.keyword ? 1 : 21, page: Number(params.page || 1), page_size: 20 })
    }
    if (path === '/admin/nisp/registrations') {
      const params = Object.fromEntries(url.searchParams); registrations.push(params)
      const items = rows.filter(row => (!params.batch_id || row.batch_id === Number(params.batch_id))
        && (!params.status || row.status === params.status)
        && (!params.keyword || row.candidate_snapshot.name.includes(params.keyword)))
      return reply({ items, total: 61, page: Number(params.page || 1), page_size: Number(params.page_size || 20) })
    }
    if (path === '/admin/nisp/registrations/7') return reply(registration)
    unexpected.push(`${request.method()} ${path}`)
    return reply(null, 400, '未配置的测试接口')
  })
  await page.goto('/admin/certification/nisp?tab=review')
  await expect(page.getByRole('tab', { name: '报名审核', exact: true })).toBeVisible()
  await expect(page.getByText('张三', { exact: true })).toBeVisible()
  return { errors, unexpected, writes, registrations, options }
}
const last = <T,>(items: T[]) => items[items.length - 1]
const batchSelect = (page: Page) => page.getByRole('combobox', { name: '所属批次' })
const batchField = (page: Page) => page.locator('.ant-select').filter({ has: batchSelect(page) })
const option = (page: Page, id: number) => page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: `批次 #${id} ·` })
async function openBatch(page: Page) {
  await batchSelect(page).focus()
  if (await batchSelect(page).getAttribute('aria-expanded') !== 'true') await batchSelect(page).press('ArrowDown')
  await expect(batchSelect(page)).toHaveAttribute('aria-expanded', 'true')
}
async function chooseBatch(page: Page, id: number) {
  await openBatch(page)
  await option(page, id).click()
}
async function chooseFilter(page: Page, placeholder: string, label: string) {
  await page.locator('.ant-select').filter({ has: page.locator('.ant-select-selection-placeholder').filter({ hasText: placeholder }) }).click()
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content').filter({ hasText: new RegExp(`^${label}$`) }).click()
}

test('审核员能按所属批次与原条件交集筛选、清除并在原抽屉办理', async ({ page }) => {
  const state = await prepare(page)
  const headings = await page.getByRole('columnheader').allTextContents()
  expect(headings.slice(0, 3)).toEqual(['姓名', '所属批次', '报名编号'])
  await expect(page.getByText('NISP二级 · 批次 #18', { exact: true })).toBeVisible()
  await expect(page.getByText('NISP一级 · 批次 #37', { exact: true })).toBeVisible()
  await expect(page.getByText('批次 #55', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/nisp-review-batches-overview.png', fullPage: true, animations: 'disabled' })
  await chooseFilter(page, '核账状态', '核账通过')
  await chooseFilter(page, '报名审核状态', '待初审')
  await page.getByPlaceholder('姓名 / 报名编号').fill('张')
  await page.getByPlaceholder('姓名 / 报名编号').press('Enter')
  await expect.poll(() => last(state.registrations)).toMatchObject({ page: '1', payment_state: 'confirmed', status: 'pending_review', keyword: '张' })
  await page.locator('.ant-pagination-item-2').click()
  await expect.poll(() => last(state.registrations).page).toBe('2')
  await chooseBatch(page, 18)
  await expect.poll(() => last(state.registrations)).toMatchObject({ page: '1', batch_id: '18', payment_state: 'confirmed', status: 'pending_review', keyword: '张' })
  expect(last(state.registrations)).not.toHaveProperty('plan_id')
  await page.getByRole('button', { name: '办理', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '报名办理', exact: true })
  await expect(drawer.getByText(`${firstBatch.name} · NISP二级 · 批次 #18`, { exact: true })).toBeVisible()
  await expect(drawer.getByRole('tab', { name: '① 核账' })).toBeVisible()
  await expect(drawer.getByRole('tab', { name: '② 报名审核' })).toBeEnabled()
  await drawer.getByRole('tab', { name: '① 核账' }).click()
  await expect(drawer.getByText('历史微信付款已确认，无需银行转账凭证')).toBeVisible()
  await drawer.getByRole('tab', { name: '② 报名审核' }).click()
  await expect(drawer.getByRole('button', { name: '初审通过', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/certification\/nisp\?tab=review$/)
  await page.screenshot({ path: 'test-results/nisp-review-batch-drawer.png', fullPage: true, animations: 'disabled' })
  await drawer.locator('.ant-drawer-footer').getByRole('button', { name: /^关\s*闭$/ }).click()
  await page.locator('.ant-pagination-item-2').click()
  await expect.poll(() => last(state.registrations).page).toBe('2')
  await batchField(page).hover()
  await batchField(page).locator('.ant-select-clear').click()
  await expect.poll(() => last(state.registrations)).toEqual({ page: '1', page_size: '20', payment_state: 'confirmed', status: 'pending_review', keyword: '张' })
  expect(state.writes).toEqual([]); expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})

test('所属批次远程分页、搜索保留选中label且允许历史批次', async ({ page }) => {
  const state = await prepare(page)
  await chooseBatch(page, 18)
  await expect(batchField(page).locator('.ant-select-selection-item')).toHaveText(`${firstBatch.name} · NISP二级 · #18`)
  await openBatch(page)
  await expect(option(page, 18)).toContainText('已归档')
  await expect(option(page, 37)).toContainText('已取消')
  await page.screenshot({ path: 'test-results/nisp-review-batch-options.png', fullPage: true, animations: 'disabled' })
  const holder = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .rc-virtual-list-holder')
  await holder.evaluate(element => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll', { bubbles: true })) })
  await expect.poll(() => state.options.some(params => params.page === '2' && params.page_size === '20')).toBe(true)
  await expect(option(page, 77)).toBeVisible()
  await batchSelect(page).fill('第二页')
  await expect.poll(() => last(state.options)).toMatchObject({ keyword: '第二页', page: '1', page_size: '20' })
  await expect(option(page, 77)).toBeVisible()
  await batchSelect(page).press('Escape')
  await batchSelect(page).press('Tab')
  await expect(batchField(page).locator('.ant-select-selection-item')).toHaveText(`${firstBatch.name} · NISP二级 · #18`)
  expect(last(state.registrations).batch_id).toBe('18')
  await openBatch(page)
  await batchSelect(page).fill('第二页')
  await expect(option(page, 77)).toBeVisible()
  await option(page, 77).click()
  await expect.poll(() => last(state.registrations).batch_id).toBe('77')
  await openBatch(page)
  await batchSelect(page).fill('')
  await expect(option(page, 37)).toBeVisible()
  await option(page, 37).click()
  await expect.poll(() => last(state.registrations).batch_id).toBe('37')
  await expect(page.getByText('李四', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/nisp-review-batch-filter.png', fullPage: true, animations: 'disabled' })
  expect(state.writes).toEqual([]); expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})

test('审核权限可直接读取批次选项并在失败后重试', async ({ page }) => {
  const state = await prepare(page, true)
  await openBatch(page)
  await expect(page.getByText('批次加载失败，请重试', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '重试加载批次' }).click()
  await expect(option(page, 18)).toBeVisible()
  await option(page, 18).click()
  await expect.poll(() => last(state.registrations).batch_id).toBe('18')
  expect(state.options).toHaveLength(2)
  expect(state.options.every(params => params.page === '1' && params.page_size === '20')).toBe(true)
  expect(state.writes).toEqual([]); expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})
