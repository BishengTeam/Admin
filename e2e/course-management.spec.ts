import { expect, test, type Page, type Route } from '@playwright/test'

const TOKEN = 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'
const now = '2026-08-17T15:00:00+08:00'

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

const quizAdmin = { ...superAdmin, id: 2, username: 'quiz.operator', display_name: '题库运营', role: 'quiz_admin' }

const course = {
  id: 12,
  title: '网络工程师在线课',
  category: '网络基础',
  description: '在线视频课程',
  cover_url: null,
  price: 0,
  teacher_name: '王老师',
  teacher_contact: null,
  free_preview_seconds: 300,
  status: 'published',
  bound_quiz_library_count: 0,
  enrollment_count: 8,
  created_at: now,
  updated_at: now,
}

const category = { id: 1, name: '网络基础', sort_order: 0, is_active: true, created_at: now, updated_at: now }

const library = {
  id: 11,
  library_code: 'QL00000011',
  name: '网络工程师题库',
  normalized_name: '网络工程师题库',
  description: '课程配套题库',
  cover_url: null,
  details: null,
  access_mode: 'course_entitlement',
  system_kind: 'none',
  migration_state: 'ready',
  status: 'published',
  v2_enabled: true,
  sort_order: 0,
  lock_version: 1,
  published_at: now,
  suspended_at: null,
  archived_at: null,
  deleted_at: null,
  restore_until: null,
  open_migration_issue_count: 0,
  module_count: 1,
  knowledge_point_count: 1,
  question_count: 1,
  created_at: now,
  updated_at: now,
}

const binding = {
  id: 31,
  course_id: course.id,
  library_id: library.id,
  library_name: library.name,
  library_code: library.library_code,
  status: 'active',
  lock_version: 2,
  created_at: now,
  updated_at: now,
}

const job = {
  id: 41,
  course_id: course.id,
  library_id: library.id,
  action: 'backfill',
  status: 'queued',
  batch_size: 500,
  total_count: 8,
  processed_count: 0,
  success_count: 0,
  failure_count: 0,
  retry_count: 0,
  last_error: null,
  started_at: null,
  finished_at: null,
  created_at: now,
  updated_at: now,
  failed_items: [],
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

async function authenticate(page: Page, admin = superAdmin, permissions: string[] = ['*']) {
  await page.addInitScript((token) => sessionStorage.setItem('admin_token', token), TOKEN)
  await page.route('**/admin/auth/me', route => json(route, {
    admin,
    permissions,
    session_mode: 'normal',
    must_change_password: false,
  }))
}

test.describe('课程管理', () => {
  test('超级管理员完成课程题库绑定影响预览和回补确认', async ({ page }) => {
    await authenticate(page)
    let createBody: unknown

    await page.route(/\/admin\/courses(?:\?.*)?$/, async route => {
      const method = route.request().method()
      if (route.request().isNavigationRequest()) {
        await route.continue()
        return
      }
      if (method === 'GET') {
        await json(route, { items: [course], total: 1, page: 1, page_size: 20 })
        return
      }
      createBody = route.request().postDataJSON()
      await json(route, job)
    })
    await page.route('**/admin/courses/categories', route => json(route, [category]))
    await page.route('**/admin/courses/12/chapters**', route => json(route, { items: [], total: 0, page: 1, page_size: 100 }))
    await page.route('**/admin/courses/12/assets', route => json(route, []))
    await page.route('**/admin/courses/12/quiz-bindings**', async route => {
      if (route.request().method() === 'GET' && new URL(route.request().url()).searchParams.has('library_id')) {
        await json(route, {
          course_id: course.id,
          library_id: library.id,
          course_status: 'published',
          library_status: 'published',
          active_enrollment_count: 8,
          existing_entitlement_count: 0,
          candidates_to_backfill: 8,
          active_session_count: 2,
          other_active_source_count: 0,
          can_execute: true,
          blockers: [],
        })
        return
      }
      if (route.request().method() === 'POST') {
        createBody = route.request().postDataJSON()
        await json(route, job)
        return
      }
      await json(route, [])
    })
    await page.route('**/admin/courses/12/entitlement-jobs**', route => json(route, { items: [job], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/libraries**', route => json(route, [library]))
    await page.route('**/admin/courses/audit-logs**', route => json(route, { items: [], total: 0, page: 1, page_size: 20 }))
    await page.route('**/admin/courses/enrollments**', route => json(route, { items: [], total: 0, page: 1, page_size: 20 }))

    await page.goto('/admin/courses')
    await expect(page.getByRole('heading', { name: '课程管理' })).toBeVisible()
    await expect(page.getByRole('row', { name: /网络工程师在线课/ })).toBeVisible()
    await page.getByRole('button', { name: /^管理/ }).click()
    await page.getByRole('tab', { name: '赠送题库' }).click()
    await page.locator('.ant-drawer-body .ant-select').first().click()
    await page
      .locator('.ant-select-dropdown .ant-select-item-option')
      .filter({ hasText: library.name })
      .click()
    await page.getByRole('button', { name: '影响预览' }).click()
    await expect(page.getByText('待回铺').or(page.getByText('待回补'))).toBeVisible()
    await page.getByRole('button', { name: /确认绑定/ }).click()
    await page.getByRole('button', { name: /确\s*定/ }).click()
    await expect(page.getByText('绑定已创建，回补任务已排队')).toBeVisible()
    expect(createBody).toEqual({
      library_id: library.id,
      backfill_confirmations: ['impact_confirmed'],
    })
  })

  test('题库管理员不能进入课程管理菜单或直达课程工作台', async ({ page }) => {
    await authenticate(page, quizAdmin, ['quiz:list', 'course_quiz_bind'])
    await page.goto('/admin/courses')
    await expect(page.getByText('无权访问')).toBeVisible()
    await expect(page.getByRole('heading', { name: '课程管理' })).toHaveCount(0)
  })
})
