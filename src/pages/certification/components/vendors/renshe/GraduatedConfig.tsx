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

export function GraduatedExportConfig({ required, readOnly, materials }: { required: boolean; readOnly: boolean; materials: RensheProjectConfig['materials'] }) {
  const form = Form.useFormInstance()
  return <>
    <Alert type='info' showIcon message='已毕业学历型专用导出' description='沿用甲方25列报名表，入学时间留空；毕业院校、专业、毕业日期、证书编号另列在“毕业学历信息”工作表。附件保留原扩展名。正式开放前须核对甲方导入要求。' style={{ marginBottom: 16 }} />
    <Form.Item name={['config', 'export_template']} hidden><Input /></Form.Item>
    <Form.Item name={['config', 'field_mapping']} hidden><Input /></Form.Item>
    <Form.Item name={['config', 'reporting_policy', 'version']} label='报送口径版本' rules={[{ required, pattern: /^[A-Za-z0-9_-]{1,64}$/, message: '填写1–64位字母、数字、下划线或连字符' }]}><Input placeholder='如 graduated-v1' maxLength={64} /></Form.Item>
    <Form.Item name={['config', 'reporting_policy', 'commitment_template']} label='承诺书模板' getValueFromEvent={value => { form.setFieldValue(['config', 'reporting_policy', 'confirmed_by_client'], false); return value }} rules={[{ required, message: '请先上传甲方确认的模板' }]}><CommitmentTemplateUpload disabled={readOnly} /></Form.Item>
    <Form.Item name={['config', 'attachment_layout']} label='附件目录'><Select options={[{ value: 'by_candidate', label: '材料／身份证号／身份证号_材料名.原扩展名' }, { value: 'by_material', label: '材料／材料类型／身份证号_材料名.原扩展名' }]} /></Form.Item>
    {materials.map(item => <Form.Item key={item.kind} name={['config', 'reporting_policy', 'attachment_names', item.kind]} label={`${item.name} · 导出材料名`} rules={[{ required, whitespace: true, message: '填写甲方确认的文件名，不含扩展名' }]}><Input placeholder='不含身份证前缀和扩展名' maxLength={64} /></Form.Item>)}
    {Object.entries({ candidate_source: '考生来源', student_status: '毕业状态（原模板身份列）', application_condition: '申报条件' }).map(([key, label]) => <Form.Item key={key} name={['config', 'reporting_policy', 'export_values', key]} label={label} rules={[{ required, whitespace: true, message: '请填写甲方确认的已毕业学历型导出值' }]}><Input maxLength={256} placeholder='须与甲方导入口径一致，不使用在读／应届固定值' /></Form.Item>)}
    <Form.Item name={['config', 'reporting_policy', 'confirmed_by_client']} valuePropName='checked'><Checkbox>已核对：模板、附件目录和命名、报送字段及新增学历工作表已获甲方确认</Checkbox></Form.Item>
  </>
}
