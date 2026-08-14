import { expect, test, type Page, type Route } from '@playwright/test'

const TOKEN = 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'
const now = '2026-08-12T15:00:00+08:00'
const future = '2099-08-19T15:00:00+08:00'

const category = {
  id: 1,
  name: '网络基础',
  normalized_name: '网络基础',
  parent_id: null,
  depth: 1,
  description: null,
  status: 'active',
  sort_order: 0,
  ever_had_question: true,
  lock_version: 1,
  created_by: 1,
  updated_by: 1,
  created_at: now,
  updated_at: now,
}

const library = {
  id: 11,
  library_code: 'QL00000011',
  name: '网络工程师题库',
  normalized_name: '网络工程师题库',
  description: '课程配套题库',
  cover_url: 'https://example.invalid/quiz.png',
  details: null,
  access_mode: 'course_entitlement',
  system_kind: 'none',
  migration_state: 'ready',
  status: 'published',
  v2_enabled: true,
  sort_order: 0,
  lock_version: 3,
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

const knowledgePoint = {
  id: 31,
  library_id: 11,
  module_id: 21,
  name: 'HTTP 协议',
  normalized_name: 'HTTP 协议',
  description: null,
  status: 'active',
  system_kind: 'none',
  sort_order: 0,
  lock_version: 1,
  question_count: 1,
  disabled_at: null,
  deleted_at: null,
  restore_until: null,
  created_at: now,
  updated_at: now,
}

const moduleNode = {
  id: 21,
  library_id: 11,
  name: '网络基础',
  normalized_name: '网络基础',
  description: null,
  status: 'active',
  system_kind: 'none',
  sort_order: 0,
  lock_version: 1,
  question_count: 1,
  disabled_at: null,
  deleted_at: null,
  restore_until: null,
  knowledge_points: [knowledgePoint],
  created_at: now,
  updated_at: now,
}

const question = {
  id: 101,
  category_id: null,
  library_id: 11,
  knowledge_point_id: 31,
  question_type: 'single_choice',
  status: 'draft',
  question_text: 'HTTP 默认使用哪个端口？',
  normalized_question_text: 'HTTP 默认使用哪个端口？',
  options: { A: '80', B: '443', C: '22' },
  correct_answer: 'A',
  explanation: 'HTTP 默认端口是 80。',
  ever_published: false,
  published_at: null,
  disabled_at: null,
  deleted_at: null,
  restore_until: null,
  current_revision_id: null,
  current_revision_no: null,
  pending_revision_id: 401,
  pending_revision_no: 1,
  has_pending_revision: true,
  lock_version: 1,
  created_by: 1,
  updated_by: 1,
  created_at: now,
  updated_at: now,
}

const failedImport = {
  id: 51,
  admin_id: 1,
  library_id: 11,
  source_type: 'csv',
  status: 'failed',
  source_size_bytes: 1024,
  total_rows: 2,
  validated_rows: 0,
  created_count: 0,
  error_count: 1,
  heartbeat_at: now,
  started_at: now,
  finished_at: now,
  retry_count: 1,
  error_message: '后台处理失败',
  report_available: true,
  lock_version: 2,
  validation_version: 1,
  impact_version: null,
  missing_category_count: 0,
  affected_question_count: 0,
  confirmed_by: null,
  confirmed_at: null,
  execution_protected_until: null,
  expires_at: future,
  created_at: now,
  updated_at: now,
}

const awaitingImport = {
  ...failedImport,
  id: 53,
  source_type: 'json',
  status: 'awaiting_category_confirmation',
  total_rows: 2,
  validated_rows: 2,
  error_count: 0,
  error_message: null,
  report_available: false,
  missing_category_count: 2,
  affected_question_count: 2,
  impact_version: 'a'.repeat(64),
}

function envelope(data: object | object[] | null) {
  return { code: 0, message: 'ok', data }
}

async function json(route: Route, data: object | object[] | null) {
  // 页面路由和 API 路由同名（例如 /admin/quiz/categories）。
  // Playwright 的 glob 会同时命中 document 导航，必须先放行页面 HTML，
  // 只对随后发出的 XHR/fetch 请求返回契约数据。
  if (route.request().isNavigationRequest()) {
    await route.continue()
    return
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(data)) })
}

async function authenticate(page: Page, permissions = [
  'quiz:list',
  'quiz:write',
  'quiz:import',
  'quiz_library_manage',
  'quiz_content_edit',
  'quiz_content_publish',
  'course_quiz_bind',
]) {
  await page.addInitScript((token) => localStorage.setItem('admin_token', token), TOKEN)
  await page.route('**/admin/auth/me', (route) => json(route, {
    admin: { id: 1, username: 'quiz-admin', role: 'admin' },
    permissions,
  }))
}

async function mockCategories(page: Page) {
  await page.route('**/admin/quiz/categories', (route) => json(route, [category]))
}

async function mockLibraries(page: Page, items = [library]) {
  await page.route(/\/admin\/quiz\/libraries(?:\?.*)?$/, (route) => json(route, items))
}

async function mockV2Workbench(page: Page, questions: object[] = [question]) {
  await mockLibraries(page)
  await page.route('**/admin/quiz/libraries/11/content-tree', (route) => json(route, {
    library_id: 11,
    modules: [moduleNode],
  }))
  await page.route('**/admin/quiz/questions?*', (route) => json(route, {
    items: questions,
    total: questions.length,
    page: 1,
    page_size: 20,
  }))
}

test.describe('题库五页面新版契约冒烟', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page)
  })

  test('缺少页面权限时统一显示 403 且不调用业务接口', async ({ page }) => {
    await page.unroute('**/admin/auth/me')
    await authenticate(page, [])
    let businessCalled = false
    await page.route('**/admin/quiz/categories', async (route) => {
      if (route.request().isNavigationRequest()) await route.continue()
      else {
        businessCalled = true
        await json(route, [])
      }
    })

    await page.goto('/admin/quiz/categories')
    await expect(page.getByText('无权访问')).toBeVisible()
    expect(businessCalled).toBe(false)
  })

  test('题库生命周期展示高风险告警并支持课程绑定状态切换', async ({ page }) => {
    let currentLibrary: Record<string, unknown> = { ...library }
    const lifecycleBodies: object[] = []
    let bindingStatusBody: object | null = null
    await page.route(/\/admin\/quiz\/libraries(?:\?.*)?$/, (route) => json(route, [currentLibrary]))
    await page.route('**/admin/quiz/libraries/11/course-bindings', (route) => json(route, [{
      id: 71,
      course_id: 81,
      library_id: 11,
      status: 'active',
      lock_version: 1,
      created_by: 1,
      updated_by: 1,
      created_at: now,
      updated_at: now,
    }]))
    await page.route('**/admin/courses?*', (route) => json(route, {
      items: [{
        id: 81,
        title: '网络工程师课程',
        category: 'network',
        cover_url: null,
        description: null,
        video_url: null,
        price: 100,
        is_active: true,
        teacher_name: '讲师',
        teacher_contact: '',
        created_at: now,
        batches: null,
      }],
      total: 1,
      page: 1,
      page_size: 100,
    }))
    await page.route('**/admin/quiz/course-bindings/71/status', async (route) => {
      bindingStatusBody = route.request().postDataJSON()
      await json(route, {
        id: 71,
        course_id: 81,
        library_id: 11,
        status: 'inactive',
        lock_version: 2,
        created_by: 1,
        updated_by: 1,
        created_at: now,
        updated_at: now,
      })
    })
    await page.route('**/admin/quiz/libraries/11/lifecycle', async (route) => {
      const body = route.request().postDataJSON() as { action: string; lock_version: number }
      lifecycleBodies.push(body)
      const nextVersion = Number(currentLibrary.lock_version) + 1
      if (body.action === 'suspend') currentLibrary = { ...currentLibrary, status: 'suspended', v2_enabled: false, suspended_at: now, lock_version: nextVersion }
      else if (body.action === 'restore') currentLibrary = { ...currentLibrary, status: 'published', v2_enabled: false, suspended_at: null, lock_version: nextVersion }
      else if (body.action === 'archive') currentLibrary = { ...currentLibrary, status: 'archived', v2_enabled: false, archived_at: now, lock_version: nextVersion }
      else if (body.action === 'delete') currentLibrary = { ...currentLibrary, status: 'deleted', deleted_at: now, restore_until: future, lock_version: nextVersion }
      else if (body.action === 'undo_delete') currentLibrary = { ...currentLibrary, status: 'archived', deleted_at: null, restore_until: null, lock_version: nextVersion }
      await json(route, currentLibrary)
    })

    await page.goto('/admin/quiz/libraries')
    await page.getByRole('button', { name: '课程绑定' }).click()
    const bindingDrawer = page.getByRole('dialog', { name: '课程绑定 · 网络工程师题库' })
    await expect(bindingDrawer.getByText('绑定只影响课程购买完成后的题库权益发放')).toBeVisible()
    await expect(bindingDrawer.getByText('网络工程师课程 (#81)')).toBeVisible()
    await bindingDrawer.getByRole('button', { name: '停用' }).click()
    await expect.poll(() => bindingStatusBody).toEqual({ status: 'inactive', lock_version: 1 })
    await expect(bindingDrawer.getByText('停用', { exact: true })).toBeVisible()
    await bindingDrawer.getByRole('button', { name: '关闭' }).click()

    await page.getByRole('button', { name: '停用' }).click()
    await expect(page.getByText('已开始会话保留快照并进入暂停语义。')).toBeVisible()
    await page.getByRole('button', { name: '确认停用' }).click()
    await expect(page.getByText('已停用', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '恢复' }).click()
    await expect(page.getByText('不会自动重新开启 V2 用户入口')).toBeVisible()
    await page.getByRole('button', { name: '确认恢复' }).click()
    await page.getByRole('button', { name: '归档' }).click()
    await expect(page.getByText('归档是不可恢复的业务终态')).toBeVisible()
    await page.getByRole('button', { name: '确认归档' }).click()
    await page.getByRole('button', { name: '删除' }).click()
    await expect(page.getByText(/删除后保留 7 天撤销期/)).toBeVisible()
    await page.getByRole('button', { name: '确认删除' }).click()
    await page.getByRole('button', { name: '撤销删除' }).click()
    await expect(page.getByText('不会重新发布或开放给用户')).toBeVisible()
    await page.getByRole('button', { name: '撤销删除' }).last().click()
    await expect.poll(() => lifecycleBodies).toEqual([
      { action: 'suspend', lock_version: 3 },
      { action: 'restore', lock_version: 4 },
      { action: 'archive', lock_version: 5 },
      { action: 'delete', lock_version: 6 },
      { action: 'undo_delete', lock_version: 7 },
    ])
    await expect(page.getByText('已归档', { exact: true })).toBeVisible()
  })

  test('旧题库可查看迁移问题并按当前归类结果重新检查', async ({ page }) => {
    let currentLibrary: Record<string, unknown> = {
      ...library,
      status: 'draft',
      published_at: null,
      v2_enabled: false,
      migration_state: 'needs_organization',
      open_migration_issue_count: 1,
    }
    let issues: object[] = [{
      id: 91,
      library_id: 11,
      severity: 'blocking',
      status: 'open',
      issue_code: 'question_attached_to_module',
      legacy_object_type: 'question',
      legacy_id: 101,
      original_path: [{ id: 1, name: '网络' }, { id: 2, name: '基础' }],
      resolution: '已迁入系统未分类知识点，请人工归类',
      resolved_at: null,
      created_at: now,
    }]
    let lifecycleBody: object | null = null
    await page.route(/\/admin\/quiz\/libraries(?:\?.*)?$/, (route) => json(route, [currentLibrary]))
    await page.route('**/admin/quiz/migration-report', (route) => json(route, {
      generated_at: now,
      library_count: 1,
      ready_library_count: issues.length ? 0 : 1,
      pending_library_count: issues.length ? 1 : 0,
      open_blocking_issue_count: issues.length,
      mapped_category_count: 2,
      mapped_question_count: 1,
      issues,
    }))
    await page.route('**/admin/quiz/libraries/11/lifecycle', async (route) => {
      lifecycleBody = route.request().postDataJSON()
      issues = []
      currentLibrary = {
        ...currentLibrary,
        migration_state: 'ready',
        open_migration_issue_count: 0,
        lock_version: Number(currentLibrary.lock_version) + 1,
      }
      await json(route, currentLibrary)
    })

    await page.goto('/admin/quiz/libraries')
    await page.getByRole('button', { name: '1 项' }).click()
    const drawer = page.getByRole('dialog', { name: '迁移问题 · 网络工程师题库' })
    await expect(drawer.getByText('题目 #101')).toBeVisible()
    await expect(drawer.getByText('网络 / 基础')).toBeVisible()
    await expect(drawer.getByText('题目原来直接挂在二级分类')).toBeVisible()
    await drawer.getByRole('button', { name: '重新检查' }).click()
    await expect(page.getByText('不会修改题目内容')).toBeVisible()
    await page.getByRole('button', { name: '开始检查' }).click()
    await expect.poll(() => lifecycleBody).toEqual({ action: 'reconcile_migration', lock_version: 3 })
    await expect(drawer.getByText('当前没有未处理迁移问题')).toBeVisible()
  })

  test('发布待发布修订只切换未来会话并展示不可变修订历史', async ({ page }) => {
    let currentQuestion: Record<string, unknown> = {
      ...question,
      status: 'published',
      ever_published: true,
      published_at: now,
      current_revision_id: 400,
      current_revision_no: 1,
      pending_revision_id: 401,
      pending_revision_no: 2,
      has_pending_revision: true,
      lock_version: 5,
    }
    let revisions: object[] = [{
      id: 401,
      question_id: 101,
      revision_no: 2,
      status: 'draft',
      question_type: 'single_choice',
      question_text: question.question_text,
      normalized_question_text: question.normalized_question_text,
      options: question.options,
      correct_answer: question.correct_answer,
      explanation: '第二版解析',
      published_at: null,
      created_by: 1,
      created_at: now,
    }, {
      id: 400,
      question_id: 101,
      revision_no: 1,
      status: 'published',
      question_type: 'single_choice',
      question_text: question.question_text,
      normalized_question_text: question.normalized_question_text,
      options: question.options,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      published_at: now,
      created_by: 1,
      created_at: now,
    }]
    let publishBody: object | null = null
    await mockLibraries(page)
    await page.route('**/admin/quiz/libraries/11/content-tree', (route) => json(route, { library_id: 11, modules: [moduleNode] }))
    await page.route(/\/admin\/quiz\/questions(?:\?.*)?$/, (route) => json(route, { items: [currentQuestion], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/questions/101/revisions', (route) => json(route, revisions))
    await page.route('**/admin/quiz/questions/101/publish', async (route) => {
      publishBody = route.request().postDataJSON()
      currentQuestion = {
        ...currentQuestion,
        current_revision_id: 401,
        current_revision_no: 2,
        pending_revision_id: null,
        pending_revision_no: null,
        has_pending_revision: false,
        lock_version: 6,
      }
      revisions = [
        { ...revisions[0], status: 'published', published_at: now },
        { ...revisions[1], status: 'superseded' },
      ]
      await json(route, currentQuestion)
    })

    await page.goto('/admin/quiz/questions?library_id=11')
    await page.getByText(question.question_text, { exact: true }).click()
    const firstDrawer = page.getByRole('dialog', { name: '题目 #101 · 修订历史' })
    await expect(firstDrawer.getByRole('cell', { name: 'v2', exact: true }).first()).toBeVisible()
    await expect(firstDrawer.getByText('draft', { exact: true })).toBeVisible()
    await expect(firstDrawer.getByText('published', { exact: true })).toBeVisible()
    await firstDrawer.getByRole('button', { name: '关闭' }).click()

    await page.getByRole('button', { name: '发布修订' }).click()
    const confirm = page.getByRole('dialog', { name: '发布题目修订？' })
    await expect(confirm.getByText(/仅切换未来会话使用的修订.*历史快照保持原版本/)).toBeVisible()
    await confirm.getByRole('button', { name: '确认执行' }).click()
    await expect.poll(() => publishBody).toEqual({ lock_version: 5 })
    await expect(page.getByText('线上 v2')).toBeVisible()
    await expect(page.getByText('待发布 v2')).toHaveCount(0)
    await page.getByText(question.question_text, { exact: true }).click()
    const secondDrawer = page.getByRole('dialog', { name: '题目 #101 · 修订历史' })
    await expect(secondDrawer.getByText('published', { exact: true })).toBeVisible()
    await expect(secondDrawer.getByText('superseded', { exact: true })).toBeVisible()
  })

  test('旧分类路由重定向到 V2 工作台且左树管理固定模块和知识点', async ({ page }) => {
    await mockV2Workbench(page)

    await page.goto('/admin/quiz/categories')
    await expect(page).toHaveURL(/\/admin\/quiz\/questions\?library_id=11$/)
    await expect(page.getByText('固定层级：题库 → 模块 → 知识点 → 题目')).toBeVisible()
    await expect(page.getByRole('tree').getByText('网络基础', { exact: true })).toBeVisible()
    await expect(page.getByRole('tree').getByText('HTTP 协议', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '为模块网络基础新增知识点' })).toBeVisible()
    await expect(page.getByRole('button', { name: '编辑模块网络基础' })).toBeVisible()
    await page.getByRole('button', { name: '停用模块网络基础' }).click()
    await expect(page.getByText('模块停用后会从新题池隐藏，但不会覆盖既有会话和历史快照。')).toBeVisible()
  })

  test('题目页只批量处理当前页最多 100 个明确勾选项并二次确认', async ({ page }) => {
    await mockV2Workbench(page)
    await page.route('**/admin/quiz/questions/batch-publish', async (route) => {
      const body = route.request().postDataJSON() as { items: Array<{ question_id: number; lock_version: number }> }
      expect(body).toEqual({ items: [{ question_id: 101, lock_version: 1 }] })
      await json(route, { succeeded: true, updated_count: 1, errors: [] })
    })

    await page.goto('/admin/quiz/questions?library_id=11')
    await expect(page.getByText('HTTP 默认使用哪个端口？')).toBeVisible()
    await page.getByRole('checkbox').nth(1).check()
    await page.getByRole('button', { name: '批量发布修订 (1)' }).click()
    await expect(page.getByText(/最多 100 条.*任一失败则整批不变/)).toBeVisible()
    await page.getByRole('button', { name: '确认发布' }).click()
    await expect(page.getByText('删除选中草稿？')).toHaveCount(0)
  })

  test('整库或模块视图无需选择知识点即可进入导入任务', async ({ page }) => {
    await mockV2Workbench(page)

    await page.goto('/admin/quiz/questions?library_id=11')
    const importButton = page.getByRole('button', { name: '导入' })
    await expect(importButton).toBeEnabled()
    await expect(page.getByText('当前展示整库题目；新增单题仍需选择知识点，导入可直接选择当前题库。')).toBeVisible()
    await importButton.click()
    await expect(page).toHaveURL(/\/admin\/quiz\/imports\?library_id=11$/)
  })

  test('发布题库停用模块和题目时显示最后有效内容路径告警', async ({ page }) => {
    const publishedQuestion = {
      ...question,
      status: 'published',
      ever_published: true,
      published_at: now,
      current_revision_id: 400,
      current_revision_no: 1,
      pending_revision_id: null,
      pending_revision_no: null,
      has_pending_revision: false,
      lock_version: 4,
    }
    await mockV2Workbench(page, [publishedQuestion])

    await page.goto('/admin/quiz/questions?library_id=11')
    await page.getByRole('button', { name: '停用模块网络基础' }).click()
    const moduleConfirm = page.getByRole('dialog', { name: '停用模块「网络基础」？' })
    await expect(moduleConfirm.getByText('高风险：正在停用已发布题库的有效内容')).toBeVisible()
    await expect(moduleConfirm.getByText(/最后一条“模块 → 知识点 → 已发布题目”路径/)).toBeVisible()
    await moduleConfirm.getByRole('button', { name: '取 消' }).click()

    await page.getByRole('button', { name: '停用', exact: true }).click()
    const questionConfirm = page.getByRole('dialog', { name: '停用题目？' })
    await expect(questionConfirm.getByText('高风险：正在缩减已发布题库的有效题池')).toBeVisible()
    await expect(questionConfirm.getByText(/最后一道有效已发布题/)).toBeVisible()
  })

  test('选择模块或知识点时使用固定范围筛选并把状态写入 URL', async ({ page }) => {
    await mockLibraries(page)
    await page.route('**/admin/quiz/libraries/11/content-tree', (route) => json(route, { library_id: 11, modules: [moduleNode] }))
    let query = new URLSearchParams()
    await page.route('**/admin/quiz/questions?*', (route) => {
      query = new URL(route.request().url()).searchParams
      return json(route, { items: [question], total: 1, page: 1, page_size: 20 })
    })

    await page.goto('/admin/quiz/questions?library_id=11')
    await page.getByRole('tree').getByText('网络基础', { exact: true }).click()
    await expect.poll(() => query.get('module_id')).toBe('21')
    expect(query.get('knowledge_point_id')).toBeNull()
    await page.getByRole('tree').getByText('HTTP 协议', { exact: true }).click()
    await expect.poll(() => query.get('knowledge_point_id')).toBe('31')
    expect(query.get('module_id')).toBeNull()
    const statusFilter = page.getByRole('combobox', { name: '题目状态' })
    await statusFilter.press('ArrowDown')
    await statusFilter.press('Enter')
    await expect(page).toHaveURL(/status=draft/)
  })

  test('批量操作原子失败展示逐题错误且保留服务端列表状态', async ({ page }) => {
    await mockV2Workbench(page)
    await page.route('**/admin/quiz/questions/batch-publish', (route) => json(route, {
      succeeded: false,
      updated_count: 0,
      errors: [{ question_id: 101, code: 40200, field: 'explanation', message: '发布校验失败' }],
    }))

    await page.goto('/admin/quiz/questions?library_id=11')
    await page.getByRole('checkbox').nth(1).check()
    await page.getByRole('button', { name: '批量发布修订 (1)' }).click()
    await page.getByRole('button', { name: '确认发布' }).click()
    await expect(page.getByRole('dialog', { name: '批量操作未完成（整批未提交）' })).toBeVisible()
    await expect(page.getByText(/题目 #101：explanation：发布校验失败/)).toBeVisible()
    await expect(page.getByText('草稿', { exact: true })).toBeVisible()
  })

  test('批量操作遇到 409 时刷新版本且不静默重试', async ({ page }) => {
    await mockLibraries(page)
    await page.route('**/admin/quiz/libraries/11/content-tree', (route) => json(route, { library_id: 11, modules: [moduleNode] }))
    let listCalls = 0
    let publishCalls = 0
    await page.route('**/admin/quiz/questions?*', (route) => {
      listCalls += 1
      return json(route, {
        items: [{ ...question, lock_version: listCalls > 1 ? 2 : 1 }],
        total: 1,
        page: 1,
        page_size: 20,
      })
    })
    await page.route('**/admin/quiz/questions/batch-publish', async (route) => {
      publishCalls += 1
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40201, message: '版本冲突', data: null }),
      })
    })

    await page.goto('/admin/quiz/questions?library_id=11')
    await page.getByRole('checkbox').nth(1).check()
    await page.getByRole('button', { name: '批量发布修订 (1)' }).click()
    await page.getByRole('button', { name: '确认发布' }).click()
    await expect.poll(() => listCalls).toBeGreaterThan(1)
    expect(publishCalls).toBe(1)
    await expect(page.getByRole('cell', { name: '2', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '批量发布修订 (1)' })).toHaveCount(0)
  })

  test('429 限流响应不会重复提交写操作', async ({ page }) => {
    await mockV2Workbench(page)
    let publishCalls = 0
    await page.route('**/admin/quiz/questions?*', (route) => json(route, { items: [question], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/questions/batch-publish', async (route) => {
      publishCalls += 1
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40202, message: '操作过于频繁', data: null }),
      })
    })

    await page.goto('/admin/quiz/questions?library_id=11')
    await page.getByRole('checkbox').nth(1).check()
    await page.getByRole('button', { name: '批量发布修订 (1)' }).click()
    await page.getByRole('button', { name: '确认发布' }).click()
    await expect.poll(() => publishCalls).toBe(1)
    await expect(page.getByText('操作过于频繁')).toBeVisible()
    expect(publishCalls).toBe(1)
  })

  test('导入页在当前页面展示脱敏错误表并保留下载 JSON 和 failed 重试', async ({ page }) => {
    await mockLibraries(page)
    await page.route('**/admin/quiz/imports?*', (route) => json(route, { items: [failedImport], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/imports/51/errors?*', (route) => json(route, {
      items: [{ row: 2, question_index: 1, field: 'question_text', error_code: 'duplicate', message: '同一分类题干重复' }],
      total: 1,
      page: 1,
      page_size: 50,
      available_fields: ['question_text'],
      validation_version: 1,
    }))
    await page.route('**/admin/quiz/imports/51/retry', (route) => json(route, {
      ...failedImport,
      status: 'queued',
      retry_count: 2,
      finished_at: null,
      updated_at: '2026-08-12T15:01:00+08:00',
    }))

    await page.goto('/admin/quiz/imports')
    await expect(page.getByRole('link', { name: '下载 v2 模板' })).toHaveAttribute('href', '/templates/quiz-import-v2.csv')
    await expect(page.getByRole('button', { name: '源文件' })).toBeVisible()
    await page.getByRole('button', { name: '错误明细' }).click()
    await expect(page.getByText('错误详情已永久脱敏')).toBeVisible()
    await expect(page.getByRole('cell', { name: '第 2 行' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'question_text' })).toBeVisible()
    await expect(page.getByText('同一分类题干重复')).toBeVisible()
    await expect(page.getByRole('button', { name: '下载 JSON' })).toBeVisible()
    await page
      .getByRole('dialog', { name: '导入错误明细 #51' })
      .getByRole('button', { name: '关闭' })
      .click()
    await page.getByRole('button', { name: '重试' }).click()
    await page.getByRole('dialog', { name: '重试导入任务 #51？' }).getByRole('button', { name: /确\s*定/ }).click()
    await expect(page.getByText('排队中')).toBeVisible()
  })

  test('等待结构确认展示模块知识点树并携带双版本原子确认', async ({ page }) => {
    await mockLibraries(page)
    let confirmBody: object | null = null
    await page.route('**/admin/quiz/imports?*', (route) => json(route, { items: [awaitingImport], total: 1, page: 1, page_size: 20 }))
    await page.route('**/admin/quiz/imports/53', (route) => json(route, awaitingImport))
    await page.route('**/admin/quiz/imports/53/category-impact', (route) => json(route, {
      job_id: 53,
      status: 'awaiting_category_confirmation',
      tree: [{
        name: '网络工程', path: ['网络工程'], depth: 1, status: 'will_create', category_id: null,
        direct_question_count: 0, subtree_question_count: 2, blocking_reasons: [],
        children: [{
          name: '路由协议', path: ['网络工程', '路由协议'], depth: 2, status: 'will_create', category_id: null,
          direct_question_count: 2, subtree_question_count: 2, blocking_reasons: [], children: [],
        }],
      }],
      new_category_count: 2,
      reused_category_count: 0,
      affected_question_count: 2,
      blocking_reasons: [],
      lock_version: 2,
      impact_version: 'a'.repeat(64),
      calculated_at: now,
    }))
    await page.route('**/admin/quiz/imports/53/confirm-categories', async (route) => {
      confirmBody = route.request().postDataJSON()
      await json(route, { ...awaitingImport, status: 'queued', lock_version: 3, confirmed_by: 1, confirmed_at: now, execution_protected_until: future })
    })

    await page.goto('/admin/quiz/imports')
    await page.getByRole('button', { name: '结构影响' }).click()
    await expect(page.getByText('网络工程', { exact: true })).toBeVisible()
    await expect(page.getByText('路由协议', { exact: true })).toBeVisible()
    await expect(page.getByText('将新建', { exact: true })).toHaveCount(2)
    await page.getByRole('button', { name: '确认创建并导入' }).click()
    await page.getByRole('dialog', { name: /确认创建 2 个结构节点并导入 2 道题/ }).getByRole('button', { name: '确认创建并导入' }).click()
    await expect.poll(() => confirmBody).toEqual({ lock_version: 2, impact_version: 'a'.repeat(64) })
    await expect(page.getByText('排队中')).toBeVisible()
  })

  test('每次下载都重新申请短签，源文件过期后不显示入口', async ({ page }) => {
    await mockLibraries(page)
    let signedCalls = 0
    await page.route('**/admin/quiz/imports?*', (route) => json(route, {
      items: [failedImport, { ...failedImport, id: 52, expires_at: '2020-01-01T00:00:00+08:00' }],
      total: 2,
      page: 1,
      page_size: 20,
    }))
    await page.route('**/admin/quiz/imports/51/source-url', (route) => {
      signedCalls += 1
      return json(route, { url: `https://oss.example/source-${signedCalls}`, expires_at: future })
    })
    await page.route('https://oss.example/source-*', (route) => route.fulfill({
      status: 200,
      contentType: 'text/csv',
      headers: {
        'Content-Disposition': 'attachment; filename="quiz-import-51.csv"',
      },
      body: 'category_path,question_type,question_text,options,correct_answer,explanation\n',
    }))

    await page.goto('/admin/quiz/imports')
    const sourceButton = page.getByRole('button', { name: '源文件' })
    await expect(sourceButton).toHaveCount(1)
    const [firstDownload] = await Promise.all([
      page.waitForEvent('download'),
      sourceButton.click(),
    ])
    expect(firstDownload.suggestedFilename()).toBe('quiz-import-51.csv')
    await expect.poll(() => signedCalls).toBe(1)
    const [secondDownload] = await Promise.all([
      page.waitForEvent('download'),
      sourceButton.click(),
    ])
    expect(secondDownload.suggestedFilename()).toBe('quiz-import-51.csv')
    await expect.poll(() => signedCalls).toBe(2)
    await expect(page).toHaveURL(/\/admin\/quiz\/imports$/)
  })

  test('聚合统计页展示总览、水位、分页明细和一分钟延迟边界', async ({ page }) => {
    await mockLibraries(page)
    await page.route('**/admin/quiz/stats/overview', (route) => json(route, {
      calculated_at: now,
      aggregated_through: now,
      library_count: 1,
      draft_library_count: 0,
      published_library_count: 1,
      suspended_library_count: 0,
      archived_library_count: 0,
      module_count: 1,
      active_module_count: 1,
      disabled_module_count: 0,
      knowledge_point_count: 1,
      active_knowledge_point_count: 1,
      disabled_knowledge_point_count: 0,
      question_count: 1,
      draft_question_count: 1,
      published_question_count: 0,
      disabled_question_count: 0,
      practice_session_count: 8,
      practice_first_attempts: 20,
      practice_first_correct: 15,
      practice_first_accuracy: 75,
      completed_exam_count: 3,
      timed_out_exam_count: 1,
      exam_answers: 30,
      exam_correct: 24,
      exam_accuracy: 80,
    }))
    await page.route('**/admin/quiz/stats/questions?*', (route) => json(route, {
      items: [{
        question_id: 101,
        question_text: question.question_text,
        library_id: library.id,
        library_name: library.name,
        module_id: moduleNode.id,
        module_name: moduleNode.name,
        knowledge_point_id: knowledgePoint.id,
        knowledge_point_name: knowledgePoint.name,
        question_type: 'single_choice',
        status: 'draft',
        practice_first_attempts: 20,
        practice_first_correct: 15,
        practice_first_accuracy: 75,
        exam_answers: 30,
        exam_correct: 24,
        exam_accuracy: 80,
        aggregated_through: now,
      }],
      total: 1,
      page: 1,
      page_size: 20,
    }))

    await page.goto('/admin/quiz/stats')
    await expect(page.getByText('管理端统计最多延迟 1 分钟，不提供用户下钻或导出。')).toBeVisible()
    await expect(page.getByText('题库', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('模块', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('知识点', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('练习首答正确率')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '题库' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '模块' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '知识点' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '考试正确率' })).toBeVisible()
    await expect(page.getByText(question.question_text)).toBeVisible()
  })

  test('审计页提供请求 ID 和起止时间筛选且保持只读', async ({ page }) => {
    let auditedRequestId: string | null = null
    await page.route('**/admin/quiz/audit-logs?*', async (route) => {
      auditedRequestId = new URL(route.request().url()).searchParams.get('request_id')
      await json(route, {
        items: [{
          id: 91,
          actor_type: 'admin',
          admin_id: 1,
          permission: 'quiz:write',
          request_id: 'req-quiz-001',
          ip_address: '127.0.0.1',
          action: 'question.publish',
          object_type: 'question',
          object_id: 101,
          result: 'succeeded',
          changed_fields: { status: { before: 'draft', after: 'published' } },
          target_ids: [101],
          error_summary: null,
          created_at: now,
        }],
        total: 1,
        page: 1,
        page_size: 20,
      })
    })

    await page.goto('/admin/quiz/audit-logs')
    await expect(page.getByText('question.publish')).toBeVisible()
    await page.getByPlaceholder('请求 ID').fill('req-quiz-001')
    await page.getByRole('button', { name: '刷新' }).click()
    await expect.poll(() => auditedRequestId).toBe('req-quiz-001')
    await expect(page.getByRole('button', { name: /删除|编辑|导出/ })).toHaveCount(0)
  })
})
