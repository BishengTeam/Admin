import { exportInstructions } from '../tests/fixtures/rensheExportInstructions'
import { expect, test, type Route, type Page } from '@playwright/test'

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

async function prepare(page: Page, graduated = false) {
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  let payload: Record<string, any> | undefined
  const reply = (route: Route, data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data, message: 'ok' }) })
  await page.route('**/admin/auth/me', route => reply(route, { admin: { id: 1, username: 'test', display_name: '测试管理员', role: 'super_admin', is_active: true, must_change_password: false, locked_until: null, last_login_at: null, created_at: '2026-10-15T00:00:00Z', updated_at: '2026-10-15T00:00:00Z' }, permissions: ['*'], session_mode: 'normal', must_change_password: false }))
  await page.route('**/admin/cert-products/renshe/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/project-capabilities')) return reply(route, { default_config: graduatedConfig, templates: {}, export_instructions: exportInstructions, material_names: {}, form_fields: config.form_fields, qualification_rules: { related_major_current_graduating_student: '历史学生规则', related_major_graduated_degree_v1: '已毕业学历型' }, institution_types: { technical: '技工院校', vocational: '职业院校', general_higher: '普通高等学校' } })
    if (path.endsWith('/export-template')) return route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: 'download-fixture' })
    if (path.endsWith('/commitment-templates')) return reply(route, template)
    if (path.includes('/commitment-templates/')) return route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4 fixture' })
    if (path.endsWith('/projects/1') && route.request().method() === 'PUT') { payload = route.request().postDataJSON(); return reply(route, { ...project, config: payload?.config, status: payload?.status }) }
    if (path.endsWith('/projects')) return reply(route, [{ ...project, config: graduated ? graduatedConfig : config, status: graduated ? 'draft' : 'available' }])
    if (path.endsWith('/batches')) return reply(route, [])
    return reply(route, {})
  })
  await page.goto('/admin/certification/renshe?tab=products')
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await page.getByRole('tab', { name: '导出说明' }).click()
  return () => payload
}

test('导出说明展示只读目录和25列说明，移除技术配置', async ({ page }) => {
  await prepare(page)
  await expect(page.getByText('文件结构预览', { exact: true })).toBeVisible()
  await expect(page.locator('pre')).toContainText(exportInstructions.file_tree)
  await expect(page.getByLabel('已适配导出模板')).toHaveCount(0)
  await expect(page.getByLabel('附件目录与命名规则')).toHaveCount(0)
  await expect(page.getByLabel('报送口径版本')).toHaveCount(0)
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
  await page.getByRole('button', { name: /^保\s*存$/ }).click()
  await expect.poll(() => payload()?.config?.commitment_template?.sha256).toBe(template.sha256)
  expect(payload()?.config.qualification_rule).toBe('related_major_graduated_degree_v1')
})

test('旧规则项目也可直接上传承诺书，不切换报名规则', async ({ page }) => {
  const payload = await prepare(page)
  await page.locator('input[type=file][accept=".pdf,.docx"]').setInputFiles({ name: '甲方承诺书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
  await expect(page.getByText('甲方承诺书.pdf', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^保\s*存$/ }).click()
  await expect.poll(() => payload()?.config?.commitment_template?.sha256).toBe(template.sha256)
  expect(payload()?.config.qualification_rule).toBe(config.qualification_rule)
  expect(payload()?.expected_version).toBe(project.version)
})
