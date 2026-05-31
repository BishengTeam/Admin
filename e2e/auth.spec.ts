import { test, expect } from '@playwright/test'

test.describe('认证流程', () => {
  test('无 token 重定向登录页', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL('/admin/login')
  })

  test('登录成功后进入看板', async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[placeholder="用户名"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/admin/dashboard')
  })

  test('过期 token 被踢回登录页', async ({ page }) => {
    // 注入过期 JWT（exp=1000000000，约 2001 年）
    await page.evaluate(() => {
      localStorage.setItem('admin_token', 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjEwMDAwMDAwMDB9.xxx')
    })
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL('/admin/login')
  })
})
