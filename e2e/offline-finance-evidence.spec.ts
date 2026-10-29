import { expect, test, type Page } from '@playwright/test'
import type { PaymentAudit } from '../src/services/offlinePayment'

test.use({ timezoneId: 'America/Los_Angeles' })

async function prepare(page: Page, result: 'validation' | 'conflict' = 'validation', audits: PaymentAudit[] = []) {
  const errors: string[] = [], unexpected: string[] = [], confirms: Record<string, unknown>[] = []
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  page.on('pageerror', error => errors.push(error.message))
  const batch = { id: 5, name: '核账回归测试批次', product_code: 'SCSA-T', product_name: '安全技术认证工程师', status: 'published',
    exam_direction: '安全技术认证工程师 SCSA-T', apply_start: '2026-10-01T00:00:00Z', apply_end: '2030-11-10T00:00:00Z', exam_date: '2030-11-20T00:00:00Z',
    price_cents: 111100, enrolled: 1, capacity: 20, remaining_count: 19, registration_counts: { pending_payment: 1 } }
  const registration = { id: 7, order_id: 7, batch_id: 5, registration_no: 'SF-FINANCE-0007', revision: 1, current_version: 1,
    status: 'pending_payment', order_status: 'pending', price_cents: 111100, created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z', correction_due_at: null,
    candidate_snapshot: { name: '测试考生', phone: '13800000000', id_card: '11010519491231002X', organization: '测试学院' }, batch_snapshot: {}, versions: [], reviews: [], exports: [],
    payment_summary: { order_id: 7, payment_channel: 'bank_transfer', order_status: 'pending', offline_status: 'under_review', review_payment_allowed: false, review_block_reason: '请先核账确认到账' } }
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.protocol === 'blob:' || url.protocol === 'data:') return route.continue()
    if (!['fetch', 'xhr'].includes(request.resourceType())) return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort()
    const path = url.pathname.replace(/^\/api/, '')
    const reply = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '测试管理员', role: 'super_admin', is_active: true, must_change_password: false,
      locked_until: null, last_login_at: null, created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (path === '/admin/auth/reauth') return reply({ reauth_token: 'test-finance-reauth', expires_in: 600 })
    if (path === '/admin/cert-products/sangfor/batches/5') return reply(batch)
    if (path === '/admin/cert-products/sangfor/registrations') return reply({ items: [registration], total: 1, page: 1, page_size: 20 })
    if (path === '/admin/cert-products/sangfor/registrations/7') return reply(registration)
    if (path === '/admin/cert-products/sangfor/batches/5/exports') return reply([])
    if (path === '/admin/orders/7/offline-payment') return reply({ order_id: 7, order_status: 'pending', amount_cents: 111100, current_version: 1, status: 'under_review', status_label: '待核账', out_trade_no: 'OF-FINANCE-7',
      account: { account_name: '测试收款公司', bank_name: '测试银行', account_number: '6222000011112222', transfer_note: '', contact_name: '服务老师', contact_phone: '13800000000', contact_wechat: '', service_hours: '', submit_hours: 24, correction_hours: 48, version: 1 },
      deadline: null, message: null, refund_business: 'order', generic_refund_approved: false, entries: [], audits, confirmed_at: null,
      materials: [{ id: 11, filename: 'tmp_long_unhelpful_filename_93279274.jpg', content_type: 'image/jpeg', size_bytes: 1024 }],
      submissions: [{ version: 1, status: 'under_review', payer: '测试转账人', amount_cents: 111100, transfer_time: '2026-10-27T00:00:00Z', created_at: '2026-10-27T00:00:00Z', bank_reference: '', note: '', reason: null, material_ids: [11] }] })
    if (path === '/admin/orders/7/offline-payment/materials/11/content') return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWWQAAAAASUVORK5CYII=', 'base64') })
    if (path === '/admin/orders/7/offline-payment/confirm') {
      confirms.push(request.postDataJSON())
      return route.fulfill({ status: result === 'conflict' ? 409 : 422, contentType: 'application/json', body: JSON.stringify(result === 'conflict'
        ? { code: 40201, message: '凭证版本已变化，请刷新后重新核对' }
        : { code: 40001, message: '参数校验失败', detail: [{ field: 'bank_time', reason: 'Value error, 转账时间不能晚于当前时间' }] }) })
    }
    unexpected.push(`${request.method()} ${path}`)
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 40001, message: '未配置的测试接口' }) })
  })
  await page.goto('/admin/certification/sangfor/batches/5')
  await page.getByRole('button', { name: '办理', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认到账', exact: true })).toBeVisible()
  return { errors, unexpected, confirms }
}

async function fillDecision(page: Page, timestamp?: string) {
  await page.getByRole('button', { name: '确认到账', exact: true }).click()
  const modal = page.getByRole('dialog', { name: '确认银行实际到账' })
  await modal.getByRole('spinbutton').fill('1111')
  const past = timestamp || await page.evaluate(() => {
    const date = new Date(Date.now() - 3600000 + 8 * 3600000), pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00`
  })
  await modal.locator('#bank_time').fill(past)
  await modal.locator('#bank_time').press('Enter')
  await modal.locator('#bank_reference').fill('1')
  await modal.locator('#note').fill('已根据银行流水核实')
  return modal
}

async function reauthenticate(page: Page) {
  const dialog = page.getByRole('dialog').filter({ has: page.locator('input[type="password"]') })
  await expect(dialog).toBeVisible()
  await dialog.locator('input[type="password"]').fill('fixture-current-password')
  await dialog.getByRole('button', { name: /验\s*证|确\s*认/ }).click()
}

test('核账图片使用业务标题和缩略图，确认422明确标出到账时间且保留输入', async ({ page }) => {
  const state = await prepare(page)
  await expect(page.getByRole('img', { name: /转账凭证\s*1/ }).first()).toBeVisible()
  await expect(page.getByText('tmp_long_unhelpful_filename_93279274.jpg', { exact: true })).toHaveCount(0)
  const modal = await fillDecision(page)
  const selectedTime = await modal.locator('#bank_time').inputValue()
  await modal.getByRole('button', { name: '确认保存' }).click()
  await reauthenticate(page)
  await expect.poll(() => state.confirms.length).toBe(1)
  await expect(modal.locator('.ant-form-item-explain-error').filter({ hasText: /到账时间|当前时间|未来/ }).first()).toBeVisible()
  await expect(modal.locator('#bank_reference')).toHaveValue('1')
  expect(state.confirms[0].amount_cents).toBe(111100)
  expect(state.confirms[0].bank_time).toBe(new Date(`${selectedTime.replace(' ', 'T')}+08:00`).toISOString())
  expect(state.confirms[0].expected_version).toBe(1)
  expect(state.confirms[0].request_key).toEqual(expect.any(String))
  await page.screenshot({ path: 'test-results/offline-confirm-time-error.png', fullPage: true, animations: 'disabled' })
  expect(state.errors).toEqual([]); expect(state.unexpected).toEqual([])
})

test('核账409保留表单并阻止原窗口盲目重复提交', async ({ page }) => {
  const state = await prepare(page, 'conflict')
  const modal = await fillDecision(page)
  await modal.getByRole('button', { name: '确认保存' }).click()
  await reauthenticate(page)
  await expect.poll(() => state.confirms.length).toBe(1)
  await expect(modal.getByRole('button', { name: '确认保存' })).toBeDisabled()
  await expect(modal.getByRole('button', { name: /刷新核账状态/ })).toBeVisible()
  await expect(modal.locator('#bank_reference')).toHaveValue('1')
  expect(state.errors).toEqual([]); expect(state.unexpected).toEqual([])
})

test('核账记录突出当次异常原因和金额差额，旧记录明确提示缺失原因', async ({ page }) => {
  const state = await prepare(page, 'validation', [
    { action: 'admin.confirm', actor_id: 1, created_at: '2026-10-28T17:35:02Z', summary: { version: 1, result: 'exception', amount_cents: 1111100, note: '历史备注' } },
    { action: 'admin.confirm', actor_id: 1, created_at: '2026-10-29T08:37:32Z', summary: {
      version: 1, result: 'exception', reason_code: 'amount_mismatch', reason: '实际到账金额与应付金额不一致',
      amount_cents: 111100, expected_amount_cents: 1111100, note: '已按银行回单核对', bank_reference: 'TEST-20261029', bank_time: '2026-10-28T16:00:01Z',
    } },
  ])
  await page.getByText(/^第 1 版凭证 ·/).click()
  await page.getByText('核账操作记录（2）', { exact: true }).click()
  const latest = page.locator('.ant-timeline-item').first()
  await latest.scrollIntoViewIfNeeded()
  await expect(latest.getByText('到账金额不符', { exact: true })).toBeVisible()
  await expect(latest.getByText('实际到账金额与应付金额不一致', { exact: true })).toBeVisible()
  await expect(latest.getByText('少到账 ¥10000.00', { exact: true })).toBeVisible()
  await expect(latest.getByText('2026-10-29 00:00:01', { exact: true })).toBeVisible()
  await expect(page.getByText(/该历史记录未保存具体异常原因/)).toBeVisible()
  const container = page.locator('.ant-drawer-body').last()
  const overflow = await container.evaluate(element => element.scrollWidth > element.clientWidth + 1)
  expect(overflow).toBe(false)
  await latest.scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/offline-audit-trail.png', fullPage: true, animations: 'disabled' })
  expect(state.errors).toEqual([]); expect(state.unexpected).toEqual([])
})
