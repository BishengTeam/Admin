import { useState } from 'react'
import { Alert, Button, Checkbox, Form, Input, Select, Space, Typography, Upload, message } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { rensheService } from '@/services/renshe'
import type { RensheProjectConfig } from '@/types/rensheProject'

type Template = NonNullable<NonNullable<RensheProjectConfig['reporting_policy']>['commitment_template']>

export function CommitmentTemplateUpload({ value, onChange, disabled }: { value?: Template; onChange?: (value: Template) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  return <Space direction='vertical'>
    <Space wrap>
      <Upload accept='.pdf,.docx' showUploadList={false} disabled={disabled || busy} beforeUpload={async file => {
        if (file.size > 10 * 1024 * 1024 || !/\.(pdf|docx)$/i.test(file.name)) { message.error('模板仅支持PDF/DOCX，最大10 MB'); return false }
        setBusy(true)
        try { onChange?.(await rensheService.uploadCommitmentTemplate(file)); message.success('模板已上传，请核对并确认使用口径') }
        catch (error) { message.error(error instanceof Error ? error.message : '上传失败') }
        finally { setBusy(false) }
        return false
      }}><Button icon={<UploadOutlined />} loading={busy} disabled={disabled}>{value ? '替换模板（生成新版本）' : '上传承诺书模板'}</Button></Upload>
      {value && <Button disabled={false} icon={<DownloadOutlined />} onClick={async () => {
        try {
          const blob = await rensheService.downloadCommitmentTemplate(value.filename)
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a'); anchor.href = url; anchor.download = value.original_filename || value.filename
          anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch (error) { message.error(error instanceof Error ? error.message : '下载失败') }
      }}>下载当前模板</Button>}
    </Space>
    <Typography.Text type='secondary'>{value?.original_filename || '暂无模板，可先保存项目草稿。上传后供本批次申请人下载、签字按手印并回传。'}</Typography.Text>
  </Space>
}

export function GraduatedExportConfig({ required, readOnly, materials, defaultPolicy }: { required: boolean; readOnly: boolean; materials: RensheProjectConfig['materials']; defaultPolicy?: RensheProjectConfig['reporting_policy'] }) {
  const form = Form.useFormInstance()
  const contractVersion = Form.useWatch(['config', 'reporting_policy', 'contract_version'], form)
  const upgraded = contractVersion === 2
  return <>
    <Alert type='info' showIcon message='按甲方原25列模板报送' description='M列从事职业由申请人实际填报；U列使用原申报条件字典。学历资料保留在审核记录，不新增导入工作表。R、S列须确认报送口径后才能开放新批次。' style={{ marginBottom: 16 }} />
    {!upgraded && <Alert type='warning' showIcon message='当前为旧报送配置，仅保留历史记录；新批次需切换模板填报第二版。' action={!readOnly && defaultPolicy && <Button onClick={() => {
      const existing = form.getFieldValue(['config', 'reporting_policy']) || {}
      form.setFieldValue(['config', 'reporting_policy'], { ...existing, ...structuredClone(defaultPolicy), commitment_template: existing.commitment_template, attachment_names: existing.attachment_names, confirmed_by_client: false })
    }}>切换第二版</Button>} style={{ marginBottom: 16 }} />}
    <Form.Item name={['config', 'reporting_policy', 'contract_version']} hidden><Input /></Form.Item>
    {!upgraded && <Form.Item name={['config', 'reporting_policy', 'export_values', 'student_status']} hidden><Input /></Form.Item>}
    <Form.Item name={['config', 'export_template']} hidden><Input /></Form.Item>
    <Form.Item name={['config', 'field_mapping']} hidden><Input /></Form.Item>
    <Form.Item name={['config', 'reporting_policy', 'version']} label='报送口径版本' rules={[{ required, pattern: /^[A-Za-z0-9_-]{1,64}$/, message: '填写1–64位字母、数字、下划线或连字符' }]}><Input placeholder='如 graduated-v1' maxLength={64} /></Form.Item>
    <Form.Item name={['config', 'reporting_policy', 'commitment_template']} label='承诺书模板' getValueFromEvent={value => { form.setFieldValue(['config', 'reporting_policy', 'confirmed_by_client'], false); return value }} rules={[{ required, message: '请先上传甲方确认的模板' }]}><CommitmentTemplateUpload disabled={readOnly} /></Form.Item>
    <Form.Item name={['config', 'attachment_layout']} label='附件目录'><Select onChange={() => form.setFieldValue(['config', 'reporting_policy', 'confirmed_by_client'], false)} options={[{ value: 'by_candidate', label: '材料／身份证号／身份证号_材料名.原扩展名' }, { value: 'by_material', label: '材料／材料类型／身份证号_材料名.原扩展名' }]} /></Form.Item>
    {materials.map(item => <Form.Item key={item.kind} name={['config', 'reporting_policy', 'attachment_names', item.kind]} label={`${item.name} · 导出材料名`} rules={[{ required, whitespace: true, message: '填写甲方确认的文件名，不含扩展名' }]}><Input onChange={() => form.setFieldValue(['config', 'reporting_policy', 'confirmed_by_client'], false)} placeholder='不含身份证前缀和扩展名' maxLength={64} /></Form.Item>)}
    {Object.entries({ candidate_source: 'F列考生来源', application_condition: 'U列学历型申报条件（模板原文）' }).map(([key, label]) => <Form.Item key={key} name={['config', 'reporting_policy', 'export_values', key]} label={label} rules={[{ required: required && upgraded }]}><Input.TextArea autoSize disabled /></Form.Item>)}
    {upgraded && <>
      <Form.Item name={['config', 'reporting_policy', 'employment_reporting', 'date_rule']} label='R列日期填报规则' rules={[{ required, message: '请按甲方确认的规则选择' }]}><Select onChange={() => form.setFieldValue(['config', 'reporting_policy', 'employment_reporting', 'confirmed'], false)} options={[
        { value: 'work_only', label: '必须填参加工作日期' }, { value: 'enrollment_only', label: '必须填入学日期' }, { value: 'work_or_enrollment', label: '工作日期优先，无工作日期使用真实入学日期' }, { value: 'optional', label: '甲方确认允许空值，有资料时按实填写' },
      ]} /></Form.Item>
      <Form.Item name={['config', 'reporting_policy', 'employment_reporting', 'years_rule']} label='S列职业年限是否必填' rules={[{ required }]}><Select onChange={() => form.setFieldValue(['config', 'reporting_policy', 'employment_reporting', 'confirmed'], false)} options={[{ value: 'required', label: '必须按实填写' }, { value: 'optional', label: '甲方确认允许空值' }]} /></Form.Item>
      <Form.Item name={['config', 'reporting_policy', 'employment_reporting', 'allow_zero_years']} label='S列是否接受零年限' rules={[{ validator: (_, value) => !required || typeof value === 'boolean' ? Promise.resolve() : Promise.reject(new Error('须明确是否接受零年限')) }]}><Select onChange={() => form.setFieldValue(['config', 'reporting_policy', 'employment_reporting', 'confirmed'], false)} options={[{ value: true, label: '甲方确认可以报送0' }, { value: false, label: '不接受0，须联系管理员核实无工龄人员报送方式' }]} /></Form.Item>
      <Form.Item name={['config', 'reporting_policy', 'employment_reporting', 'confirmed']} valuePropName='checked'><Checkbox>R、S列规则已获甲方确认；以上是报送要求，不新增学历型工龄资格门槛</Checkbox></Form.Item>
    </>}
    <Form.Item name={['config', 'reporting_policy', 'confirmed_by_client']} valuePropName='checked'><Checkbox>承诺书模板、附件目录及命名规则已获甲方确认</Checkbox></Form.Item>
  </>
}
