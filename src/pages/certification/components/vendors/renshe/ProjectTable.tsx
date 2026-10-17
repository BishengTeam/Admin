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
import { ExportInstructions, CommitmentTemplateUpload } from './ExportInstructions'

const { Text } = Typography
const STATUS = { draft: { label: '草稿', color: 'default' }, available: { label: '可用', color: 'success' }, disabled: { label: '已停用', color: 'default' } }
const GRADUATED_RULE = 'related_major_graduated_degree_v1'
type ProjectFormValues = RensheProjectWrite & { occupation_name?: string; application_type?: string }

function AdmissionRequirements({ requirements }: { requirements?: RensheCapabilities['admission_requirements'] }) {
  if (!requirements) return <Alert type='info' showIcon message='选择职业和技能等级后显示对应报考要求；已有项目若未显示要求，请更新后端后刷新。' />
  const scope = requirements.scope
  return <Space direction='vertical' size={16} style={{ width: '100%' }}>
    <section>
      <Typography.Title level={5}>适用范围</Typography.Title>
      <Space direction='vertical' size={4}>
        <Text>职业：{scope.occupation_name}（{scope.skill_level}，导出等级：{scope.export_skill_level}）</Text>
        <Text>申报方式：{scope.application_types.join('、')}；{scope.qualification_rule === GRADUATED_RULE ? '仅接受已取得毕业证的申请人' : scope.qualification_rule === 'unadapted' ? '待适配，仅可保存草稿' : '历史报名规则，按原项目要求办理'}</Text>
        <Text>考试类型：{scope.exam_types.join('、')}</Text>
        <Text type='secondary'>职业代码：{scope.occupation_code}</Text>
      </Space>
    </section>
    {requirements.rule_profile?.source_conditions && <section>
      <Typography.Title level={5}>资料依据与本期限制</Typography.Title>
      {requirements.rule_profile.source_conditions.map(item => <Typography.Paragraph key={item}>{item}</Typography.Paragraph>)}
      <Typography.Paragraph>相关专业：{requirements.rule_profile.related_majors}</Typography.Paragraph>
      <Typography.Paragraph>相关职业：{requirements.rule_profile.related_occupations}</Typography.Paragraph>
      {requirements.rule_profile.project_limits?.map(item => <Typography.Paragraph key={item} type='warning'>{item}</Typography.Paragraph>)}
      {requirements.rule_profile.sources?.map(item => <Typography.Paragraph key={item} type='secondary'>{item}</Typography.Paragraph>)}
    </section>}
    <section>
      <Typography.Title level={5}>报名信息</Typography.Title>
      <Space wrap>{requirements.form_sections.map(item => <Tag key={item}>{item}</Tag>)}</Space>
      <Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
        文化程度为如实填报选项：{requirements.education_options.map(item => item.label).join('、')}。是否符合资格，须按本项目学历、院校、专业及初审要求核验。
      </Typography.Paragraph>
      <Space wrap style={{ marginTop: 8 }}>{requirements.institution_types.map(item => <Tag key={item.value}>{item.label}</Tag>)}</Space>
    </section>
    <section>
      <Typography.Title level={5}>必交材料</Typography.Title>
      {scope.qualification_rule === 'unadapted' && <Alert type='warning' message='该组合材料、资格及审核规则尚未适配，不采用其他产品的默认清单。' />}
      <Table
        rowKey='kind'
        pagination={false}
        size='small'
        dataSource={requirements.materials}
        columns={[
          { title: '材料', dataIndex: 'name' },
          { title: '格式', dataIndex: 'extensions', render: (values: string[]) => values.join(' / ') },
          { title: '大小', dataIndex: 'max_size_bytes', width: 110, render: (value: number) => formatBytes(value) },
          { title: '要求', render: (_, item) => `${item.required ? '必填' : '选填'} · 最多 ${item.max_count} 个文件` },
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
  const [form] = Form.useForm<ProjectFormValues>()
  const projectStatus = Form.useWatch('status', form)
  const occupationName = Form.useWatch('occupation_name', form)
  const skillLevel = Form.useWatch('skill_level', form)
  const applicationType = Form.useWatch('application_type', form)
  const programs = capabilities?.combinations ?? capabilities?.supported_programs?.map(item => ({ ...item, application_type: item.config.application_types[0], adapted: true, missing: [] as string[], selection_id: item.config.selection_id, occupation_title: item.occupation_name })) ?? []
  const selectedProgram = programs.find(item => item.occupation_name === occupationName && item.skill_level === skillLevel && item.application_type === applicationType)
  const unchangedSelection = Boolean(editing && editing.config.occupation_name === occupationName && editing.config.skill_level === skillLevel && editing.config.application_types[0] === applicationType)
  const activeConfig = unchangedSelection ? editing?.config : selectedProgram?.config
  const requirements = unchangedSelection ? editing?.admission_requirements : selectedProgram?.admission_requirements
  const graduated = activeConfig?.qualification_rule === GRADUATED_RULE
  const selectionLocked = readOnly || Boolean(editing?.batch_count)
  const occupationOptions = Array.from(new Map(programs.map(item => [item.occupation_name, { value: item.occupation_name, label: item.occupation_title === item.occupation_name ? item.occupation_name : `${item.occupation_title}／${item.occupation_name}` }])).values())
  if (editing && !occupationOptions.some(item => item.value === editing.config.occupation_name)) {
    occupationOptions.push({ value: editing.config.occupation_name, label: `${editing.config.occupation_name || '未配置职业'}（历史配置）` })
  }
  const levelOptions = Array.from(new Map(programs.filter(item => item.occupation_name === occupationName).map(item => [item.skill_level, { value: item.skill_level, label: `${item.export_skill_level}／${item.skill_level}` }])).values())
  if (editing && occupationName === editing.config.occupation_name && !levelOptions.some(item => item.value === editing.config.skill_level)) {
    levelOptions.push({ value: editing.config.skill_level, label: `${editing.config.export_skill_level}／${editing.config.skill_level}（历史配置）` })
  }
  const typeOptions = programs.filter(item => item.occupation_name === occupationName && item.skill_level === skillLevel).map(item => ({ value: item.application_type, label: `${item.application_type}（${item.adapted ? '已适配' : '待适配'}）` }))
  if (unchangedSelection && applicationType && !typeOptions.some(item => item.value === applicationType)) typeOptions.push({ value: applicationType, label: `${applicationType}（历史配置）` })
  const historicalProfile = unchangedSelection && selectedProgram?.selection_id !== activeConfig?.selection_id
  const canEnable = unchangedSelection ? editing?.status === 'available' || (selectedProgram?.adapted && !historicalProfile) : selectedProgram?.adapted

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
      occupation_name: item.config.occupation_name, skill_level: item.config.skill_level,
      application_type: item.config.application_types[0],
    } : { status: 'draft' })
    setOpen(true)
  }

  const save = async (targetStatus: RensheProject['status'] = 'draft') => {
    let values: ProjectFormValues
    try { await form.validateFields(); values = form.getFieldsValue(true) } catch { return }
    setSaving(true)
    try {
      if (!unchangedSelection && !selectedProgram) {
        setSaveError('请选择有资料依据的职业／工种、技能等级和申报类型')
        return
      }
      if (targetStatus === 'available' && !canEnable) { setSaveError('该组合尚未适配，仅可保存草稿'); return }
      if (graduated && targetStatus === 'available' && !commitmentTemplate) {
        setSaveError('请先上传承诺书模板；暂未提供时可先保存草稿')
        return
      }
      const payload = {
        chinese_name: values.chinese_name, description: values.description,
        home_cover_url: values.home_cover_url, status: targetStatus,
        ...(selectedProgram?.selection_id ? { selection_id: selectedProgram.selection_id } : unchangedSelection ? {} : { occupation_code: activeConfig?.occupation_code, skill_level: values.skill_level }),
        expected_version: editing?.version || undefined,
        commitment_template: commitmentTemplate,
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
    { title: '项目名称', dataIndex: 'chinese_name', ellipsis: true, render: (name, item) => <Space direction='vertical' size={0}><Button type='link' style={{ padding: 0 }} onClick={() => edit(item, true)}>{name}</Button>{Boolean(item.review_notices?.length) && <Text type='warning'>名称与实际组合待核查</Text>}</Space> },
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
        await rensheService.updateProject(item.id, { chinese_name: item.chinese_name, description: item.description, home_cover_url: item.home_cover_url, status: 'disabled', expected_version: item.version })
        message.success('项目已停用')
      })}>停用</ConfirmButton>}
      {canWrite && item.status === 'draft' && item.batch_count === 0 && <ConfirmButton type='link' size='small' danger title='删除草稿项目' description='确认删除这个尚无批次引用的草稿项目？' onConfirm={() => mutateProject(() => rensheService.deleteProject(item.id))}>删除</ConfirmButton>}
    </Space> },
  ]

  const basic = <>
    <Divider orientation='left' orientationMargin={0}>报考设置</Divider>
    <Form.Item name='occupation_name' label='职业／工种' rules={[{ required: true, message: '请选择已适配的职业／工种' }]}>
      <Select placeholder='请选择职业及具体工种' options={occupationOptions} disabled={selectionLocked} onChange={name => {
        const compatible = programs.filter(item => item.occupation_name === name && item.skill_level === skillLevel)
        if (!compatible.length) { form.setFieldValue('skill_level', undefined); form.setFieldValue('application_type', undefined); if (skillLevel) message.info('职业已变化，请重新选择适用等级和申报类型') }
        else if (!compatible.some(item => item.application_type === applicationType)) { form.setFieldValue('application_type', undefined); if (applicationType) message.info('原申报类型不适用于当前选择，请重新选择') }
      }} />
    </Form.Item>
    <Form.Item name='skill_level' label='技能等级' rules={[{ required: true, message: '请选择该职业支持的技能等级' }]}>
      <Select placeholder='请选择技能等级' options={levelOptions} disabled={selectionLocked || !occupationName} onChange={level => {
        if (!programs.some(item => item.occupation_name === occupationName && item.skill_level === level && item.application_type === applicationType)) { form.setFieldValue('application_type', undefined); if (applicationType) message.info('原申报类型不适用于当前等级，请重新选择') }
      }} />
    </Form.Item>
    <Form.Item name='application_type' label='申报类型' rules={[{ required: true, message: '请选择该职业和等级对应的申报类型' }]}><Select placeholder='请选择申报类型' options={typeOptions} disabled={selectionLocked || !skillLevel} /></Form.Item>
    {historicalProfile && <Alert type='warning' showIcon message='本产品保留历史资格与材料配置；新招生请创建采用当前规则的新产品，不通过修改展示信息替换历史要求。' style={{ marginBottom: 16 }} />}
    <Alert type={selectedProgram && !selectedProgram.adapted ? 'warning' : 'info'} showIcon message={selectedProgram ? `${selectedProgram.adapted ? (commitmentTemplate ? '已适配，可启用' : '已适配，缺少承诺书模板') : '该组合尚未适配，仅可保存草稿'}：${selectedProgram.occupation_name}／${selectedProgram.export_skill_level}／${selectedProgram.application_type}` : '当前仅信息安全管理员四级／中级工学历型可启用；其他有资料依据的组合可保存草稿。'} description={selectedProgram && !selectedProgram.adapted ? selectedProgram.missing.join('；') : graduated && !commitmentTemplate ? '请上传甲方确认的承诺书模板；暂未提供时仅可保存草稿。' : '同一组合的时间、价格、地点不同请创建多个批次；已有批次的产品不能更换报考组合。'} style={{ marginBottom: 16 }} />
    {activeConfig && <Typography.Paragraph type='secondary'>职业代码：{activeConfig.occupation_code}；等级导出值：{activeConfig.export_skill_level}（系统自动带入）</Typography.Paragraph>}
    <Divider orientation='left' orientationMargin={0}>展示信息</Divider>
    <Form.Item name='chinese_name' label='项目名称' rules={[{ required: true, whitespace: true, message: '请输入项目名称' }]}><Input maxLength={128} placeholder='请输入产品名称，不影响实际报考组合' /></Form.Item>
    <Form.Item name='description' label='项目介绍'><Input.TextArea rows={3} maxLength={512} showCount /></Form.Item>
    <Form.Item name='home_cover_url' label='首页认证横幅'>{readOnly ? (editing?.home_cover_url ? <img src={editing.home_cover_url} alt='项目封面' style={{ maxWidth: '100%', maxHeight: 180 }} /> : <Text type='secondary'>未上传封面</Text>) : <ImageUpload crop={{ width: 1404, height: 640, title: '首页认证横幅', fixed: true }} hint='首页认证专区通栏大图；固定裁剪输出 1404 × 640 px。' />}</Form.Item>
    <Divider orientation='left' orientationMargin={0}>承诺书模板</Divider>
    <Typography.Paragraph type='secondary'>上传甲方确认的 PDF／DOCX（≤10 MB），保存后供申请人下载、签字按手印并上传。</Typography.Paragraph>
    <CommitmentTemplateUpload value={commitmentTemplate ?? undefined} disabled={readOnly} onChange={setCommitmentTemplate} />
    <Text type='secondary'>报名规则、材料清单和导出口径由系统维护。项目变更生成新版本；已发布批次和历史报名继续使用创建时冻结的要求。</Text>
    <Collapse
      bordered={false}
      defaultActiveKey={['requirements', 'export']}
      items={[
        { key: 'requirements', label: '报考要求（只读）', children: <AdmissionRequirements requirements={requirements} /> },
        { key: 'export', label: '导出说明', children: activeConfig?.qualification_rule === 'unadapted' ? <Alert type='warning' showIcon message='该组合的导出取值、字典及附件规则尚未适配，不能套用其他产品的文件树。' /> : activeConfig ? <ExportInstructions instructions={(unchangedSelection && editing?.export_instructions !== undefined ? editing.export_instructions : capabilities?.export_instructions) ?? undefined} required={graduated && projectStatus === 'available'} readOnly={readOnly} commitmentTemplate={commitmentTemplate} onCommitmentTemplateChange={setCommitmentTemplate} showCommitment={false} /> : <Text type='secondary'>选择完整报考组合后显示对应导出说明。</Text> },
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
    <Modal title={<Space><SafetyCertificateOutlined style={{ color: '#1677ff' }} /><span>{readOnly ? '查看报考项目' : editing ? '编辑报考项目' : '新增人社报考项目'}{editing?.version ? ` · V${editing.version}` : ''}</span></Space>} open={open} onCancel={() => setOpen(false)} width={760} styles={{ body: { maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingRight: 8 } }} destroyOnClose footer={readOnly ? <Button onClick={() => setOpen(false)}>关闭</Button> : <Space><Button onClick={() => setOpen(false)}>取消</Button><Button loading={saving} onClick={() => void save('draft')}>保存草稿</Button><Button type='primary' loading={saving} disabled={!canEnable || (graduated && !commitmentTemplate)} onClick={() => void save('available')}>保存并启用</Button></Space>}>
      <Form form={form} layout='vertical' disabled={readOnly} style={{ marginTop: 20 }} requiredMark='optional' preserve>
        {editing?.review_notices?.map(item => <Alert key={item} type='warning' showIcon message={item} style={{ marginBottom: 12 }} />)}
        {saveError && <Alert type='error' showIcon message={saveError} style={{ marginBottom: 16 }} />}
        {basic}
      </Form>
    </Modal>
  </>
}
