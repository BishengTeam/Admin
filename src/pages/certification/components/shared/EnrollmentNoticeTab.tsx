import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, Divider, Form, Image, Input, Modal, Select, Space, Spin, Typography, message } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { ImageUpload } from '@/components/ImageUpload'
import { usePermission } from '@/hooks/usePermission'
import { certificationJourneyService, type JourneyCatalog, type JourneyContent } from '@/services/certificationJourney'
import type { CertType } from '../vendors/type-registry'

const WRITE_PERMISSION = { h3c: 'h3c:batch_manage', nisp: 'nisp:batch_manage', renshe: 'user:write', sangfor: 'content:write' }

export default function EnrollmentNoticeTab({ type }: { type: CertType }) {
  const canWrite = usePermission(WRITE_PERMISSION[type])
  const [form] = Form.useForm<JourneyContent>()
  const [catalog, setCatalog] = useState<JourneyCatalog | null>(null)
  const [scope, setScope] = useState<number>(0), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [content, setContent] = useState<JourneyContent | null>(null), [error, setError] = useState(''), [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState(0)
  const busy = saving || uploading > 0
  const dirty = useRef(false), seq = useRef(0)
  const blocks = Form.useWatch('blocks', form) || []
  const load = useCallback(async () => {
    const current = ++seq.current
    setLoading(true); setError(''); setContent(null)
    try {
      const [nextCatalog, next] = await Promise.all([certificationJourneyService.catalog(type), certificationJourneyService.content(type, scope || undefined)])
      if (current !== seq.current) return
      setCatalog(nextCatalog); setContent(next); form.setFieldsValue(next); dirty.current = false
    } catch (reason) { if (current === seq.current) setError(reason instanceof Error ? reason.message : '须知加载失败') }
    finally { if (current === seq.current) setLoading(false) }
  }, [form, scope, type])
  useEffect(() => { void load(); return () => { seq.current++ } }, [load])
  const switchScope = (value: number) => {
    if (value === scope || busy) return
    if (!dirty.current) { setScope(value); return }
    Modal.confirm({ title: '当前修改尚未保存', content: '切换后将放弃当前修改，请先核对保存，或选择放弃修改。', okText: '放弃并切换', cancelText: '继续编辑', onOk: () => { dirty.current = false; setScope(value) } })
  }
  const save = async () => {
    if (!content || busy) return
    setError('')
    try {
      const values = await form.validateFields()
      setSaving(true)
      const next = await certificationJourneyService.save(type, { ...values, version: content.version }, scope || undefined)
      setContent(next); form.setFieldsValue(next); dirty.current = false; message.success(scope ? '批次补充说明已保存' : '报名须知已保存')
    } catch (reason) {
      if (reason && typeof reason === 'object' && 'errorFields' in reason) { form.scrollToField((reason as { errorFields: Array<{ name: string[] }> }).errorFields[0]?.name); return }
      setError(reason instanceof Error ? reason.message : '保存失败，请重试')
    } finally { setSaving(false) }
  }
  return <Card>
    <Space wrap style={{ marginBottom: 20 }}><Typography.Text>维护范围</Typography.Text><Select aria-label='须知维护范围' showSearch optionFilterProp='label' style={{ minWidth: 320 }} value={scope} disabled={busy} onChange={switchScope}
      options={[{ value: 0, label: '认证通用须知' }, ...(catalog?.batches || []).map(batch => ({ value: batch.plan_id, label: `${catalog?.subjects.find(item => item.id === batch.subject_id)?.name || ''} · ${batch.name}` }))]} />
      <Button onClick={() => void load()} disabled={busy || dirty.current}>刷新</Button></Space>
    <Spin spinning={loading}>
      {content && <Form form={form} layout='vertical' disabled={!canWrite || busy} onValuesChange={() => { dirty.current = true }}>
        <Form.Item name='title' label={scope ? '补充说明标题' : '须知标题'} rules={[{ required: true, whitespace: true, message: '请填写标题' }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
        <Typography.Paragraph type='secondary'>{scope ? '仅填写本批次的额外说明；通用须知会同时展示。' : '面向该认证所有科目。报名截止、考试时间及费用由批次自动展示。'}</Typography.Paragraph>
        <Form.List name='blocks'>{(fields, { add, remove, move }) => <>
          {fields.map(({ key, name }, index) => <Card key={key} size='small' style={{ marginBottom: 12 }} title={`第${index + 1}段 · ${blocks[index]?.type === 'image' ? '图片' : '文字'}`}
            extra={<Space><Button aria-label={`上移第${index + 1}段`} icon={<ArrowUpOutlined />} disabled={!canWrite || busy || index === 0} onClick={() => { move(index, index - 1); dirty.current = true }} /><Button aria-label={`下移第${index + 1}段`} icon={<ArrowDownOutlined />} disabled={!canWrite || busy || index === fields.length - 1} onClick={() => { move(index, index + 1); dirty.current = true }} /><Button danger icon={<DeleteOutlined />} onClick={() => { remove(name); dirty.current = true }} /></Space>}>
            <Form.Item name={[name, 'type']} hidden><Input /></Form.Item>
            {blocks[index]?.type === 'image' ? <><Form.Item name={[name, 'url']} label='JPG／PNG图片' rules={[{ required: true, message: '请上传图片' }]}><ImageUpload allowedTypes={['image/jpeg', 'image/png']} resizeMaxWidth={1600} onUploadingChange={active => setUploading(value => Math.max(0, value + (active ? 1 : -1)))} /></Form.Item><Form.Item name={[name, 'caption']} label='图片说明'><Input maxLength={200} /></Form.Item><Form.Item name={[name, 'text']} hidden><Input /></Form.Item></>
              : <><Form.Item name={[name, 'text']} rules={[{ required: true, whitespace: true, message: '请填写文字内容' }, { max: 5000 }]}><Input.TextArea autoSize={{ minRows: 3, maxRows: 12 }} maxLength={5000} showCount /></Form.Item><Form.Item name={[name, 'url']} hidden><Input /></Form.Item><Form.Item name={[name, 'caption']} hidden><Input /></Form.Item></>}
          </Card>)}
          <Space><Button icon={<PlusOutlined />} disabled={fields.length >= 50} onClick={() => { add({ type: 'text', text: '', url: '', caption: '' }); dirty.current = true }}>添加文字</Button><Button icon={<PlusOutlined />} disabled={fields.length >= 50} onClick={() => { add({ type: 'image', text: '', url: '', caption: '' }); dirty.current = true }}>添加图片</Button></Space>
        </>}</Form.List>
        <Divider orientation='left'>报名咨询联系方式</Divider>
        <Typography.Paragraph type='secondary'>{scope ? '本批次未填写的联系方式沿用认证通用设置。' : '报名提交后向考生展示；咨询群继续在批次管理中维护，沿用核账后的准入规则。'}</Typography.Paragraph>
        <Form.Item name='contact_name' label='管理员姓名'><Input maxLength={64} /></Form.Item>
        <Form.Item name='contact_phone' label='联系电话'><Input maxLength={32} /></Form.Item>
        <Form.Item name='contact_wechat' label='联系微信'><Input maxLength={64} /></Form.Item>
        <Form.Item name='service_hours' label='服务时间'><Input maxLength={128} placeholder='例如：工作日09:00—18:00' /></Form.Item>
      </Form>}
    </Spin>
    {error && <Typography.Paragraph type='danger' role='alert'>{error}<Button type='link' onClick={() => void load()}>重新加载</Button></Typography.Paragraph>}
    <Space><Button disabled={!content || loading || uploading > 0} onClick={() => setPreview(true)}>手机端预览</Button>{canWrite && <Button type='primary' disabled={!content || loading || uploading > 0} loading={saving} onClick={() => void save()}>{uploading ? '图片上传中…' : '保存设置'}</Button>}</Space>
    <Modal title='手机端预览' open={preview} footer={null} onCancel={() => setPreview(false)} width={420}>
      <div style={{ maxWidth: 375, margin: 'auto', padding: 16, background: '#f5f7fa', maxHeight: '70vh', overflow: 'auto' }}>
        <Typography.Title level={4}>{form.getFieldValue('title')}</Typography.Title>
        {blocks.map((block, index) => block.type === 'image' ? <div key={index}><Image src={block.url} width='100%' /><Typography.Paragraph>{block.caption}</Typography.Paragraph></div> : <Typography.Paragraph key={index} style={{ whiteSpace: 'pre-wrap' }}>{block.text}</Typography.Paragraph>)}
      </div>
    </Modal>
  </Card>
}
