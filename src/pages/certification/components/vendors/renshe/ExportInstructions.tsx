import { useState } from 'react'
import { Alert, Button, Form, Modal, Space, Table, Typography, Upload, message } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { rensheService } from '@/services/renshe'
import type { RensheProjectConfig, RensheExportInstructions } from '@/types/rensheProject'

type Template = NonNullable<RensheProjectConfig['commitment_template']>

export function CommitmentTemplateUpload({ value, onChange, disabled }: { value?: Template; onChange?: (value: Template) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  return <Space direction='vertical'>
    <Space wrap>
      <Upload accept='.pdf,.docx' showUploadList={false} disabled={disabled || busy} beforeUpload={async file => {
        if (file.size > 10 * 1024 * 1024 || !/\.(pdf|docx)$/i.test(file.name)) { message.error('模板仅支持PDF/DOCX，最大10 MB'); return false }
        setBusy(true)
        try { onChange?.(await rensheService.uploadCommitmentTemplate(file)); message.success('承诺书已上传，保存项目后生效') }
        catch (error) { message.error(error instanceof Error ? error.message : '上传失败') }
        finally { setBusy(false) }
        return false
      }}><Button icon={<UploadOutlined />} loading={busy} disabled={disabled}>{value ? '上传替换' : '上传承诺书模板'}</Button></Upload>
      {value && <Button disabled={false} icon={<DownloadOutlined />} onClick={async () => {
        try {
          const blob = await rensheService.downloadCommitmentTemplate(value.filename)
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a'); anchor.href = url; anchor.download = value.original_filename || value.filename
          anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch (error) { message.error(error instanceof Error ? error.message : '下载失败') }
      }}>下载当前模板</Button>}
    </Space>
    <Typography.Text type='secondary'>{value?.original_filename || '暂无模板，可先保存项目草稿。保存后供申请人下载当前模板、签字按手印并回传。'}</Typography.Text>
  </Space>
}

export function ExportInstructions({ instructions, required, readOnly }: { instructions?: RensheExportInstructions; required: boolean; readOnly: boolean }) {
  const [showColumns, setShowColumns] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const downloadTemplate = async () => {
    setDownloading(true)
    try {
      const blob = await rensheService.downloadRegistrationTemplate()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = instructions?.registration_template || '报名信息.xlsx'
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { message.error(error instanceof Error ? error.message : '下载失败') }
    finally { setDownloading(false) }
  }
  return <Space direction='vertical' size={16} style={{ width: '100%' }}>
    <section>
      <Typography.Title level={5}>导出内容说明</Typography.Title>
      {instructions ? <Space direction='vertical'>
        <Typography.Text>报名信息表：使用甲方固定25列报送模板，读取当前导出任务关联的报名材料版本。</Typography.Text>
        <Typography.Text>工作经历表：{instructions.work_description}</Typography.Text>
        <Typography.Text>考生材料：按既定报送要求平铺在压缩包根目录，以身份证号及固定材料名称命名，保留真实格式。补正后需要重新导出当前材料版本。</Typography.Text>
        <Typography.Text type='secondary'>{instructions.portrait_note}</Typography.Text>
      </Space> : <Alert type='info' message='后端尚未提供当前导出说明，请更新后端后刷新页面。' />}
    </section>
    {instructions && <section>
      <Typography.Title level={5}>文件结构预览</Typography.Title>
      <Typography.Paragraph type='secondary'>{instructions.directory_note}</Typography.Paragraph>
      <pre style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, overflowX: 'auto', margin: 0 }}>{instructions.file_tree}</pre>
    </section>}
    <section>
      <Typography.Title level={5}>模板查看</Typography.Title>
      <Space wrap>
        <Button disabled={!instructions} loading={downloading} icon={<DownloadOutlined />} onClick={() => void downloadTemplate()}>下载当前报名信息模板</Button>
        <Button disabled={!instructions} onClick={() => setShowColumns(true)}>查看字段填写说明</Button>
      </Space>
    </section>
    <section>
      <Typography.Title level={5}>承诺书模板</Typography.Title>
      <Typography.Paragraph type='secondary'>上传甲方确认的 PDF／DOCX（≤10 MB），保存项目后供申请人下载签署。</Typography.Paragraph>
      <Form.Item name={['config', 'commitment_template']} label='当前文件' rules={[{ required, message: '请上传承诺书模板；暂未提供时可先保存草稿' }]}><CommitmentTemplateUpload disabled={readOnly} /></Form.Item>
    </section>
    <Modal title='25列字段填写说明' open={showColumns} onCancel={() => setShowColumns(false)} footer={<Button onClick={() => setShowColumns(false)}>关闭</Button>} width={760}>
      <Table rowKey='column' pagination={false} size='small' dataSource={instructions?.columns || []} scroll={{ y: 480 }} columns={[{ title: '列序', dataIndex: 'column', width: 64 }, { title: '模板字段', dataIndex: 'header', width: 190 }, { title: '填写来源与要求', dataIndex: 'source' }]} />
    </Modal>
  </Space>
}
