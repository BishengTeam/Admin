import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Collapse, Divider, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useSearchParams } from 'react-router-dom'
import { ImageUpload } from '@/components/ImageUpload'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePermission } from '@/hooks/usePermission'
import { rensheService } from '@/services/renshe'
import type { RensheCapabilities, RensheProject, RensheProjectWrite } from '@/types/rensheProject'
import { formatBytes } from '@/utils/renshe'
import { ExportInstructions } from './ExportInstructions'

const { Text } = Typography
const STATUS = { draft: { label: '草稿', color: 'default' }, available: { label: '可用', color: 'success' }, disabled: { label: '已停用', color: 'default' } }
const GRADUATED_RULE = 'related_major_graduated_degree_v1'

function AdmissionRequirements({ requirements }: { requirements?: RensheCapabilities['admission_requirements'] }) {
  if (!requirements) return <Alert type='info' showIcon message='后端尚未提供当前报考要求，请更新后端后刷新页面。' />
  const scope = requirements.scope
  return <Space direction='vertical' size={16} style={{ width: '100%' }}>
    <section>
      <Typography.Title level={5}>适用范围</Typography.Title>
      <Space direction='vertical' size={4}>
        <Text>职业：{scope.occupation_name}（{scope.skill_level}，导出等级：{scope.export_skill_level}）</Text>
        <Text>申报方式：{scope.application_types.join('、')}，仅接受已取得毕业证的申请人</Text>
        <Text>考试类型：{scope.exam_types.join('、')}</Text>
        <Text type='secondary'>职业代码：{scope.occupation_code}</Text>
      </Space>
    </section>
    <section>
      <Typography.Title level={5}>报名信息</Typography.Title>
      <Space wrap>{requirements.form_sections.map(item => <Tag key={item}>{item}</Tag>)}</Space>
      <Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
        文化程度为如实填报选项：{requirements.education_options.map(item => item.label).join('、')}。选项全部展示不代表自动符合资格，资格仍按毕业证、院校类型、专业和初审要求核验。
      </Typography.Paragraph>
      <Space wrap style={{ marginTop: 8 }}>{requirements.institution_types.map(item => <Tag key={item.value}>{item.label}</Tag>)}</Space>
    </section>
    <section>
      <Typography.Title level={5}>必交材料</Typography.Title>
      <Table
        rowKey='kind'
        pagination={false}
        size='small'
        dataSource={requirements.materials}
        columns={[
          { title: '材料', dataIndex: 'name' },
          { title: '格式', dataIndex: 'extensions', render: (values: string[]) => values.join(' / ') },
          { title: '大小', dataIndex: 'max_size_bytes', width: 110, render: (value: number) => formatBytes(value) },
          { title: '要求', render: () => '必填 · 1 个文件' },
        ]}
      />
      {requirements.notes.map(item => <Typography.Paragraph key={item} type='secondary' style={{ marginBottom: 0 }}>{item}</Typography.Paragraph>)}
    </section>
  </Space>
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
  const [commitmentTemplate, setCommitmentTemplate] = useState<RensheProject['config']['commitment_template']>(null)
  const [form] = Form.useForm<RensheProjectWrite>()
  const projectStatus = Form.useWatch('status', form)
  const graduated = capabilities?.default_config.qualification_rule === GRADUATED_RULE

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
    form.resetFields()
    setCommitmentTemplate(item?.config.commitment_template ?? item?.config.reporting_policy?.commitment_template ?? null)
    form.setFieldsValue(item ? {
      chinese_name: item.chinese_name, description: item.description, home_cover_url: item.home_cover_url,
      status: item.status, expected_version: item.version || undefined,
    } : { status: 'draft' })
    setOpen(true)
  }

  const save = async () => {
    let values: RensheProjectWrite
    try { await form.validateFields(); values = form.getFieldsValue(true) } catch { return }
    setSaving(true)
    try {
      if (values.status === 'available' && !commitmentTemplate) {
        setSaveError('请先上传承诺书模板；暂未提供时可先保存草稿')
        return
      }
      const payload = {
        ...values,
        expected_version: editing?.version || undefined,
        config: capabilities ? { ...structuredClone(capabilities.default_config), commitment_template: commitmentTemplate } : undefined,
      }
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
    <Form.Item name='description' label='项目介绍'><Input.TextArea rows={3} maxLength={512} showCount /></Form.Item>
    <Form.Item name='home_cover_url' label='首页认证横幅'>{readOnly ? (editing?.home_cover_url ? <img src={editing.home_cover_url} alt='项目封面' style={{ maxWidth: '100%', maxHeight: 180 }} /> : <Text type='secondary'>未上传封面</Text>) : <ImageUpload crop={{ width: 1404, height: 640, title: '首页认证横幅', fixed: true }} hint='首页认证专区通栏大图；固定裁剪输出 1404 × 640 px。' />}</Form.Item>
    <Form.Item name='status' label='配置状态'><Select options={Object.entries(STATUS).map(([value, meta]) => ({ value, label: meta.label }))} /></Form.Item>
    <Text type='secondary'>报名规则、材料清单和导出口径由系统维护。项目变更生成新版本；已发布批次和历史报名继续使用创建时冻结的要求。</Text>
    <Collapse
      bordered={false}
      defaultActiveKey={['requirements', 'export']}
      items={[
        { key: 'requirements', label: '报考要求（只读）', children: <AdmissionRequirements requirements={capabilities?.admission_requirements} /> },
        { key: 'export', label: '导出说明与承诺书模板', children: <ExportInstructions instructions={capabilities?.export_instructions} required={graduated && projectStatus === 'available'} readOnly={readOnly} commitmentTemplate={commitmentTemplate} onCommitmentTemplateChange={setCommitmentTemplate} /> },
      ]}
    />
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
        {basic}
      </Form>
    </Modal>
  </>
}
