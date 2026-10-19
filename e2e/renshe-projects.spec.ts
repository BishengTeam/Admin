import { combinations } from '../tests/fixtures/rensheCombinations'
import { exportInstructions } from '../tests/fixtures/rensheExportInstructions'
import { expect, test, type Route, type Page } from '@playwright/test'

test('承诺书存储不可用时显示具体原因，上传可重试且没有未捕获异常', async ({ page }) => {
  await prepare(page, true)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const reason = '承诺书模板存储不可用，请联系管理员检查目录权限和持久化配置'
  await page.route('**/admin/cert-products/renshe/commitment-templates', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ code: 50410, message: reason, data: null }),
  }))
  await page.locator('input[type=file][accept=".pdf,.docx"]').setInputFiles({ name: '承诺书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
  await expect(page.getByText(reason, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '上传承诺书模板' })).toBeEnabled()
  await expect(page.getByText('服务器暂时不可用，请稍后重试', { exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('五级仅提供工龄型，上传承诺书后可保存并启用', async ({ page }) => {
  const payload = await prepare(page, false, false)
  await page.getByRole('button', { name: /新增项目/ }).click()
  await page.getByLabel('职业／工种').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^网络与信息安全管理员／信息安全管理员$/ }).click()
  await page.getByLabel('技能等级').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^五级／初级工$/ }).click()
  await page.getByLabel('申报类型').click()
  await expect(page.locator('.ant-select-item-option-content').filter({ hasText: /^工龄型$/ })).toBeVisible()
  await expect(page.locator('.ant-select-item-option-content').filter({ hasText: /无类型|学历型|复合型/ })).toHaveCount(0)
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^工龄型$/ }).click()
  await expect(page.getByText('年满16周岁，从事本职业或相关职业工作。', { exact: true })).toBeVisible()
  await expect(page.getByText('工龄证明（单位鲜章、编号、手写内容及经办人信息）', { exact: true })).toBeVisible()
  await expect(page.getByText('社保缴费证明（单位一致、验证码完整且有效）', { exact: true })).toBeVisible()
  await expect(page.getByText('工龄型须提供相关职业工作经历、工龄证明及社保证明；不设置最低工作年数，不要求前置证书或毕业学历材料', { exact: true })).toBeVisible()
  await expect(page.locator('pre')).toContainText('_工龄证明')
  await expect(page.locator('pre')).not.toContainText('_学历证明')
  await page.getByLabel('项目名称').fill('五级工龄型产品')
  await page.locator('input[type=file][accept=".pdf,.docx"]').setInputFiles({ name: '承诺书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
  await expect(page.getByRole('button', { name: '保存并启用' })).toBeEnabled()
  await page.screenshot({ path: 'test-results/renshe-five-employment.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '保存并启用' }).click()
  await expect.poll(() => payload()?.selection_id).toBe('information_security:5:工龄型')
  expect(payload()?.status).toBe('available')
})

for (const application of ['工龄型', '复合型', '学历型']) {
  test(`三级${application}展示独立路径与材料，上传承诺书后可启用`, async ({ page }) => {
    const payload = await prepare(page, false, false)
    await page.getByRole('button', { name: /新增项目/ }).click()
    await page.getByLabel('职业／工种').click()
    await page.locator('.ant-select-item-option-content').filter({ hasText: /^网络与信息安全管理员／信息安全管理员$/ }).click()
    await page.getByLabel('技能等级').click()
    await page.locator('.ant-select-item-option-content').filter({ hasText: /^三级／高级工$/ }).click()
    await page.getByLabel('申报类型').click()
    await page.locator('.ant-select-item-option-content').filter({ hasText: new RegExp(`^${application}$`) }).click()
    const chosen = combinations.find(item => item.selection_id === `information_security:3:${application}`)!
    for (const condition of chosen.source_conditions) await expect(page.getByText(condition, { exact: true })).toBeVisible()
    if (application === '复合型') await expect(page.getByText('初级职称证书及网查截图（合并为同一份JPEG材料）', { exact: true })).toBeVisible()
    await page.getByLabel('项目名称').fill(`三级${application}产品`)
    await page.locator('input[type=file][accept=".pdf,.docx"]').setInputFiles({ name: '承诺书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
    await expect(page.getByRole('button', { name: '保存并启用' })).toBeEnabled()
    await page.getByRole('button', { name: '保存并启用' }).click()
    await expect.poll(() => payload()?.selection_id).toBe(chosen.selection_id)
    expect(payload()?.status).toBe('available')
  })
}

for (const application of ['工龄型', '复合型']) {
  test(`四级${application}按选择展示材料与导出目录，上传承诺书后可启用`, async ({ page }) => {
    const payload = await prepare(page, false, false)
    await page.getByRole('button', { name: /新增项目/ }).click()
    await page.getByLabel('职业／工种').click()
    await page.locator('.ant-select-item-option-content').filter({ hasText: /^企业人力资源管理师$/ }).click()
    await page.getByLabel('技能等级').click()
    await page.locator('.ant-select-item-option-content').filter({ hasText: /^四级／中级工$/ }).click()
    await page.getByLabel('申报类型').click()
    await page.locator('.ant-select-item-option-content').filter({ hasText: `${application}` }).click()
    await page.getByLabel('项目名称').fill(`人力资源四级${application}`)
    await expect(page.getByText('工龄证明（单位鲜章、编号、手写内容及经办人信息）', { exact: true })).toBeVisible()
    await expect(page.locator('pre')).toContainText('_工龄证明')
    await expect(page.locator('pre')).not.toContainText('_毕业证')
    if (application === '复合型') {
      await expect(page.getByText('职业资格证书及网查截图（合并为同一份JPEG材料）', { exact: true })).toBeVisible()
      await expect(page.locator('pre')).toContainText('_职业资格证书.jpeg')
    }
    await expect(page.getByRole('button', { name: '保存并启用' })).toBeDisabled()
    await page.locator('input[type=file][accept=".pdf,.docx"]').setInputFiles({ name: '甲方承诺书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
    await expect(page.getByRole('button', { name: '保存并启用' })).toBeEnabled()
    await page.screenshot({ path: `test-results/renshe-${application}.png`, fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: '保存并启用' }).click()
    await expect.poll(() => payload()?.selection_id).toBe(`human_resources:4:${application}`)
    expect(payload()?.status).toBe('available')
    expect(payload()).not.toHaveProperty('config')
  })
}

const config = {
  occupation_name: '信息安全管理员', occupation_code: '4-04-04-02', skill_level: '中级工', export_skill_level: '四级',
  exam_types: ['新考'], application_types: ['学历型'], qualification_rule: 'related_major_current_graduating_student',
  education_levels: ['associate', 'bachelor'], form_fields: ['contact_phone', 'mailing_address', 'email'],
  materials: [
    { kind: 'id_card_front', name: '身份证正面', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
    { kind: 'id_card_back', name: '身份证背面', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
    { kind: 'portrait', name: '二寸免冠照片', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
    { kind: 'student_card', name: '学生证', required: true, extensions: ['.jpg', '.jpeg'], max_count: 1 },
    { kind: 'xuexin_registration', name: '学信网电子注册表', required: true, extensions: ['.pdf'], max_count: 1 },
    { kind: 'education_proof', name: '学历证明', required: false, extensions: ['.jpg', '.jpeg'], max_count: 1 },
  ],
  export_template: 'renshe_registration_v1', field_mapping: {}, attachment_layout: 'by_candidate',
}
const project = { id: 1, code: 'RS-SYSTEM-ONLY', chinese_name: '信息安全管理员（中级工）', description: '面向相关专业在读应届学生，具体资格由审核人员核实。', home_cover_url: null, status: 'available', config_id: 10, version: 1, config, validation_errors: [], batch_count: 2 }

const template = { filename: `commitment_${'a'.repeat(64)}.pdf`, original_filename: '甲方承诺书.pdf', sha256: 'a'.repeat(64) }
const graduatedConfig = { ...config, qualification_rule: 'related_major_graduated_degree_v1', institution_types: ['technical', 'vocational', 'general_higher'], reporting_policy: { contract_version: 2 }, commitment_template: null,
  materials: Object.entries({ id_card_front: '身份证正面', id_card_back: '身份证背面', portrait: '二寸免冠照片', social_security_proof: '社保缴费证明', xuexin_registration: '学信网电子注册表', education_proof: '学历证明', vocational_qualification_certificate: '职业资格证书', professional_title_certificate: '职称证书', commitment_letter: '承诺书' }).map(([kind, name]) => ({ kind, name, required: true, extensions: ['social_security_proof', 'xuexin_registration', 'commitment_letter'].includes(kind) ? ['.pdf'] : ['.jpg', '.jpeg'], max_count: 1 })),
}
const admissionRequirements = {
  scope: {
    occupation_name: '信息安全管理员', occupation_code: '4-04-04-02-网络与信息安全管理员-信息安全管理员-中级工', skill_level: '中级工', export_skill_level: '四级',
    application_types: ['学历型'], exam_types: ['新考'], qualification_rule: 'related_major_graduated_degree_v1',
  },
  form_sections: ['本人实名信息', '毕业学历信息', '联系信息', '报送模板要求的其他实际信息'],
  education_options: [
    { value: 'secondary_vocational', label: '中专' }, { value: 'technical_school', label: '技校' }, { value: 'vocational_high', label: '职高' },
    { value: 'higher_vocational', label: '高职' }, { value: 'associate', label: '大专' }, { value: 'bachelor', label: '大学本科' },
    { value: 'master', label: '硕士' }, { value: 'doctorate', label: '博士' },
  ],
  institution_types: [
    { value: 'technical', label: '技工院校' }, { value: 'vocational', label: '中等及以上职业院校' }, { value: 'general_higher', label: '普通高等学校（专科及以上）' },
  ],
  materials: graduatedConfig.materials.map(item => ({ ...item, max_size_bytes: 10 * 1024 * 1024 })),
  notes: ['文化程度选项全部展示，用于考生如实填报；是否符合本期资格仍由毕业证、院校类型、专业和初审共同判断。'],
}

async function prepare(page: Page, graduated = false, openEditor = true, unreferencedDraft = false) {
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  let payload: Record<string, any> | undefined
  const reply = (route: Route, data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data, message: 'ok' }) })
  await page.route('**/admin/auth/me', route => reply(route, { admin: { id: 1, username: 'test', display_name: '测试管理员', role: 'super_admin', is_active: true, must_change_password: false, locked_until: null, last_login_at: null, created_at: '2026-10-15T00:00:00Z', updated_at: '2026-10-15T00:00:00Z' }, permissions: ['*'], session_mode: 'normal', must_change_password: false }))
  await page.route('**/admin/cert-products/renshe/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/project-capabilities')) return reply(route, { default_config: graduatedConfig, combinations, supported_programs: [{ occupation_name: graduatedConfig.occupation_name, occupation_code: graduatedConfig.occupation_code, skill_level: graduatedConfig.skill_level, export_skill_level: graduatedConfig.export_skill_level, config: graduatedConfig, admission_requirements: { ...admissionRequirements, scope: { ...admissionRequirements.scope, occupation_code: graduatedConfig.occupation_code } } }], templates: {}, export_instructions: exportInstructions, material_names: {}, form_fields: config.form_fields, qualification_rules: { related_major_current_graduating_student: '历史学生规则', related_major_graduated_degree_v1: '已毕业学历型' }, institution_types: { technical: '技工院校', vocational: '职业院校', general_higher: '普通高等学校' }, admission_requirements: admissionRequirements })
    if (path.endsWith('/export-template')) return route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: 'download-fixture' })
    if (path.endsWith('/commitment-templates')) return reply(route, template)
    if (path.includes('/commitment-templates/')) return route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4 fixture' })
    if ((path.endsWith('/projects/1') && route.request().method() === 'PUT') || (path.endsWith('/projects') && route.request().method() === 'POST')) { payload = route.request().postDataJSON(); return reply(route, { ...project, config: graduated ? graduatedConfig : config, status: payload?.status }) }
    if (path.endsWith('/projects')) {
      const actualConfig = graduated ? graduatedConfig : config
      return reply(route, [{ ...project, batch_count: unreferencedDraft ? 0 : project.batch_count, config: actualConfig, export_instructions: exportInstructions, admission_requirements: { ...admissionRequirements, scope: { ...admissionRequirements.scope, ...actualConfig }, materials: actualConfig.materials.map(item => ({ ...item, max_size_bytes: 10 * 1024 * 1024 })) }, status: graduated ? 'draft' : 'available' }])
    }
    if (path.endsWith('/batches')) return reply(route, [])
    return reply(route, {})
  })
  await page.goto('/admin/certification/renshe?tab=products')
  if (openEditor) await page.getByRole('button', { name: '编辑', exact: true }).click()
  return () => payload
}

test('导出说明展示只读目录和25列说明，移除技术配置', async ({ page }) => {
  await prepare(page)
  await expect(page.getByText('文件结构预览', { exact: true })).toBeVisible()
  await expect(page.getByText('报考要求（只读）', { exact: true })).toBeVisible()
  await expect(page.locator('pre')).toContainText(combinations.find(item => item.selection_id === 'information_security:4:学历型')!.export_instructions!.file_tree)
  await expect(page.getByLabel('已适配导出模板')).toHaveCount(0)
  await expect(page.getByLabel('附件目录与命名规则')).toHaveCount(0)
  await expect(page.getByLabel('报送口径版本')).toHaveCount(0)
  await expect(page.getByLabel('资格校验规则')).toHaveCount(0)
  await expect(page.getByLabel('支持的考试类型')).toHaveCount(0)
  await expect(page.getByLabel('允许的文化程度')).toHaveCount(0)
  await expect(page.getByText('切换第二版', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/renshe-export-instructions.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '查看字段填写说明' }).click()
  await expect(page.getByRole('dialog').last().getByText('实际职业年限，必填，允许0')).toBeVisible()
  await expect(page.getByRole('dialog').last().getByText(/真实参加工作日期，格式如2022-9-21/)).toBeVisible()
})

test('已毕业项目上传承诺书并下载当前报名模板，无需填写导出参数', async ({ page }) => {
  const payload = await prepare(page, true)
  const excel = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载当前报名信息模板' }).click()
  expect((await excel).suggestedFilename()).toBe('报名信息.xlsx')
  await page.locator('input[type=file][accept=".pdf,.docx"]').setInputFiles({ name: '甲方承诺书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
  await expect(page.getByText('甲方承诺书.pdf', { exact: true })).toBeVisible()
  const pdf = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载当前模板' }).click()
  expect((await pdf).suggestedFilename()).toBe('甲方承诺书.pdf')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect.poll(() => payload()?.commitment_template?.sha256).toBe(template.sha256)
  expect(payload()?.selection_id).toBe('information_security:4:学历型')
  expect(payload()).not.toHaveProperty('config')
})

test('编辑产品统一使用当前规则，上传承诺书后直接保存并启用', async ({ page }) => {
  const payload = await prepare(page, true, true, true)
  await page.locator('input[type=file][accept=".pdf,.docx"]').setInputFiles({ name: '甲方承诺书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
  await expect(page.getByText('甲方承诺书.pdf', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '使用当前规则' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '保存并启用' })).toBeEnabled()
  await page.getByRole('button', { name: '保存并启用' }).click()
  await expect.poll(() => payload()?.status).toBe('available')
  expect(payload()?.selection_id).toBe('information_security:4:学历型')
  expect(payload()?.commitment_template).toEqual(template)
  expect(payload()?.status).toBe('available')
})

test('产品编辑展示当前组合要求', async ({ page }) => {
  const payload = await prepare(page)
  await expect(page.getByText(/仅接受已取得毕业证的申请人/)).toBeVisible()
  await expect(page.getByLabel('职业／工种')).toBeDisabled()
  await expect(page.getByLabel('技能等级')).toBeDisabled()
  await page.locator('input[type=file][accept=".pdf,.docx"]').setInputFiles({ name: '甲方承诺书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
  await expect(page.getByText('甲方承诺书.pdf', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect.poll(() => payload()?.commitment_template?.sha256).toBe(template.sha256)
  expect(payload()?.selection_id).toBe('information_security:4:学历型')
  expect(payload()).not.toHaveProperty('skill_level')
  expect(payload()).not.toHaveProperty('config')
  expect(payload()?.expected_version).toBe(project.version)
})

test('新增项目必须选择已适配职业和等级，自动展示对应要求', async ({ page }) => {
  const payload = await prepare(page)
  await page.getByRole('button', { name: /^取\s*消$/ }).click()
  await page.getByRole('button', { name: /新增项目/ }).click()
  await page.getByLabel('项目名称').fill('自主命名的信息安全项目')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.getByText('请选择已适配的职业／工种', { exact: true })).toBeVisible()
  expect(payload()).toBeUndefined()
  await page.getByLabel('职业／工种').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^网络与信息安全管理员／信息安全管理员$/ }).click()
  await page.getByLabel('技能等级').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^四级／中级工$/ }).click()
  await page.getByLabel('申报类型').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^学历型$/ }).click()
  await expect(page.getByText(/职业：信息安全管理员/)).toBeVisible()
  await expect(page.getByText(/等级导出值：四级（系统自动带入）/)).toBeVisible()
  await page.screenshot({ path: 'test-results/renshe-project-selection.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect.poll(() => payload()?.selection_id).toBe('information_security:4:学历型')
  expect(payload()).not.toHaveProperty('skill_level')
  expect(payload()).not.toHaveProperty('config')
})

test('待适配申报类型可保存草稿，不能启用招生', async ({ page }) => {
  const payload = await prepare(page)
  await page.getByRole('button', { name: /^取\s*消$/ }).click()
  await page.getByRole('button', { name: /新增项目/ }).click()
  await page.getByLabel('项目名称').fill('工龄及证书路径草稿')
  await page.getByLabel('职业／工种').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^网络与信息安全管理员／信息安全管理员$/ }).click()
  await page.getByLabel('技能等级').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^二级／技师$/ }).click()
  await page.getByLabel('申报类型').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^复合型$/ }).click()
  await expect(page.getByRole('button', { name: '保存并启用' })).toBeDisabled()
  await expect(page.getByText(/该组合材料、资格及审核规则尚未适配/)).toBeVisible()
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect.poll(() => payload()?.selection_id).toBe('information_security:2:复合型')
  expect(payload()?.status).toBe('draft')
  expect(payload()).not.toHaveProperty('config')
})

test('直接新增及取消重开后，选择职业立即解锁等级和申报类型', async ({ page }) => {
  const payload = await prepare(page, false, false)
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByRole('button', { name: /新增项目/ }).click()
    await expect(page.getByLabel('技能等级')).toBeDisabled()
    await expect(page.getByLabel('申报类型')).toBeDisabled()
    await page.getByLabel('职业／工种').click()
    await page.locator('.ant-select-item-option-content').filter({ hasText: /^网络与信息安全管理员／信息安全管理员$/ }).click()
    await expect(page.locator('.ant-select-selection-item').filter({ hasText: /^网络与信息安全管理员／信息安全管理员$/ })).toBeVisible()
    await expect(page.getByLabel('技能等级')).toBeEnabled()
    await expect(page.getByLabel('申报类型')).toBeDisabled()
    await page.getByLabel('技能等级').click()
    await page.locator('.ant-select-item-option-content').filter({ hasText: /^四级／中级工$/ }).click()
    await expect(page.getByLabel('申报类型')).toBeEnabled()
    await page.getByLabel('申报类型').click()
    await page.locator('.ant-select-item-option-content').filter({ hasText: /^学历型$/ }).click()
    if (attempt === 0) {
      await page.getByRole('button', { name: /^取\s*消$/ }).click()
    } else {
      await page.getByLabel('项目名称').fill('直接新增联动验证')
      await page.getByRole('button', { name: '保存草稿' }).click()
      await expect.poll(() => payload()?.selection_id).toBe('information_security:4:学历型')
    }
  }
})

test('新增其他已适配工种时，要求与保存标识跟随实际选择', async ({ page }) => {
  const payload = await prepare(page, false, false)
  await page.getByRole('button', { name: /新增项目/ }).click()
  await page.getByLabel('职业／工种').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^企业人力资源管理师$/ }).click()
  await page.getByLabel('技能等级').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^四级／中级工$/ }).click()
  await page.getByLabel('申报类型').click()
  await page.locator('.ant-select-item-option-content').filter({ hasText: /^学历型$/ }).click()
  await expect(page.getByText(/职业：企业人力资源管理师/)).toBeVisible()
  await expect(page.getByText(/相关专业：.*劳动与社会保障/)).toBeVisible()
  await expect(page.getByText(/相关专业：.*网络空间安全/)).toHaveCount(0)
  await page.getByLabel('项目名称').fill('人力资源四级学历型')
  await page.locator('input[type=file][accept=".pdf,.docx"]').setInputFiles({ name: '甲方承诺书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
  await expect(page.getByText('甲方承诺书.pdf', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '保存并启用' })).toBeEnabled()
  await page.screenshot({ path: 'test-results/renshe-multi-degree.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '保存并启用' }).click()
  await expect.poll(() => payload()?.selection_id).toBe('human_resources:4:学历型')
  expect(payload()?.status).toBe('available')
  expect(payload()).not.toHaveProperty('config')
})
