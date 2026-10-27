import { expect, test, type Page } from '@playwright/test'

const historicalPrices = [{ user_type: 'student', price_cents: 50000 }, { user_type: 'normal', price_cents: 120000 }]
const product = { id: 1, type: 'h3c', code: 'GB0-192', name: 'h3cne', chinese_name: 'H3C网络工程师',
  description: '网络基础认证', home_cover_url: null, is_active: true, sort_order: 0, prices: historicalPrices,
  created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' }
const catalog = [
  { id: 17, type: 'h3c', code: 'GB0-192', name: product.chinese_name, instantiated: true },
  { id: 18, type: 'h3c', code: 'GB0-593', name: 'H3C认证网络高级工程师', instantiated: false },
].map(item => ({ ...item, duration_minutes: 60, question_count: 50, total_score: 100, pass_score: 60,
  cert_validity_years: 3, retake_count: null, prerequisite: null, remark: null, source: '测试目录', prices: historicalPrices }))

async function prepare(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  const errors: string[] = [], unexpected: string[] = []
  const writes: Array<{ method: string; path: string; body: Record<string, unknown> }> = []
  let products = [product]
  page.on('pageerror', error => errors.push(error.message))
  // Every API request is answered locally. No fixture write can reach a service.
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (!['fetch', 'xhr'].includes(request.resourceType())) {
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue()
      return route.abort()
    }
    const path = url.pathname.replace(/^\/api/, '')
    const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json',
      body: JSON.stringify({ code: status === 200 ? 0 : 40000, data, message: status === 200 ? 'ok' : '未配置的测试接口' }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '测试管理员', role: 'super_admin',
      is_active: true, must_change_password: false, locked_until: null, last_login_at: null,
      created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' },
      permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (request.method() === 'GET' && path === '/admin/cert-products') return reply({ items: products, total: products.length, page: 1, page_size: 20 })
    if (request.method() === 'GET' && path === '/admin/cert-products/catalog') return reply(catalog)
    if (request.method() === 'POST' && path === '/admin/cert-products') {
      const body = request.postDataJSON() as Record<string, unknown>
      writes.push({ method: 'POST', path, body })
      const created = { ...product, ...body, id: 2 } as typeof product
      products = [...products, created]
      return reply(created)
    }
    if (request.method() === 'PUT' && path === '/admin/cert-products/GB0-192') {
      const body = request.postDataJSON() as Record<string, unknown>
      writes.push({ method: 'PUT', path, body })
      const updated = { ...product, ...body }
      products = [updated]
      return reply(updated)
    }
    unexpected.push(`${request.method()} ${path}`)
    return reply(null, 400)
  })
  return { errors, unexpected, writes }
}

function expectNoProductPrices(body: Record<string, unknown>) {
  for (const field of ['prices', 'student_price_yuan', 'normal_price_yuan']) expect(body).not.toHaveProperty(field)
}

test('H3C编辑仅维护产品展示资料，保留历史价格且保存请求不触碰价格', async ({ page }) => {
  const state = await prepare(page)
  await page.goto('/admin/certification/h3c?tab=products')
  await expect(page.getByText(product.chinese_name, { exact: true })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '学生价', exact: true })).toHaveCount(0)
  await expect(page.getByRole('columnheader', { name: '普通价', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '导入产品目录' })).toBeVisible()
  await expect(page.getByText('报名费用在各考试批次中设置。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '编辑认证产品 · GB0-192' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('学生价', { exact: true })).toHaveCount(0)
  await expect(dialog.getByLabel('普通价', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('价格配置（元）', { exact: true })).toHaveCount(0)
  await expect(dialog.getByRole('note', { name: '产品目录信息' })).toContainText('时长 60 分钟')
  await dialog.getByLabel('名称', { exact: true }).fill('H3C网络工程师 · 新介绍')
  await page.screenshot({ path: 'test-results/h3c-product-edit-pricing.png', fullPage: true, animations: 'disabled' })
  await dialog.getByRole('button', { name: /^保\s*存$/ }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ method: 'PUT', path: '/admin/cert-products/GB0-192', body: { chinese_name: 'H3C网络工程师 · 新介绍' } })
  expectNoProductPrices(state.writes[0].body)
  expect(state.errors).toEqual([])
  expect(state.unexpected).toEqual([])
})

test('H3C新建产品无需填写收费，选择目录后可直接创建', async ({ page }) => {
  const state = await prepare(page)
  await page.goto('/admin/certification/h3c?tab=products')
  await page.getByRole('button', { name: /新增产品/ }).click()
  const dialog = page.getByRole('dialog', { name: '新增新华三认证产品' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('产品编码', { exact: true }).click()
  await page.getByText('GB0-593 · H3C认证网络高级工程师', { exact: true }).click()
  await expect(dialog.getByLabel('名称', { exact: true })).toHaveValue('H3C认证网络高级工程师')
  await expect(dialog.getByLabel('学生价', { exact: true })).toHaveCount(0)
  await expect(dialog.getByLabel('普通价', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('报名费用在各考试批次中设置。', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/h3c-product-create-pricing.png', fullPage: true, animations: 'disabled' })
  await dialog.getByRole('button', { name: /^创\s*建$/ }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ method: 'POST', path: '/admin/cert-products', body: { type: 'h3c', code: 'GB0-593', chinese_name: 'H3C认证网络高级工程师' } })
  expectNoProductPrices(state.writes[0].body)
  expect(state.errors).toEqual([])
  expect(state.unexpected).toEqual([])
})
