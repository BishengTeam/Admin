import { expect, test, type Page } from '@playwright/test'

const product = { id: 1, type: 'sangfor', code: 'SCSA-T', name: 'SCSA-T', chinese_name: '安全技术认证工程师',
  description: '深信服认证', home_cover_url: null, is_active: true, sort_order: 0, prices: [], created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' }
const batch = { id: 5, name: '深信服11月考试', product_code: 'SCSA-T', product_name: product.chinese_name, status: 'published',
  exam_direction: '安全技术认证工程师 SCSA-T', description: null, apply_start: '2030-11-01T00:00:00Z', apply_end: '2030-11-10T00:00:00Z',
  exam_date: '2030-11-20T00:00:00Z', exam_location: '成都考点', price_cents: 12345, enrolled: 2, capacity: 20, remaining_count: 18,
  registration_counts: { pending_review: 1, approved: 1 } }
const registration = { id: 7, order_id: 7, batch_id: 5, registration_no: 'SF-202611-0007', revision: 3, current_version: 2,
  status: 'approved', order_status: 'paid', price_cents: 12345, created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z', correction_due_at: null,
  candidate_snapshot: { name: '测试考生', phone: '13800000000', id_card: '11010519491231002X', organization: '测试学院', first_name: 'Xiaofu', last_name: 'Shen',
    exam_voucher_code: 'SANGFOR-TEST-001', exam_direction: batch.exam_direction, exam_date: batch.exam_date }, batch_snapshot: {},
  versions: [], reviews: [], exports: [{ version: 2, sha256: 'fixture', created_at: '2026-10-27T01:00:00Z' }],
  payment_summary: { order_id: 7, payment_channel: 'bank_transfer', order_status: 'paid', offline_status: 'confirmed', review_payment_allowed: true, review_block_reason: null } }

async function prepare(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  const errors: string[] = [], unexpected: string[] = [], writes: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  // Fixture-only browser run: no request may reach a real service.
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (!['fetch', 'xhr'].includes(request.resourceType())) {
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue()
      return route.abort()
    }
    const path = url.pathname.replace(/^\/api/, '')
    const reply = (data: unknown, status = 200, message = 'ok') => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status === 200 ? 0 : 40900, data, message }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '测试管理员', role: 'super_admin', is_active: true,
      must_change_password: false, locked_until: null, last_login_at: null, created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (request.method() !== 'GET') {
      writes.push(`${request.method()} ${path}`)
      if (path === '/admin/cert-products/sangfor/batches') return reply({ id: 6 })
      if (path === '/admin/cert-products/sangfor/batches/6') return reply(null)
      if (path.endsWith('/6/publish')) return writes.filter(value => value.endsWith('/6/publish')).length === 1 ? reply(null, 409, '测试发布冲突，请重试') : reply(null)
    }
    if (path === '/admin/cert-products') return reply({ items: [product], total: 1, page: 1, page_size: 100 })
    if (path === '/admin/cert-products/sangfor/batches') return reply([batch, { ...batch, id: 6, name: '深信服12月草稿', status: 'draft', registration_counts: {} }])
    if (path === '/admin/cert-products/sangfor/batches/5') return reply(batch)
    if (path === '/admin/cert-products/sangfor/registrations') return reply({ items: url.searchParams.get('refund_only') === 'true' ? [] : [registration], total: url.searchParams.get('refund_only') === 'true' ? 0 : 1, page: 1, page_size: 20 })
    if (path === '/admin/cert-products/sangfor/registrations/7') return reply(registration)
    if (path === '/admin/cert-products/sangfor/refunds') return reply({ items: [], total: 0, page: 1, page_size: 20, status_counts: {} })
    if (path === '/admin/cert-products/sangfor/refund-batches') return reply([{ id: batch.id, name: batch.name }])
    if (path === '/admin/orders/7/offline-payment') return reply({ order_id: 7, order_status: 'paid', amount_cents: 12345, current_version: 1, status: 'confirmed',
      status_label: '已确认到账', out_trade_no: registration.registration_no, account: { account_name: '测试收款账户', bank_name: '测试银行', account_number: '6222000000000000',
        transfer_note: '', contact_name: '测试管理员', contact_phone: '13800000000', contact_wechat: '', service_hours: '', submit_hours: 24, correction_hours: 24, version: 1 },
      message: null, deadline: null, confirmed_at: '2026-10-27T00:00:00Z', refund_business: 'order', generic_refund_approved: false, submissions: [], materials: [], entries: [], audits: [] })
    if (path === '/admin/cert-products/sangfor/batches/5/exports') return reply([{ id: 'export-fixture', sha256: 'fixture', created_at: '2026-10-27T01:00:00Z', people_count: 1,
      people: [{ registration_id: 7, registration_no: registration.registration_no, name: '测试考生', version: 2, is_current: true }] }])
    unexpected.push(`${request.method()} ${path}`)
    return reply(null, 400, '未配置的测试接口')
  })
  return { errors, unexpected, writes }
}

test('深信服列表、分组侧边窗与NISP一致；发布失败重试复用已建草稿', async ({ page }) => {
  const state = await prepare(page)
  await page.goto('/admin/certification/sangfor')
  await expect(page.getByRole('button', { name: '管理报名' })).toHaveCount(2)
  await expect(page.locator('.ant-tag-green').filter({ hasText: '已发布' })).toBeVisible()
  await page.screenshot({ path: 'test-results/sangfor-batches.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '新建批次' }).click()
  const drawer = page.getByRole('dialog', { name: '新建深信服考试批次' })
  await expect(drawer).toBeVisible()
  await expect(drawer).toHaveCSS('width', '820px')
  await page.getByLabel('批次名称', { exact: true }).fill('新考试批次')
  for (const [label, value] of [['报名开始时间', '2030-11-01 09:00:00'], ['报名截止时间', '2030-11-10 18:00:00'], ['考试时间', '2030-11-20 09:00:00']]) {
    const input = page.getByPlaceholder(label, { exact: true })
    await input.fill(value); await input.press('Enter')
  }
  await page.getByLabel('本批次报名费（元）', { exact: true }).fill('123.45')
  await page.screenshot({ path: 'test-results/sangfor-create-drawer.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '保存并发布' }).click()
  await expect(page.getByText('测试发布冲突，请重试', { exact: true })).toBeVisible()
  await expect(drawer).toBeVisible()
  await page.getByRole('button', { name: '保存并发布' }).click()
  await expect(drawer).not.toBeVisible()
  expect(state.writes.filter(value => value === 'POST /admin/cert-products/sangfor/batches')).toHaveLength(1)
  expect(state.writes.filter(value => value.endsWith('/6/publish'))).toHaveLength(2)
  expect(state.errors).toEqual([])
  expect(state.unexpected).toEqual([])
})

test('工作台统一列表、导出记录、退款记录和先核账后审核侧边窗', async ({ page }) => {
  const state = await prepare(page)
  await page.goto('/admin/certification/sangfor/batches/5')
  await expect(page.getByRole('tab', { name: '报名列表', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: '导出记录', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: '退款记录', exact: true })).toBeVisible()
  await expect(page.getByText(registration.registration_no, { exact: true })).toBeVisible()
  await page.getByRole('checkbox').last().check()
  await page.getByRole('button', { name: '导出所选报名信息' }).click()
  await expect(page.getByRole('dialog', { name: '确认导出报名信息（1人）' })).toBeVisible()
  await page.getByRole('button', { name: /取\s*消/, exact: true }).click()
  await expect(page.getByRole('dialog', { name: '确认导出报名信息（1人）' })).not.toBeVisible()
  await page.screenshot({ path: 'test-results/sangfor-workbench.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '办理', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '报名办理', exact: true })
  await expect(drawer).toHaveCSS('width', '1120px')
  await expect(drawer.getByRole('tab', { name: '① 核账' })).toBeVisible()
  await expect(drawer.getByRole('tab', { name: '② 报名审核' })).toBeVisible()
  await expect(drawer.getByText('SANGFOR-TEST-001')).toBeVisible()
  await expect(drawer.getByRole('button', { name: '登记外审通过' })).toBeVisible()
  await drawer.getByRole('tab', { name: '① 核账' }).click()
  await expect(drawer.getByText('测试收款账户')).toBeVisible()
  await drawer.getByRole('tab', { name: '② 报名审核' }).click()
  await drawer.getByRole('button', { name: '办理退款', exact: true }).click()
  const finance = page.getByRole('dialog', { name: '退款办理', exact: true })
  await expect(finance.getByText('测试收款账户')).toBeVisible()
  await expect(finance.getByRole('button', { name: '审批退款', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/certification\/sangfor\/batches\/5/)
  await finance.locator('.ant-drawer-footer').getByRole('button', { name: /关\s*闭/, exact: true }).click()
  await page.screenshot({ path: 'test-results/sangfor-processing.png', fullPage: true, animations: 'disabled' })
  await drawer.locator('.ant-drawer-footer').getByRole('button', { name: /关\s*闭/, exact: true }).click()
  await page.getByRole('tab', { name: '导出记录', exact: true }).click()
  await page.getByRole('button', { name: '查看人员' }).click()
  const people = page.getByRole('dialog', { name: '导出记录人员' })
  await expect(people.getByText('第2版')).toBeVisible()
  await people.locator('.ant-drawer-footer').getByRole('button', { name: /关\s*闭/, exact: true }).click()
  await page.getByRole('tab', { name: '退款记录', exact: true }).click()
  await expect(page.getByText('没有符合条件的退款记录')).toBeVisible()
  expect(state.writes).toEqual([])
  expect(state.errors).toEqual([])
  expect(state.unexpected).toEqual([])
})

test('深信服全局退款管理使用统一的处理中与异常文案', async ({ page }) => {
  const state = await prepare(page)
  await page.goto('/admin/certification/sangfor?tab=refund')
  await expect(page.getByRole('tab', { name: '退款管理', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: '处理中（0）', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: '异常（0）', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: '全部记录（0）', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^待处理/ })).toHaveCount(0)
  await expect(page.getByText('没有符合条件的退款记录')).toBeVisible()
  expect(state.writes).toEqual([])
  expect(state.errors).toEqual([])
  expect(state.unexpected).toEqual([])
})

test('窄屏的批次侧边窗使用单列并保留固定操作栏', async ({ page }) => {
  const state = await prepare(page)
  await page.setViewportSize({ width: 540, height: 900 })
  await page.goto('/admin/certification/sangfor')
  await page.getByRole('button', { name: '新建批次' }).click()
  const drawer = page.getByRole('dialog', { name: '新建深信服考试批次' })
  expect((await drawer.boundingBox())!.width).toBeCloseTo(540 * 0.94, 0)
  const start = await page.getByLabel('报名开始', { exact: true }).boundingBox()
  const end = await page.getByLabel('报名截止', { exact: true }).boundingBox()
  expect(end!.y).toBeGreaterThan(start!.y + start!.height)
  await expect(drawer.getByRole('button', { name: '保存并发布' })).toBeInViewport()
  await page.screenshot({ path: 'test-results/sangfor-create-narrow.png', fullPage: true, animations: 'disabled' })
  expect(state.errors).toEqual([])
  expect(state.unexpected).toEqual([])
})
