import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Col, Divider, Form, Input, Modal, Row, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useSearchParams } from 'react-router-dom'
import { ImageUpload } from '@/components/ImageUpload'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePermission } from '@/hooks/usePermission'
import { rensheService } from '@/services/renshe'
import type { RensheCapabilities, RensheProject, RensheProjectWrite } from '@/types/rensheProject'

const { Text } = Typography
const STATUS = { draft: { label: '草稿', color: 'default' }, available: { label: '可用', color: 'success' }, disabled: { label: '已停用', color: 'default' } }
const EDUCATIONS = { secondary_vocational: '中专', associate: '大专', bachelor: '本科', master: '硕士', doctorate: '博士' }
const FIELD_LABELS: Record<string, string> = {
  real_name: '姓名', gender: '性别', birth_date: '出生日期', id_type: '证件类型', id_card_number: '身份证号', candidate_source: '考生来源',
  education: '学历', ethnicity: '民族', political_status: '政治面貌', contact_phone: '联系电话', mailing_address: '通讯地址', blank: '留空',
  student_status: '学生身份', occupation_name: '职业／工种', export_skill_level: '等级导出值', enrollment_date: '入学时间', occupation_code: '职业代码',
  application_condition: '申报条件', application_type: '申报类型', exam_type: '考试类型', email: '电子邮箱', school: '学校', major: '专业',
}

export default function ProjectTable() {
  const canWrite = usePermission('content:write')
  const canManageBatch = usePermission('user:write')
  const [, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<RensheProject[]>([])
  const [capabilities, setCapabilities] = useState<RensheCapabilities | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string>()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RensheProject | null>(null)
  const [readOnly, setReadOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [form] = Form.useForm<RensheProjectWrite>()
  const templateId = Form.useWatch(['config', 'export_template'], form)
  const projectStatus = Form.useWatch('status', form)
  const materials = Form.useWatch(['config', 'materials'], form) as RensheProjectWrite['config']['materials'] | undefined

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [projects, supported] = await Promise.all([rensheService.listProjects(), rensheService.projectCapabilities()])
      setItems(projects)
      setCapabilities(supported)
    } catch (error) { message.error(error instanceof Error ? error.message : '加载报考项目失败') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const edit = (item: RensheProject | null, view = false) => {
    setEditing(item)
    setSaveError(undefined)
    setReadOnly(view || !canWrite)
    setActiveTab('basic')
    form.resetFields()
    form.setFieldsValue(item ? {
      chinese_name: item.chinese_name, description: item.description, home_cover_url: item.home_cover_url,
      status: item.status, config: structuredClone(item.config), expected_version: item.version || undefined,
    } : { status: 'draft', config: { ...structuredClone(capabilities!.default_config), occupation_name: '', occupation_code: '', skill_level: '', export_skill_level: '' } })
    setOpen(true)
  }

  const save = async () => {
    let values: RensheProjectWrite
    try { values = await form.validateFields() } catch { setActiveTab('basic'); return }
    setSaving(true)
    try {
      const payload = { ...values, expected_version: editing?.version || undefined }
      const result = editing ? await rensheService.updateProject(editing.id, payload) : await rensheService.createProject(payload)
      message.success(result.status === 'draft' ? '项目草稿已保存' : '报考项目已保存')
      setOpen(false)
      await load()
    } catch (error) { setSaveError(error instanceof Error ? error.message : '保存项目失败') }
    finally { setSaving(false) }
  }

  const goBatches = (item: RensheProject, create = false) => {
    setSearchParams({ tab: 'plans', project_id: String(item.id), ...(create ? { create: '1' } : {}) })
  }

  const mutateProject = async (action: () => Promise<unknown>) => {
    try { await action(); await load() }
    catch (error) { message.error(error instanceof Error ? error.message : '项目操作失败'); throw error }
  }

  const columns: ColumnsType<RensheProject> = [
    { title: '项目名称', dataIndex: 'chinese_name', ellipsis: true, render: (name, item) => <Button type='link' style={{ padding: 0 }} onClick={() => edit(item, true)}>{name}</Button> },
    { title: '职业／工种', render: (_, item) => item.config.occupation_name || <Text type='secondary'>待配置</Text> },
    { title: '技能等级', width: 120, render: (_, item) => item.config.skill_level || '待配置' },
    { title: '配置状态', width: 150, render: (_, item) => <Space direction='vertical' size={0}><Tag color={STATUS[item.status].color}>{STATUS[item.status].label}</Tag>{item.validation_errors.length > 0 && <Text type='warning'>配置待完善</Text>}</Space> },
    { title: '配置版本', width: 110, render: (_, item) => item.version ? `V${item.version}` : '-' },
    { title: '批次数量', width: 110, render: (_, item) => <Button type='link' onClick={() => goBatches(item)}>{item.batch_count}</Button> },
    { title: '操作', width: 280, render: (_, item) => <Space size={0}>
      <Button type='link' size='small' onClick={() => edit(item, true)}>查看</Button>
      {canWrite && <Button type='link' size='small' onClick={() => edit(item)}>编辑</Button>}
      {canManageBatch && item.status === 'available' && <Button type='link' size='small' onClick={() => goBatches(item, true)}>新建批次</Button>}
      {canWrite && item.status === 'available' && <ConfirmButton type='link' size='small' danger title='停用项目' description='停用后不能创建或发布新批次，已有已发布批次继续办理。' onConfirm={() => mutateProject(async () => {
        await rensheService.updateProject(item.id, { chinese_name: item.chinese_name, description: item.description, home_cover_url: item.home_cover_url, config: item.config, status: 'disabled', expected_version: item.version })
        message.success('项目已停用')
      })}>停用</ConfirmButton>}
      {canWrite && item.status === 'draft' && item.batch_count === 0 && <ConfirmButton type='link' size='small' danger title='删除草稿项目' description='确认删除这个尚无批次引用的草稿项目？' onConfirm={() => mutateProject(() => rensheService.deleteProject(item.id))}>删除</ConfirmButton>}
    </Space> },
  ]

  const basic = <>
    <Divider orientation='left' orientationMargin={0}><Text type='secondary' style={{ fontSize: 13 }}>基本信息</Text></Divider>
    <Form.Item name='chinese_name' label='项目名称' rules={[{ required: true, whitespace: true, message: '请输入项目名称' }]}><Input maxLength={128} placeholder='如：信息安全管理员（中级工）' /></Form.Item>
    <Row gutter={16}>
      <Col span={12}><Form.Item name={['config', 'occupation_name']} label='职业／工种' rules={[{ required: projectStatus === 'available', whitespace: true, message: '请输入职业／工种' }]}><Input maxLength={64} disabled={readOnly || Boolean(editing?.batch_count)} placeholder='实际报考职业名称' /></Form.Item></Col>
      <Col span={12}><Form.Item name={['config', 'skill_level']} label='技能等级' rules={[{ required: projectStatus === 'available', whitespace: true, message: '请输入技能等级' }]}><Input maxLength={32} disabled={readOnly || Boolean(editing?.batch_count)} placeholder='如：中级工' /></Form.Item></Col>
      <Col span={12}><Form.Item name={['config', 'occupation_code']} label='职业代码' tooltip='用于外部申报的职业代码' rules={[{ required: projectStatus === 'available', whitespace: true, message: '请输入职业代码' }]}><Input maxLength={160} /></Form.Item></Col>
      <Col span={12}><Form.Item name={['config', 'export_skill_level']} label='等级导出值' tooltip='例如展示“中级工”，导出“四级”' rules={[{ required: projectStatus === 'available', whitespace: true, message: '请输入等级导出值' }]}><Input maxLength={32} placeholder='如：四级' /></Form.Item></Col>
    </Row>
    <Form.Item name='description' label='项目介绍'><Input.TextArea rows={3} maxLength={512} showCount /></Form.Item>
    <Form.Item name='home_cover_url' label='首页认证横幅'>{readOnly ? (editing?.home_cover_url ? <img src={editing.home_cover_url} alt='项目封面' style={{ maxWidth: '100%', maxHeight: 180 }} /> : <Text type='secondary'>未上传封面</Text>) : <ImageUpload crop={{ width: 1404, height: 640, title: '首页认证横幅', fixed: true }} hint='首页认证专区通栏大图；固定裁剪输出 1404 × 640 px。' />}</Form.Item>
    <Form.Item name='status' label='配置状态'><Select options={Object.entries(STATUS).map(([value, meta]) => ({ value, label: meta.label }))} /></Form.Item>
    <Text type='secondary'>可用项目须通过配置校验。项目变更生成新版本，已发布批次和历史报名继续使用原配置。</Text>
  </>

  const rules = <>
    <Row gutter={16}>
      <Col span={12}><Form.Item name={['config', 'exam_types']} label='支持的考试类型'><Select mode='multiple' options={['新考', '补考'].map(value => ({ label: value, value }))} /></Form.Item></Col>
      <Col span={12}><Form.Item name={['config', 'application_types']} label='支持的申报类型'><Select mode='multiple' options={[{ label: '学历型', value: '学历型' }]} /></Form.Item></Col>
    </Row>
    <Form.Item name={['config', 'qualification_rule']} label='资格校验规则'><Select options={Object.entries(capabilities?.qualification_rules ?? {}).map(([value, label]) => ({ value, label }))} /></Form.Item>
    <Alert type='info' showIcon message='系统校验学历范围；专业相关性和应届资格由审核人员核实。' style={{ marginBottom: 16 }} />
    <Form.Item name={['config', 'education_levels']} label='允许的学历'><Checkbox.Group options={Object.entries(EDUCATIONS).map(([value, label]) => ({ value, label }))} /></Form.Item>
    <Form.Item name={['config', 'form_fields']} label='报名信息字段'><Checkbox.Group options={['contact_phone', 'mailing_address', 'email'].map(value => ({ label: FIELD_LABELS[value], value }))} /></Form.Item>
    <Form.Item label='适用材料类型'>
      <Checkbox.Group value={materials?.map(item => item.kind) ?? []} options={Object.entries(capabilities?.material_names ?? {}).map(([value, label]) => ({ value, label, disabled: ['id_card_front', 'id_card_back', 'portrait'].includes(value) }))} onChange={values => {
        form.setFieldValue(['config', 'materials'], values.flatMap(kind => {
          const requirement = materials?.find(item => item.kind === kind) ?? capabilities?.default_config.materials.find(item => item.kind === kind)
          return requirement ? [requirement] : []
        }))
      }} />
    </Form.Item>
    <Text type='secondary'>以下材料复用已审核的实名与学生资料，每类最多 1 个文件。身份证正反面和照片为必填材料。</Text>
    <Form.List name={['config', 'materials']}>{fields => fields.map(({ key, name }) => <Row gutter={12} key={key} align='middle'>
      <Form.Item name={[name, 'kind']} hidden><Input /></Form.Item>
      <Form.Item name={[name, 'max_count']} hidden><Input /></Form.Item>
      <Col span={10}><Form.Item name={[name, 'name']} label='材料名称'><Input maxLength={64} /></Form.Item></Col>
      <Col span={10}><Form.Item name={[name, 'extensions']} label='文件格式'><Select mode='multiple' options={(form.getFieldValue(['config', 'materials', name, 'kind']) === 'xuexin_registration' ? ['.pdf'] : ['.jpg', '.jpeg']).map(value => ({ value, label: value }))} /></Form.Item></Col>
      <Col span={4}><Form.Item name={[name, 'required']} label='必填' valuePropName='checked'><Checkbox aria-label={`${form.getFieldValue(['config', 'materials', name, 'name'])}必填`} disabled={readOnly || ['id_card_front', 'id_card_back', 'portrait'].includes(form.getFieldValue(['config', 'materials', name, 'kind']))} /></Form.Item></Col>
    </Row>)}</Form.List>
  </>

  const exportConfig = <>
    <Form.Item name={['config', 'export_template']} label='已适配导出模板'><Select options={Object.entries(capabilities?.templates ?? {}).map(([value, template]) => ({ value, label: template.label }))} onChange={() => form.setFieldValue(['config', 'field_mapping'], {})} /></Form.Item>
    <Form.Item name={['config', 'attachment_layout']} label='附件目录与命名规则'><Select options={[{ value: 'by_candidate', label: '材料／身份证号／身份证号_材料名' }, { value: 'by_material', label: '材料／材料类型／身份证号_材料名' }]} /></Form.Item>
    <Divider orientation='left' orientationMargin={0}><Text type='secondary' style={{ fontSize: 13 }}>字段映射</Text></Divider>
    <Row gutter={16}>{(capabilities?.templates[templateId]?.columns ?? []).map((field, index) => <Col span={12} key={`${templateId}-${index}`}>
      <Form.Item name={['config', 'field_mapping', String(index + 1)]} label={`第 ${index + 1} 列 · ${FIELD_LABELS[field] || field}`}>
        <Select allowClear placeholder={`默认：${FIELD_LABELS[field] || field}`} options={Object.entries(FIELD_LABELS).map(([value, label]) => ({ value, label }))} />
      </Form.Item>
    </Col>)}</Row>
    <Alert type={editing?.validation_errors.length ? 'warning' : 'info'} showIcon message={editing?.validation_errors.length ? '上次保存的配置校验结果' : '保存为“可用”时，服务端将校验规则、材料、字段映射与导出模板。'} description={editing?.validation_errors.map(error => <div key={error}>{error}</div>)} />
  </>

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
      <Space wrap>
        {canWrite && <Button type='primary' icon={<PlusOutlined />} disabled={!capabilities} onClick={() => edit(null)}>新增项目</Button>}
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
        <Input.Search allowClear placeholder='搜索项目名称或职业' style={{ width: 240 }} onChange={event => setKeyword(event.target.value)} />
        <Select allowClear placeholder='配置状态' value={status} onChange={setStatus} style={{ width: 130 }} options={Object.entries(STATUS).map(([value, meta]) => ({ value, label: meta.label }))} />
      </Space>
      <Text type='secondary'>共 {items.length} 个项目</Text>
    </div>
    <Table rowKey='id' columns={columns} dataSource={items.filter(item => (!status || item.status === status) && `${item.chinese_name}${item.config.occupation_name}`.includes(keyword.trim()))} loading={loading} scroll={{ x: 1100 }} size='middle' />
    <Modal title={<Space><SafetyCertificateOutlined style={{ color: '#1677ff' }} /><span>{readOnly ? '查看报考项目' : editing ? '编辑报考项目' : '新增人社报考项目'}{editing?.version ? ` · V${editing.version}` : ''}</span></Space>} open={open} onCancel={() => setOpen(false)} onOk={save} okText='保存' cancelText='取消' confirmLoading={saving} width={760} styles={{ body: { maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingRight: 8 } }} destroyOnClose footer={readOnly ? <Button onClick={() => setOpen(false)}>关闭</Button> : undefined}>
      <Form form={form} layout='vertical' disabled={readOnly} style={{ marginTop: 20 }} requiredMark='optional' preserve>
        {saveError && <Alert type='error' showIcon message={saveError} style={{ marginBottom: 16 }} />}
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[{ key: 'basic', label: '基本信息', children: basic, forceRender: true }, { key: 'rules', label: '报名规则与材料', children: rules, forceRender: true }, { key: 'export', label: '导出配置', children: exportConfig, forceRender: true }]} />
      </Form>
    </Modal>
  </>
}
