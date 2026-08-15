import { test, expect } from '@playwright/test'

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

test.describe('认证流程', () => {
  test('无 token 重定向登录页', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL('/admin/login')
  })

  test('登录成功后进入看板', async ({ page }) => {
    await page.route('**/admin/auth/login', async (route) => {
      if (route.request().isNavigationRequest()) {
        await route.continue()
        return
      }
      expect(route.request().postDataJSON()).toEqual({ username: 'root.operator', password: 'test-password-value' })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'ok',
          data: {
            access_token: TOKEN,
            expires_in: 7200,
            admin: superAdmin,
            permissions: ['*'],
            session_mode: 'normal',
            must_change_password: false,
          },
        }),
      })
    })
    await page.route('**/admin/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'ok',
          data: {
            admin: superAdmin,
            permissions: ['*'],
            session_mode: 'normal',
            must_change_password: false,
          },
        }),
      })
    })
    await page.goto('/admin/login')
    await page.fill('input[placeholder="用户名"]', 'root.operator')
    await page.fill('input[placeholder="密码"]', 'test-password-value')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/admin/dashboard')
    expect(await page.evaluate(() => sessionStorage.getItem('admin_token'))).toBe(TOKEN)
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull()

    await page.reload()
    await expect(page).toHaveURL('/admin/dashboard')
  })

  test('启动时清理且不使用旧版 localStorage 令牌', async ({ page }) => {
    await page.addInitScript((token) => localStorage.setItem('admin_token', token), TOKEN)

    await page.goto('/admin/dashboard')

    await expect(page).toHaveURL('/admin/login')
    expect(await page.evaluate(() => localStorage.getItem('admin_token'))).toBeNull()
    expect(await page.evaluate(() => sessionStorage.getItem('admin_token'))).toBeNull()
  })

  test('过期 token 被踢回登录页', async ({ page }) => {
    // 注入过期 JWT（exp=1000000000，约 2001 年）
    await page.addInitScript(() => sessionStorage.setItem(
      'admin_token',
      'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjEwMDAwMDAwMDB9.xxx',
    ))
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL('/admin/login')
  })
})
