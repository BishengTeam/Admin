import { expect, test, type Page } from '@playwright/test'

test.use({ timezoneId: 'Asia/Shanghai' })

// 人社批次工作台 → 退款处理：登记线下退款弹窗在 409（金额不一致）后应允许改正后重新提交
async function prepare(page: Page, firstResponse: 'conflict' | 'validation' = 'conflict') {
  const unexpected: string[] = [], refunds: Record<string, unknown>[] = []
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  const plan = {
    id: 5, name: 'QA-流程-RS', product_code: 'RENSHE', product_name: '职业技能等级认证', product_type: null,
    status: 'published', price_cents: 100, enrolled: 1, capacity: 1,
    projects: [{ id: 1, product_name: '网络安全三级-验收测试', price_cents: 100, config: {} }],
  }
  const refund = {
    id: 31, application_id: 31, order_id: 77, user_id: 9, request_kind: 'exception', reason_code: 'exception',
    reason_detail: 'qqq', amount_cents: 100, status: 'approved', requested_at: '2026-11-26T02:08:37Z',
    due_at: '2026-11-28T02:08:37Z', decided_at: '2026-11-26T02:10:00Z', rejection_reason: null,
    out_trade_no: 'RS-ORDER-77', succeeded_at: null, last_error: null, retry_count: 0,
    candidate_name: '林安', registration_no: 'RS-31', batch_id: 5, batch_name: 'QA-流程-RS',
    product_label: '网络安全三级-验收测试', payment_channel: 'bank_transfer',
  }
  const payment = {
    order_id: 77, order_status: 'paid', amount_cents: 100, current_version: 1, status: 'confirmed', status_label: '已确认到账',
    out_trade_no: 'RS-ORDER-77',
    account: { account_name: '测试收款公司', bank_name: '测试银行', account_number: '6222000011112222', transfer_note: '', contact_name: '服务老师', contact_phone: '13800000000', contact_wechat: '', service_hours: '', submit_hours: 24, correction_hours: 48, version: 1 },
    deadline: null, message: null, refund_business: 'renshe', generic_refund_approved: true, entries: [], audits: [], confirmed_at: '2026-11-25T02:00:00Z',
    materials: [], submissions: [],
  }
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.protocol === 'blob:' || url.protocol === 'data:') return route.continue()
    if (!['fetch', 'xhr'].includes(request.resourceType())) return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort()
    const path = url.pathname.replace(/^\/api/, '')
    const reply = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '测试管理员', role: 'super_admin', is_active: true, must_change_password: false, locked_until: null, last_login_at: null, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (path === '/admin/auth/reauth') return reply({ reauth_token: 'test-refund-reauth', expires_in: 600 })
    if (path === '/admin/cert-products/renshe/batches') return reply([plan])
    if (path === '/admin/cert-products/renshe/plans/5/exports') return reply([])
    if (/^\/admin\/cert-products\/renshe\/applications(\/\d+)?$/.test(path)) return reply({ items: [], total: 0, page: 1, page_size: 20 })
    if (path === '/admin/cert-products/renshe/refunds') return reply({ items: [refund], total: 1, page: 1, page_size: 20, status_counts: { approved: 1 } })
    if (path === '/admin/orders/77/offline-payment') return reply(payment)
    if (path === '/admin/orders/77/offline-payment/materials') return reply({ id: 12, filename: 'refund.jpg', content_type: 'image/jpeg', size_bytes: 1024 })
    if (path === '/admin/orders/77/offline-payment/refund') {
      refunds.push(request.postDataJSON())
      if (refunds.length === 1) {
        return route.fulfill({ status: firstResponse === 'conflict' ? 409 : 422, contentType: 'application/json', body: JSON.stringify(firstResponse === 'conflict'
          ? { code: 40201, message: '实际退款金额与已付款订单不一致' }
          : { code: 40001, message: '参数校验失败', detail: [{ field: 'bank_time', reason: 'Value error, 退款时间不能晚于当前时间' }] }) })
      }
      return reply({ status: 'refunded' })
    }
    unexpected.push(`${request.method()} ${path}`)
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 40001, message: '未配置的测试接口' }) })
  })
  await page.goto('/admin/certification/renshe/batches/5?tab=refunds')
  await expect(page.getByRole('button', { name: '登记线下退款' })).toBeVisible()
  return { unexpected, refunds }
}

async function openRefundModal(page: Page) {
  await page.getByRole('button', { name: '登记线下退款' }).click()
  const modal = page.getByRole('dialog', { name: '登记线下实际退款' })
  await expect(modal).toBeVisible()
  const past = await page.evaluate(() => {
    const date = new Date(Date.now() - 3600e3), pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  })
  await modal.getByRole('spinbutton').fill('1')
  await modal.locator('#bank_time').fill(past)
  await modal.locator('#bank_time').press('Enter')
  await modal.locator('#bank_reference').fill('TEST-1')
  await modal.locator('#note').fill('测试退款')
  await page.locator('input[type="file"]').setInputFiles({ name: 'refund.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-image') })
  await expect(modal.getByText('refund.jpg')).toBeVisible()
  return { modal, past }
}

async function save(page: Page, modal: ReturnType<Page['getByRole']>) {
  await modal.getByRole('button', { name: /确认保存/ }).click()
  const dialog = page.getByRole('dialog').filter({ has: page.locator('input[type="password"]') })
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.locator('input[type="password"]').fill('fixture-current-password')
    await dialog.getByRole('button', { name: /验\s*证|确\s*认/ }).click()
  }
}

test('409 金额不一致后改正金额可以重新提交，不锁死确认按钮', async ({ page }) => {
  const state = await prepare(page, 'conflict')
  const { modal } = await openRefundModal(page)
  await save(page, modal)
  await expect.poll(() => state.refunds.length).toBe(1)
  await expect(modal.getByText(/实际退款金额与已付款订单不一致/).first()).toBeVisible()
  const ok = modal.getByRole('button', { name: /确认保存/ })
  await expect(ok).toBeEnabled()
  await modal.getByRole('spinbutton').fill('1.00')
  await save(page, modal)
  await expect.poll(() => state.refunds.length, { timeout: 8000 }).toBe(2)
  expect(state.unexpected).toEqual([])
})

test('422 后端校验失败改正后可以重新提交', async ({ page }) => {
  const state = await prepare(page, 'validation')
  const { modal, past } = await openRefundModal(page)
  await save(page, modal)
  await expect.poll(() => state.refunds.length).toBe(1)
  await expect(modal.locator('.ant-form-item-explain-error').first()).toBeVisible()
  await modal.locator('#bank_time').fill(past)
  await modal.locator('#bank_time').press('Enter')
  await save(page, modal)
  await expect.poll(() => state.refunds.length, { timeout: 8000 }).toBe(2)
  expect(state.unexpected).toEqual([])
})

test('退款处理子页顺序：全部记录在最前', async ({ page }) => {
  await prepare(page)
  const tabs = page.locator('[role="tabpanel"][id*="refunds"] [role="tab"], .ant-tabs-tab')
  const labels = await page.getByRole('tab').allInnerTexts()
  const refundLabels = labels.filter(label => /待处理|处理中|异常|全部记录/.test(label))
  expect(refundLabels[0]).toContain('全部记录')
  expect(tabs.first()).toBeTruthy()
})
