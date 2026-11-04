import { test, expect } from '@playwright/test'

test('四类认证复用须知编辑器，可排序、预览并按批次保存', async ({ page }) => {
  const stamp = '2026-11-04T00:00:00Z', saved: Array<{ path: string; plan: string | null; body: any }> = [], errors: string[] = []
  page.on('pageerror', reason => errors.push(reason.message))
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  const content = { version: 1, title: '报名须知', blocks: [{ type: 'text', text: '第一段：核对科目与批次', url: '', caption: '' }, { type: 'text', text: '第二段：核对报名材料', url: '', caption: '' }], contact_name: '报名老师', contact_phone: '13800138000', contact_wechat: 'exam_contact', service_hours: '工作日09:00—18:00' }
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue()
    const reply = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'ok', data }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '报名管理员', role: 'super_admin', is_active: true, must_change_password: false, locked_until: null, last_login_at: null, created_at: stamp, updated_at: stamp }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (path.endsWith('/catalog') && path.startsWith('/admin/certification-journeys/')) return reply({ title: '认证', subjects: [{ id: 'A', name: '测试科目' }], batches: [{ id: 5, plan_id: 12, subject_id: 'A', name: '十一月批次', status: 'published' }] })
    if (path.endsWith('/content') && path.startsWith('/admin/certification-journeys/')) {
      if (request.method() === 'PUT') { saved.push({ path, plan: url.searchParams.get('plan_id'), body: request.postDataJSON() }); return reply({ ...request.postDataJSON(), version: 2 }) }
      return reply(content)
    }
    return reply([])
  })
  for (const vendor of ['h3c', 'nisp', 'renshe', 'sangfor']) {
    await page.goto(`/admin/certification/${vendor}?tab=notice`)
    await expect(page.getByRole('textbox', { name: '须知标题' })).toHaveValue('报名须知')
  }
  await page.getByRole('button', { name: '下移第1段', exact: true }).click()
  await page.getByRole('button', { name: '手机端预览', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('第二段：核对报名材料')).toBeVisible()
  await expect(dialog.locator('.ant-typography').nth(1)).toHaveText('第二段：核对报名材料')
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: '保存设置', exact: true }).click()
  await expect.poll(() => saved.length).toBe(1)
  expect(saved[0].body.blocks[0].text).toBe('第二段：核对报名材料')
  expect(saved[0].path).toContain('/sangfor/')
  expect(saved[0].plan).toBeNull()
  await page.locator('.ant-select-selection-item').filter({ hasText: '认证通用须知' }).click()
  await page.getByText('测试科目 · 十一月批次', { exact: true }).click()
  await expect(page.getByRole('textbox', { name: '补充说明标题' })).toHaveValue('报名须知')
  await page.getByRole('button', { name: '保存设置', exact: true }).click()
  await expect.poll(() => saved.length).toBe(2)
  expect(saved[1].plan).toBe('12')
  await page.screenshot({ path: 'test-results/certification-notice-desktop.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 768, height: 1000 })
  await expect(page.getByRole('button', { name: /保存设置$/ })).toBeVisible()
  await page.screenshot({ path: 'test-results/certification-notice-narrow.png', fullPage: true, animations: 'disabled' })
  expect(errors).toEqual([])
})
