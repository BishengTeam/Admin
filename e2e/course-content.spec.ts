import { test, expect } from '@playwright/test'

test('混合文件直接生成章节，单个失败重试不重复创建任务', async ({ page }) => {
  const stamp = '2026-11-03T00:00:00Z'
  const errors: string[] = [], created: string[] = []
  const tasks: Array<Record<string, any>> = [], chapters: Array<Record<string, any>> = []
  let failed = false
  page.on('pageerror', reason => errors.push(reason.message))
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  await page.route('**/*', async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue()
    const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status === 200 ? 0 : 50000, data, message: status === 200 ? 'ok' : '测试分片失败' }) })
    if (path === '/admin/auth/me') return reply({ admin: { id: 1, username: 'fixture', display_name: '课程管理员', role: 'super_admin', is_active: true,
      must_change_password: false, locked_until: null, last_login_at: null, created_at: stamp, updated_at: stamp }, permissions: ['*'], session_mode: 'normal', must_change_password: false })
    if (path === '/admin/courses/12') return reply({ id: 12, title: '混合课程', category: '网络', description: null, cover_url: null, price: 100, price_yuan: '1.00', status: 'draft', preview_chapter_count: 0 })
    if (path === '/admin/courses/categories') return reply([])
    if (path.endsWith('/quiz-bindings')) return reply([])
    if (path.endsWith('/chapters')) return reply({ items: chapters, total: chapters.length, page: 1, page_size: 100 })
    if (path === '/admin/course-uploads') {
      if (request.method() === 'GET') return reply(tasks.filter(task => task.status !== 'bound'))
      const body = request.postDataJSON(); const id = tasks.length + 1; created.push(body.filename)
      const task = { ...body, id, filename: body.filename, part_size: 1024, status: 'pending', parts: [], object_key: `file${id}`, oss_upload_id: String(id), expires_at: stamp }
      tasks.push(task); return reply(task)
    }
    const match = path.match(/^\/admin\/course-uploads\/(\d+)(?:\/(.*))?$/)
    if (match) {
      const task = tasks[Number(match[1]) - 1]
      if (!match[2]) return reply(task)
      if (match[2] === 'parts') return reply({ url: `http://localhost:3000/fixture-part/${task.id}`, expires_at: 9999999999 })
      if (match[2] === 'complete') {
        task.status = 'bound'; task.chapter_id = task.id
        chapters.push({ id: task.id, course_id: 12, title: task.filename.replace(/\.[^.]+$/, ''), original_filename: task.filename, resource_type: task.filename.endsWith('.pdf') ? 'document' : 'video',
          page_count: task.filename.endsWith('.pdf') ? 2 : null, duration: task.filename.endsWith('.pdf') ? null : 60, size_bytes: task.size_bytes, sort_order: task.id, resource_version: 1 })
        return reply({ upload: task, object_key: task.object_key })
      }
    }
    if (path.startsWith('/fixture-part/')) {
      if (path.endsWith('/2') && !failed) { failed = true; return route.fulfill({ status: 500, body: 'fixture failure' }) }
      return route.fulfill({ status: 200, body: '' })
    }
    return reply({}, 400)
  })
  await page.goto('/admin/courses/12')
  await page.getByRole('tab', { name: '课程内容', exact: true }).click()
  await expect(page.getByRole('tab', { name: /待确认|待完成/ })).toHaveCount(0)
  await page.locator('input[type=file][accept=".mp4,.mov,.mkv,.pdf"]').setInputFiles([
    { name: '基础知识.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf-fixture') },
    { name: '操作演示.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video-fixture') },
  ])
  await expect(page.getByText('共1章 · 视频0章 · 文档1章')).toBeVisible()
  await page.getByRole('button', { name: '重试／续传' }).click()
  await expect(page.getByText('共2章 · 视频1章 · 文档1章')).toBeVisible()
  expect(created).toEqual(['基础知识.pdf', '操作演示.mp4'])
  expect(errors).toEqual([])
  await page.screenshot({ path: 'test-results/course-content-desktop.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 768, height: 1000 })
  await expect(page.getByRole('button', { name: '上传文件' })).toBeVisible()
  await page.screenshot({ path: 'test-results/course-content-narrow.png', fullPage: true, animations: 'disabled' })
})
