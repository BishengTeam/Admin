import { expect, test, type Route } from '@playwright/test'

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

test('人社项目采用列表与弹窗，并可直接创建所属项目的批次', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addInitScript(() => sessionStorage.setItem('admin_token', 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.'))
  const reply = (route: Route, data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data, message: 'ok' }) })
  await page.route('**/admin/auth/me', route => reply(route, { admin: { id: 1, username: 'test', display_name: '测试管理员', role: 'super_admin', is_active: true, must_change_password: false, locked_until: null, last_login_at: null, created_at: '2026-10-15T00:00:00Z', updated_at: '2026-10-15T00:00:00Z' }, permissions: ['*'], session_mode: 'normal', must_change_password: false }))
  await page.route('**/admin/cert-products/renshe/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/projects')) return reply(route, [project, { ...project, id: 2, code: 'RS-SECOND-INTERNAL', chinese_name: '网络与信息安全管理员（高级工）', status: 'draft', version: 1, batch_count: 0, config: { ...config, occupation_name: '网络与信息安全管理员', skill_level: '高级工', export_skill_level: '三级' }, validation_errors: ['导出模板需要适配'] }])
    if (path.endsWith('/batches')) return reply(route, [])
    if (path.endsWith('/project-capabilities')) return reply(route, { default_config: config, templates: { renshe_registration_v1: { label: '职业技能等级报名信息（25 列）', columns: ['real_name', 'id_card_number', 'occupation_name', 'export_skill_level'] } }, qualification_rules: { related_major_current_graduating_student: '相关专业在读应届学生（人工审核）' }, material_names: {}, form_fields: config.form_fields })
    return reply(route, {})
  })
  await page.goto('/admin/certification/renshe?tab=products')
  await expect(page.getByRole('cell', { name: '信息安全管理员（中级工）', exact: true })).toBeVisible()
  await expect(page.getByText('RS-SYSTEM-ONLY')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/renshe-projects.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '编辑', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('项目名称', { exact: true })).toHaveValue(project.chinese_name)
  await expect(page.getByLabel('产品编码', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/renshe-project-editor.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('tab', { name: '报名规则与材料' }).click()
  await expect(page.getByLabel('学生证必填')).toBeChecked()
  await page.getByRole('button', { name: /^取\s*消$/ }).click()
  await page.getByRole('button', { name: '新建批次', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByText(project.chinese_name, { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('新考', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/renshe-batch-editor.png', fullPage: true, animations: 'disabled' })
})
