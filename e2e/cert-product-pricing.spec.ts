import { expect, test, type Page } from '@playwright/test'

const vendors = [
  { type: 'nisp', label: 'NISP', code: 'NISP-1', name: 'NISP一级', newCode: 'NISP-2', newName: 'NISP二级', selector: '产品编码' },
  { type: 'sangfor', label: '深信服', code: 'SCSA-T', name: '安全技术认证工程师', newCode: 'SCSP-S', newName: '安全服务认证资深工程师', selector: '报考方向' },
] as const

async function prepare(page: Page, vendor: typeof vendors[number]) {
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  const prices = [{ user_type: 'student', price_cents: 50000 }, { user_type: 'normal', price_cents: 120000 }]
  const product = { id: 1, type: vendor.type, code: vendor.code, name: 'vendor-product', chinese_name: vendor.name,
    description: '产品介绍', home_cover_url: null, is_active: true, sort_order: 0, prices,
    created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' }
  const catalog = [
    { id: 17, code: vendor.code, name: vendor.name, instantiated: true },
    { id: 18, code: vendor.newCode, name: vendor.newName, instantiated: false },
  ].map(item => ({ ...item, type: vendor.type, duration_minutes: null, question_count: null, total_score: null,
    pass_score: null, cert_validity_years: null, retake_count: null, prerequisite: null, remark: null, source: '历史参考目录', prices }))
  let products = [product]
  const errors: string[] = [], unexpected: string[] = []
  const writes: Array<{ method: string; path: string; body: Record<string, unknown> }> = []
  page.on('pageerror', error => errors.push(error.message))
  // No fixture API request may reach a real service, including writes.
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
      created_at: '2026-10-27T00:00:00Z', updated_at: '2026-10-27T00:00:00Z' }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (request.method() === 'GET' && path === '/admin/cert-products') return reply({ items: products, total: products.length, page: 1, page_size: 20 })
    if (request.method() === 'GET' && path === '/admin/cert-products/catalog') return reply(catalog)
    if (request.method() === 'POST' && path === '/admin/cert-products') {
      const body = request.postDataJSON() as Record<string, unknown>
      writes.push({ method: 'POST', path, body })
      const created = { ...product, ...body, id: 2 } as typeof product
      products = [...products, created]
      return reply(created)
    }
    if (request.method() === 'PUT' && path === `/admin/cert-products/${vendor.code}`) {
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

function expectNoPrices(body: Record<string, unknown>) {
  for (const field of ['prices', 'student_price_yuan', 'normal_price_yuan']) expect(body).not.toHaveProperty(field)
}

for (const vendor of vendors) {
  test(`${vendor.label}新增产品不要求填写收费，目录历史价不写入产品请求`, async ({ page }) => {
    const state = await prepare(page, vendor)
    await page.goto(`/admin/certification/${vendor.type}?tab=products`)
    await expect(page.getByRole('columnheader', { name: '学生价', exact: true })).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: '普通价', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: /新增产品/ }).click()
    const dialog = page.getByRole('dialog', { name: `新增${vendor.label}认证产品` })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel(vendor.selector, { exact: true }).click()
    await page.getByText(`${vendor.newCode} · ${vendor.newName}`, { exact: true }).click()
    await expect(dialog.getByLabel('名称', { exact: true })).toHaveValue(vendor.newName)
    await expect(dialog.getByLabel('学生价', { exact: true })).toHaveCount(0)
    await expect(dialog.getByLabel('普通价', { exact: true })).toHaveCount(0)
    await expect(dialog.getByText('价格配置（元）', { exact: true })).toHaveCount(0)
    await expect(dialog.getByText(/产品级为默认价/)).toHaveCount(0)
    await expect(dialog.getByText('报名费用在各考试批次中设置。', { exact: true })).toBeVisible()
    await page.screenshot({ path: `test-results/${vendor.type}-product-create-pricing.png`, fullPage: true, animations: 'disabled' })
    await dialog.getByRole('button', { name: /^创\s*建$/ }).click()
    await expect(dialog).not.toBeVisible()
    expect(state.writes).toHaveLength(1)
    expect(state.writes[0]).toMatchObject({ method: 'POST', path: '/admin/cert-products', body: { type: vendor.type, code: vendor.newCode, chinese_name: vendor.newName } })
    expectNoPrices(state.writes[0].body)
    expect(state.errors).toEqual([])
    expect(state.unexpected).toEqual([])
  })

  test(`${vendor.label}编辑仅更新展示资料，不覆盖或清空历史价格`, async ({ page }) => {
    const state = await prepare(page, vendor)
    await page.goto(`/admin/certification/${vendor.type}?tab=products`)
    await expect(page.getByText(vendor.name, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '编辑', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: `编辑认证产品 · ${vendor.code}` })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('学生价', { exact: true })).toHaveCount(0)
    await expect(dialog.getByLabel('普通价', { exact: true })).toHaveCount(0)
    await expect(dialog.getByText(/产品级为默认价/)).toHaveCount(0)
    await dialog.getByLabel('名称', { exact: true }).fill(`${vendor.name} · 新介绍`)
    await page.screenshot({ path: `test-results/${vendor.type}-product-edit-pricing.png`, fullPage: true, animations: 'disabled' })
    await dialog.getByRole('button', { name: /^保\s*存$/ }).click()
    await expect(dialog).not.toBeVisible()
    expect(state.writes).toHaveLength(1)
    expect(state.writes[0]).toMatchObject({ method: 'PUT', path: `/admin/cert-products/${vendor.code}`, body: { chinese_name: `${vendor.name} · 新介绍` } })
    expectNoPrices(state.writes[0].body)
    expect(state.errors).toEqual([])
    expect(state.unexpected).toEqual([])
  })
}
