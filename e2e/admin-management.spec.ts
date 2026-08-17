import { expect, test, type Page, type Route } from '@playwright/test'

const TOKEN = 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'
const now = '2026-08-15T08:00:00+08:00'

const superAdmin = {
  id: 1,
  username: 'root.operator',
  display_name: '系统管理员',
  role: 'super_admin',
  is_active: true,
  must_change_password: false,
  locked_until: null,
  last_login_at: now,
  created_at: now,
  updated_at: now,
}

const quizAdmin = {
  id: 2,
  username: 'quiz.operator',
  display_name: '题库运营',
  role: 'quiz_admin',
  is_active: true,
  must_change_password: false,
  locked_until: null,
  last_login_at: null,
  created_at: now,
  updated_at: now,
}

function envelope(data: unknown) {
  return { code: 0, message: 'ok', data }
}

async function json(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(envelope(data)),
  })
}

async function authenticate(
  page: Page,
  options: {
    admin?: typeof superAdmin | typeof quizAdmin
    permissions?: string[]
    restricted?: boolean
  } = {},
) {
  const admin = options.admin ?? superAdmin
  const restricted = options.restricted ?? false
  await page.addInitScript((token) => sessionStorage.setItem('admin_token', token), TOKEN)
  await page.route('**/admin/auth/me', (route) => json(route, {
    admin: { ...admin, must_change_password: restricted },
    permissions: options.permissions ?? ['*'],
    session_mode: restricted ? 'restricted' : 'normal',
    must_change_password: restricted,
  }))
}

test.describe('管理员账号与固定角色', () => {
  test('超级管理员完成再认证并创建只显示一次临时密码的管理员', async ({ page }) => {
    await authenticate(page)
    let createBody: unknown
    let reauthHeader: string | undefined
    let reauthCalls = 0

    await page.route(/\/admin\/settings\/admins(?:\?.*)?$/, async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.continue()
        return
      }
      if (route.request().method() === 'POST') {
        createBody = route.request().postDataJSON()
        reauthHeader = route.request().headers()['x-reauth-token']
        await json(route, { admin: quizAdmin, temporary_password: 'one-time-secret-from-server' })
        return
      }
      await json(route, { items: [superAdmin], total: 1, page: 1, page_size: 20 })
    })
    await page.route('**/admin/auth/reauth', async (route) => {
      reauthCalls += 1
      expect(route.request().postDataJSON()).toEqual({ password: 'current-super-password' })
      await json(route, { reauth_token: 'reauth-in-memory', expires_in: 600 })
    })

    await page.goto('/admin/settings/admins')
    await expect(page.getByRole('complementary').getByText('系统管理', { exact: true })).toBeVisible()
    const superAdminRow = page.getByRole('row', { name: /root\.operator 系统管理员/ })
    await expect(superAdminRow).toBeVisible()
    await expect(superAdminRow.getByRole('button', { name: '编辑显示名' })).toBeDisabled()
    await expect(superAdminRow.getByRole('button', { name: '停用' })).toBeDisabled()
    await expect(superAdminRow.getByRole('button', { name: '重置密码' })).toBeDisabled()

    await page.getByRole('button', { name: '创建管理员' }).click()
    const createDialog = page.getByRole('dialog', { name: '创建管理员' })
    await createDialog
      .locator('.ant-form-item')
      .filter({ hasText: '管理员角色' })
      .locator('.ant-select')
      .click()
    await expect(page.getByRole('option', { name: '超级管理员' })).toHaveCount(0)
    await page
      .locator('.ant-select-dropdown .ant-select-item-option')
      .filter({ hasText: '题库管理员' })
      .click()
    await createDialog.getByLabel('登录用户名').fill('Quiz.New-Admin')
    await createDialog.getByLabel('管理员显示名').fill('新题库管理员')
    await createDialog.getByRole('button', { name: /创\s*建/ }).click()

    const reauthDialog = page.getByRole('dialog', { name: '验证当前管理员身份' })
    await reauthDialog.getByLabel('当前密码').fill('current-super-password')
    await reauthDialog.getByRole('button', { name: /验\s*证/ }).click()

    const passwordDialog = page.getByRole('dialog', { name: '一次性临时密码' })
    await expect(passwordDialog.getByText('one-time-secret-from-server')).toBeVisible()
    expect(createBody).toEqual({
      username: 'quiz.new-admin',
      display_name: '新题库管理员',
      role: 'quiz_admin',
    })
    expect(reauthHeader).toBe('reauth-in-memory')
    expect(reauthCalls).toBe(1)
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull()
    expect(await page.evaluate(() => sessionStorage.getItem('admin_token'))).toBe(TOKEN)
  })

  test('管理员显示名、解锁、重置、停用和重新启用形成完整闭环', async ({ page }) => {
    await authenticate(page)
    let currentAdmin = {
      ...quizAdmin,
      locked_until: '2099-08-15T08:15:00+08:00' as string | null,
    }
    const actions: string[] = []
    const reauthHeaders: Array<string | undefined> = []
    let reauthCalls = 0

    await page.route(/\/admin\/settings\/admins(?:\/\d+(?:\/[a-z-]+)?)?(?:\?.*)?$/, async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.continue()
        return
      }
      const request = route.request()
      const pathname = new URL(request.url()).pathname
      if (request.method() === 'GET') {
        await json(route, { items: [superAdmin, currentAdmin], total: 2, page: 1, page_size: 20 })
        return
      }

      reauthHeaders.push(request.headers()['x-reauth-token'])
      if (request.method() === 'PATCH') {
        actions.push('edit')
        currentAdmin = { ...currentAdmin, display_name: request.postDataJSON().display_name }
        await json(route, currentAdmin)
        return
      }

      const action = pathname.split('/').at(-1)!
      actions.push(action)
      if (action === 'unlock') {
        currentAdmin = { ...currentAdmin, locked_until: null }
        await json(route, currentAdmin)
      } else if (action === 'disable') {
        currentAdmin = { ...currentAdmin, is_active: false }
        await json(route, currentAdmin)
      } else if (action === 'enable') {
        currentAdmin = { ...currentAdmin, is_active: true, must_change_password: true }
        await json(route, { admin: currentAdmin, temporary_password: 'enabled-one-time-value' })
      } else {
        currentAdmin = { ...currentAdmin, must_change_password: true }
        await json(route, { admin: currentAdmin, temporary_password: 'reset-one-time-value' })
      }
    })
    await page.route('**/admin/auth/reauth', async (route) => {
      reauthCalls += 1
      await json(route, { reauth_token: 'shared-reauth-token', expires_in: 600 })
    })

    await page.goto('/admin/settings/admins')
    const quizRow = () => page.getByRole('row', { name: /quiz\.operator/ })

    await quizRow().getByRole('button', { name: '编辑显示名' }).click()
    const editDialog = page.getByRole('dialog', { name: /编辑显示名/ })
    await editDialog.getByLabel('管理员显示名').fill('题库运营二组')
    await editDialog.getByRole('button', { name: /保\s*存/ }).click()
    const reauthDialog = page.getByRole('dialog', { name: '验证当前管理员身份' })
    await reauthDialog.getByLabel('当前密码').fill('current-super-password')
    await reauthDialog.getByRole('button', { name: /验\s*证/ }).click()
    await expect(page.getByRole('cell', { name: '题库运营二组' })).toBeVisible()

    await quizRow().getByRole('button', { name: '解除锁定' }).click()
    await page.getByRole('dialog', { name: /解除管理员/ }).getByRole('button', { name: /确认\s*解锁/ }).click()
    await expect(quizRow().getByRole('button', { name: '解除锁定' })).toHaveCount(0)

    await quizRow().getByRole('button', { name: '重置密码' }).click()
    await page.getByRole('dialog', { name: /重置管理员/ }).getByRole('button', { name: /确认\s*重置/ }).click()
    await expect(page.getByRole('dialog', { name: '一次性临时密码' }).getByText('reset-one-time-value')).toBeVisible()
    await page.getByRole('button', { name: /我已安全保存/ }).click()

    await quizRow().getByRole('button', { name: '停用' }).click()
    await page.getByRole('dialog', { name: /停用管理员/ }).getByRole('button', { name: /确认\s*停用/ }).click()
    await expect(quizRow().getByText('已停用', { exact: true })).toBeVisible()

    await quizRow().getByRole('button', { name: '重新启用' }).click()
    await page.getByRole('dialog', { name: /重新启用管理员/ }).getByRole('button', { name: /确认\s*启用/ }).click()
    await expect(page.getByRole('dialog', { name: '一次性临时密码' }).getByText('enabled-one-time-value')).toBeVisible()

    expect(actions).toEqual(['edit', 'unlock', 'password-reset', 'disable', 'enable'])
    expect(reauthCalls).toBe(1)
    expect(reauthHeaders).toEqual(Array(5).fill('shared-reauth-token'))
  })

  test('题库管理员只显示题库菜单，越权直达显示 403 且不调用业务接口', async ({ page }) => {
    await authenticate(page, {
      admin: quizAdmin,
      permissions: ['quiz:list', 'quiz:write', 'quiz:import'],
    })
    let usersApiCalled = false
    await page.route(/\/admin\/quiz\/libraries(?:\?.*)?$/, async (route) => {
      if (route.request().isNavigationRequest()) await route.continue()
      else await json(route, [])
    })
    await page.route(/\/admin\/users(?:\?.*)?$/, async (route) => {
      if (route.request().isNavigationRequest()) await route.continue()
      else {
        usersApiCalled = true
        await json(route, { items: [], total: 0, page: 1, page_size: 20 })
      }
    })

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/quiz\/questions$/)
    const menu = page.locator('.ant-menu')
    await expect(menu.getByText('题库管理', { exact: true })).toBeVisible()
    await expect(menu.getByText('系统管理', { exact: true })).toHaveCount(0)
    await expect(menu.getByText('用户管理', { exact: true })).toHaveCount(0)
    await expect(page.getByText('题库运营', { exact: true })).toBeVisible()
    await expect(page.getByText('题库管理员', { exact: true })).toBeVisible()

    await page.goto('/admin/users')
    await expect(page.getByText('无权访问')).toBeVisible()
    expect(usersApiCalled).toBe(false)
  })

  test('受限会话无法绕过首次改密，成功后清空会话并返回登录页', async ({ page }) => {
    await authenticate(page, {
      admin: quizAdmin,
      permissions: [],
      restricted: true,
    })
    let usersApiCalled = false
    let changePasswordBody: unknown
    await page.route(/\/admin\/users(?:\?.*)?$/, async (route) => {
      if (route.request().isNavigationRequest()) await route.continue()
      else {
        usersApiCalled = true
        await json(route, { items: [], total: 0, page: 1, page_size: 20 })
      }
    })
    await page.route('**/admin/auth/change-password', async (route) => {
      changePasswordBody = route.request().postDataJSON()
      await json(route, null)
    })

    await page.goto('/admin/users')
    await expect(page).toHaveURL('/admin/change-password')
    await expect(page.getByText('当前使用的是一次性临时密码')).toBeVisible()
    await expect(page.locator('.ant-menu')).toHaveCount(0)
    expect(usersApiCalled).toBe(false)

    await page.getByLabel('当前临时密码').fill('temporary-current-value')
    await page.getByPlaceholder('输入新密码', { exact: true }).fill('secure-new-value-2026')
    await page.getByPlaceholder('再次输入新密码', { exact: true }).fill('secure-new-value-2026')
    await page.getByRole('button', { name: /确认\s*修改/ }).click()

    await expect(page).toHaveURL('/admin/login')
    expect(changePasswordBody).toEqual({
      current_password: 'temporary-current-value',
      new_password: 'secure-new-value-2026',
      confirm_password: 'secure-new-value-2026',
    })
    expect(await page.evaluate(() => sessionStorage.getItem('admin_token'))).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull()
  })

  test('正常会话可从顶部账号菜单修改本人密码并使本地会话失效', async ({ page }) => {
    await authenticate(page)
    let changePasswordBody: unknown
    await page.route('**/admin/auth/change-password', async (route) => {
      changePasswordBody = route.request().postDataJSON()
      await json(route, null)
    })

    await page.goto('/admin/dashboard')
    await page.getByRole('banner').getByText('系统管理员', { exact: true }).click()
    await page.getByRole('menuitem', { name: /修改密码/ }).click()
    await expect(page).toHaveURL('/admin/change-password')
    await expect(page.getByText('修改成功后，该账号的全部现有会话都会失效，需要重新登录。')).toBeVisible()

    await page.getByPlaceholder('输入当前密码', { exact: true }).fill('current-password-value')
    await page.getByPlaceholder('输入新密码', { exact: true }).fill('next-secure-value-2026')
    await page.getByPlaceholder('再次输入新密码', { exact: true }).fill('next-secure-value-2026')
    await page.getByRole('button', { name: /确认\s*修改/ }).click()

    await expect(page).toHaveURL('/admin/login')
    expect(changePasswordBody).toEqual({
      current_password: 'current-password-value',
      new_password: 'next-secure-value-2026',
      confirm_password: 'next-secure-value-2026',
    })
    expect(await page.evaluate(() => sessionStorage.getItem('admin_token'))).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull()
  })

  test('服务端未确认退出时仍清除本地凭据并明确告警', async ({ page }) => {
    await authenticate(page)
    await page.route('**/admin/auth/logout', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 50000, message: '会话撤销暂时不可用' }),
      })
    })

    await page.goto('/admin/dashboard')
    await page.getByRole('banner').getByText('系统管理员', { exact: true }).click()
    await page.getByRole('menuitem', { name: /退出登录/ }).click()

    await expect(page).toHaveURL('/admin/login')
    await expect(page.getByText(/服务端未确认会话撤销.*本地登录信息已清除/)).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('admin_token'))).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull()
  })

  test('再认证返回 401 时按会话失效处理并清除本地凭据', async ({ page }) => {
    await authenticate(page)
    await page.route(/\/admin\/settings\/admins(?:\?.*)?$/, async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.continue()
        return
      }
      await json(route, { items: [superAdmin], total: 1, page: 1, page_size: 20 })
    })
    await page.route('**/admin/auth/reauth', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40100, message: '登录状态已失效' }),
      })
    })

    await page.goto('/admin/settings/admins')
    await page.getByRole('button', { name: '创建管理员' }).click()
    const createDialog = page.getByRole('dialog', { name: '创建管理员' })
    await createDialog.getByLabel('登录用户名').fill('quiz.new-admin')
    await createDialog.getByLabel('管理员显示名').fill('新题库管理员')
    await createDialog.getByRole('button', { name: /创\s*建/ }).click()
    const reauthDialog = page.getByRole('dialog', { name: '验证当前管理员身份' })
    await reauthDialog.getByLabel('当前密码').fill('stale-session-password')
    await reauthDialog.getByRole('button', { name: /验\s*证/ }).click()

    await expect(page).toHaveURL('/admin/login')
    expect(await page.evaluate(() => sessionStorage.getItem('admin_token'))).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull()
  })

  test('/me 无法确认权限时清除旧令牌，不使用缓存权限继续渲染', async ({ page }) => {
    await page.addInitScript((token) => sessionStorage.setItem('admin_token', token), TOKEN)
    await page.route('**/admin/auth/me', (route) => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ code: 50000, message: '服务器暂时不可用' }),
    }))

    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL('/admin/login')
    expect(await page.evaluate(() => sessionStorage.getItem('admin_token'))).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull()
  })

  test('安全审计只读展示并对摘要中的凭据字段做二次脱敏', async ({ page }) => {
    await authenticate(page)
    await page.route(/\/admin\/settings\/security-audit(?:\?.*)?$/, async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.continue()
        return
      }
      await json(route, {
        items: [{
          id: 91,
          action: 'admin_account.disable',
          result: 'succeeded',
          reason_code: null,
          actor_admin_id: 1,
          target_admin_id: 2,
          username: 'quiz.operator',
          request_id: 'request-security-91',
          source_ip: '100.64.0.3',
          user_agent: 'Playwright security audit client',
          summary: { changed_fields: ['is_active'], access_token: 'must-not-render' },
          created_at: now,
        }],
        total: 1,
        page: 1,
        page_size: 20,
      })
    })

    await page.goto('/admin/settings/security-audit')
    await expect(page.getByText('安全审计永久保留且仅供查询，不提供修改或删除能力。')).toBeVisible()
    await page.getByRole('button', { name: '查看' }).click()
    const drawer = page.getByRole('dialog', { name: '安全审计详情 #91' })
    await expect(drawer.getByText('[已脱敏]')).toBeVisible()
    await expect(drawer.getByText('must-not-render')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /删除/ })).toHaveCount(0)
  })
})
