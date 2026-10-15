import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  AuditOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileDoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ConsultationGroupDialog } from '@/components/ConsultationGroupDialog'
import { ConfirmButton } from '@/components/ConfirmButton'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { certificationService } from '@/services/certification'
import { rensheService } from '@/services/renshe'
import type { RensheProject } from '@/types/rensheProject'
import type { CertificationPlan, CertificationPlanPayload } from '@/types/certification'
import { PLAN_STATUS_MAP } from '@/types/certification'
import type { RensheCleanupRun } from '@/types/renshe'
import { formatDate, formatPrice } from '@/utils/format'
import type { CertType } from '../type-registry'

const { RangePicker } = DatePicker
const { Text } = Typography

interface BatchOverridesProps {
  type: CertType
  productCode?: string | null
}

interface PlanFormValues {
  project_code: string
  project_config_id?: number
  exam_type?: string
  application_type?: string
  name: string
  apply_range?: [Dayjs, Dayjs]
  price_yuan: number
  capacity: number
  exam_date?: Dayjs | null
  exam_location?: string
  description?: string
  contact_name?: string
  contact_phone?: string
  sort_order: number
}

const CLEANUP_STATUS_MAP: Record<string, { text: string; color: string }> = {
  scheduled: { text: '等待清理', color: 'default' },
  running: { text: '清理中', color: 'processing' },
  paused: { text: '已暂停', color: 'orange' },
  succeeded: { text: '已完成', color: 'green' },
  failed: { text: '失败', color: 'red' },
}

function toFormValues(plan: CertificationPlan): PlanFormValues {
  return {
    project_code: plan.product_type,
    project_config_id: plan.renshe_config_id ?? undefined,
    exam_type: plan.exam_type,
    application_type: plan.application_type,
    name: plan.name,
    apply_range: plan.apply_start && plan.apply_end ? [dayjs(plan.apply_start), dayjs(plan.apply_end)] : undefined,
    price_yuan: plan.price_cents / 100,
    capacity: plan.capacity,
    exam_date: plan.exam_date ? dayjs(plan.exam_date) : null,
    exam_location: plan.exam_location || undefined,
    description: plan.description || undefined,
    contact_name: plan.contact_name || undefined,
    contact_phone: plan.contact_phone || undefined,
    sort_order: plan.sort_order,
  }
}

function toPayload(values: PlanFormValues): CertificationPlanPayload {
  const [applyStart, applyEnd] = values.apply_range!
  return {
    name: values.name.trim(),
    apply_start: applyStart.toISOString(),
    apply_end: applyEnd.toISOString(),
    price_cents: Math.round(values.price_yuan * 100),
    capacity: values.capacity,
    exam_date: values.exam_date?.toISOString() || null,
    exam_location: values.exam_location?.trim() || null,
    description: values.description?.trim() || null,
    contact_name: values.contact_name?.trim() || null,
    contact_phone: values.contact_phone?.trim() || null,
    sort_order: values.sort_order,
  }
}

export default function BatchOverrides(_props: BatchOverridesProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState<CertificationPlan[]>([])
  const [projects, setProjects] = useState<RensheProject[]>([])
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>()
  const [projectFilter, setProjectFilter] = useState<number | undefined>(() => Number(searchParams.get('project_id')) || undefined)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CertificationPlan | null>(null)
  const [cleanupPlan, setCleanupPlan] = useState<CertificationPlan | null>(null)
  const [consultationPlan, setConsultationPlan] = useState<CertificationPlan | null>(null)
  const [cleanupRuns, setCleanupRuns] = useState<RensheCleanupRun[]>([])
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [form] = Form.useForm<PlanFormValues>()
  const projectCode = Form.useWatch('project_code', form)
  const configId = Form.useWatch('project_config_id', form)
  const selectedProject = projects.find(item => item.code === projectCode)
  const coreLocked = Boolean(editingPlan?.published_at)
  const selectedConfig = editingPlan && configId === editingPlan.renshe_config_id && projectCode === editingPlan.product_type ? editingPlan.renshe_config : selectedProject?.config
  const canWrite = usePermission('user:write')
  const { admin } = useAuth()
  const isSuperAdmin = admin?.role === 'super_admin'

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      setPlans(await rensheService.listBatches())
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载人社批次失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProjects = useCallback(async () => {
    try { setProjects(await rensheService.listProjects()) }
    catch (error) { message.error(error instanceof Error ? error.message : '加载报考项目失败') }
  }, [])

  useEffect(() => {
    void loadPlans()
    void loadProjects()
  }, [loadPlans, loadProjects, searchParams.get('tab')])

  useEffect(() => { setProjectFilter(Number(searchParams.get('project_id')) || undefined) }, [searchParams])

  const openCreate = () => {
    setEditingPlan(null)
    form.resetFields()
    form.setFieldsValue({ price_yuan: 500, capacity: 0, sort_order: 0 })
    const available = projects.filter(item => item.status === 'available')
    const preferred = available.find(item => item.id === projectFilter) ?? (available.length === 1 ? available[0] : undefined)
    if (preferred) selectProject(preferred.code)
    setModalOpen(true)
  }

  const selectProject = (code: string) => {
    const project = projects.find(item => item.code === code)
    form.setFieldsValue({ project_code: code, project_config_id: project?.config_id ?? undefined,
      exam_type: project?.config.exam_types.length === 1 ? project.config.exam_types[0] : undefined,
      application_type: project?.config.application_types.length === 1 ? project.config.application_types[0] : undefined })
  }

  useEffect(() => {
    const requestedProject = Number(searchParams.get('project_id'))
    if (searchParams.get('create') === '1' && projects.some(item => item.id === requestedProject && item.status === 'available') && canWrite) {
      openCreate()
      const next = new URLSearchParams(searchParams); next.delete('create'); setSearchParams(next, { replace: true })
    }
  }, [searchParams, projects, canWrite])

  const openEdit = (plan: CertificationPlan) => {
    setEditingPlan(plan)
    form.setFieldsValue(toFormValues(plan))
    setModalOpen(true)
  }

  const submitPlan = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = toPayload(values)
      if (editingPlan) {
        const { name: _name, ...publishedPayload } = payload
        await certificationService.updatePlan(editingPlan.product_type, editingPlan.id, {
          ...(coreLocked ? publishedPayload : payload),
          ...(editingPlan.status === 'draft'
            ? { project_code: values.project_code, project_config_id: values.project_config_id, exam_type: values.exam_type, application_type: values.application_type }
            : {}),
        })
        message.success('批次已更新')
      } else {
        await certificationService.createPlan(values.project_code, {
          ...payload,
          project_config_id: values.project_config_id, exam_type: values.exam_type, application_type: values.application_type,
        })
        message.success('批次已创建')
      }
      setModalOpen(false)
      await loadPlans()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存人社批次失败')
    } finally {
      setSaving(false)
    }
  }

  const mutatePlan = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action()
      message.success(successMessage)
      await loadPlans()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批次操作失败')
      throw error
    }
  }

  const confirmImpactAction = (plan: CertificationPlan, action: 'cancel' | 'finalize') => {
    const isFinalize = action === 'finalize'
    Modal.confirm({
      title: `${isFinalize ? '终结' : '取消'}批次「${plan.name}」`,
      width: 520,
      content: (
        <List
          size="small"
          dataSource={[
            '未支付订单将关闭',
            '已支付订单将进入逐名退款',
            ...(isFinalize ? ['终结后开始批次级清理倒计时'] : []),
          ]}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      ),
      okText: isFinalize ? '确认终结' : '确认取消',
      okButtonProps: { danger: true },
      onOk: () => mutatePlan(
        () => isFinalize
          ? certificationService.finalizePlan(plan.product_type, plan.id)
          : certificationService.cancelPlan(plan.product_type, plan.id),
        isFinalize ? '批次已终结' : '批次已取消',
      ),
    })
  }

  const loadCleanupRuns = useCallback(async (plan: CertificationPlan) => {
    setCleanupLoading(true)
    try {
      setCleanupRuns(await rensheService.listCleanupRuns(plan.id))
    } finally {
      setCleanupLoading(false)
    }
  }, [])

  const openCleanup = (plan: CertificationPlan) => {
    setCleanupPlan(plan)
    setCleanupRuns([])
    void loadCleanupRuns(plan)
  }

  const openWorkbench = (plan: CertificationPlan) => {
    navigate(`/admin/certification/renshe/batches/${plan.id}`)
  }

  const retryCleanup = async (run: RensheCleanupRun) => {
    await rensheService.retryCleanupRun(run.id)
    message.success('清理任务已重新排队')
    if (cleanupPlan) await loadCleanupRuns(cleanupPlan)
  }

  const cleanupColumns = useMemo<ColumnsType<RensheCleanupRun>>(() => [
    { title: '轮次', dataIndex: 'run_no', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const config = CLEANUP_STATUS_MAP[status]
        return <Tag color={config?.color}>{config?.text ?? status}</Tag>
      },
    },
    { title: '计划时间', dataIndex: 'due_at', width: 170, render: (value: string) => formatDate(value) },
    { title: '心跳时间', dataIndex: 'heartbeat_at', width: 170, render: (value: string | null) => value ? formatDate(value) : '-' },
    { title: '重试', dataIndex: 'retry_count', width: 70 },
    { title: '顺延', dataIndex: 'rebase_count', width: 70 },
    {
      title: '失败/暂停原因',
      ellipsis: true,
      render: (_, run) => run.last_error || run.paused_reason || '-',
    },
    ...(isSuperAdmin ? [{
      title: '操作',
      width: 90,
      render: (_: unknown, run: RensheCleanupRun) => (
        ['failed', 'paused'].includes(run.status) ? (
          <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => retryCleanup(run)}>
            重试
          </Button>
        ) : null
      ),
    }] : []),
  ], [isSuperAdmin])

  const columns = useMemo<ColumnsType<CertificationPlan>>(() => [
    { title: '批次', dataIndex: 'id', width: 80, render: (id: number) => `#${id}` },
    {
      title: '名称',
      dataIndex: 'name',
      width: 210,
      ellipsis: true,
      render: (value: string, plan) => (
        <Button type='link' size='small' style={{ padding: 0 }} onClick={() => openWorkbench(plan)}>
          {value}
        </Button>
      ),
    },
    {
      title: '报考项目',
      width: 210,
      ellipsis: true,
      render: (_, plan) => (
        <Space direction='vertical' size={0}>
          <Text>{plan.project_name || projects.find(item => item.code === plan.product_type)?.chinese_name || '待核实'}</Text>
          <Text type='secondary'>{plan.occupation_name || '待核实'} · {plan.skill_level || '待核实'}</Text>
        </Space>
      ),
    },
    {
      title: '报名时间',
      width: 250,
      render: (_, plan) => `${plan.apply_start ? formatDate(plan.apply_start, 'YYYY-MM-DD HH:mm') : '-'} ~ ${plan.apply_end ? formatDate(plan.apply_end, 'YYYY-MM-DD HH:mm') : '-'}`,
    },
    { title: '价格', dataIndex: 'price_cents', width: 100, render: (value: number) => formatPrice(value) },
    {
      title: '名额',
      width: 100,
      render: (_, plan) => `${plan.enrolled}/${plan.capacity || '不限'}`,
    },
    { title: '考试时间', dataIndex: 'exam_date', width: 160, render: (value: string | null) => value ? formatDate(value, 'YYYY-MM-DD HH:mm') : '-' },
    { title: '考试地点', dataIndex: 'exam_location', width: 160, ellipsis: true, render: (value: string | null) => value || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: CertificationPlan['status']) => {
        const config = PLAN_STATUS_MAP[status]
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    {
      title: '操作',
      width: 300,
      fixed: 'right',
      render: (_, plan) => (
        <Space size={0} wrap>
          <Button type='primary' ghost size='small' onClick={() => openWorkbench(plan)}>
            管理报名
          </Button>
          {canWrite && !['cancelled', 'archived'].includes(plan.status) && (
            <Button type='link' size='small' onClick={() => setConsultationPlan(plan)}>
              咨询群
            </Button>
          )}
          {canWrite && plan.status === 'draft' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(plan)}>编辑</Button>
              <ConfirmButton
                title="发布批次"
                description="发布后进入报名流程，确认发布？"
                type="link"
                size="small"
                icon={<SendOutlined />}
                onConfirm={() => mutatePlan(
                  () => certificationService.publishPlan(plan.product_type, plan.id),
                  '批次已发布',
                )}
              >
                发布
              </ConfirmButton>
              <ConfirmButton
                title="删除草稿批次"
                description="确认删除该草稿批次？"
                danger
                type="link"
                size="small"
                icon={<DeleteOutlined />}
                onConfirm={() => mutatePlan(
                  () => certificationService.deletePlan(plan.product_type, plan.id),
                  '批次已删除',
                )}
              >
                删除
              </ConfirmButton>
            </>
          )}
          {canWrite && plan.status === 'published' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(plan)}>编辑</Button>
              <ConfirmButton
                title="关闭报名"
                description="关闭后不再接受新报名，确认关闭？"
                type="link"
                size="small"
                icon={<StopOutlined />}
                onConfirm={() => mutatePlan(
                  () => certificationService.closeRegistration(plan.product_type, plan.id),
                  '报名已关闭',
                )}
              >
                关闭报名
              </ConfirmButton>
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />} onClick={() => confirmImpactAction(plan, 'cancel')}>
                取消批次
              </Button>
            </>
          )}
          {plan.status === 'registration_closed' && isSuperAdmin && (
            <Button type="link" size="small" danger icon={<FileDoneOutlined />} onClick={() => confirmImpactAction(plan, 'finalize')}>
              终结批次
            </Button>
          )}
          {canWrite && plan.status === 'finalized' && (
            <ConfirmButton
              title="归档批次"
              description="归档后批次只读，确认归档？"
              type="link"
              size="small"
              onConfirm={() => mutatePlan(
                () => certificationService.archivePlan(plan.product_type, plan.id),
                '批次已归档',
              )}
            >
              归档
            </ConfirmButton>
          )}
          {(plan.cleanup_due_at || ['finalized', 'archived'].includes(plan.status)) && (
            <Button type="link" size="small" icon={<AuditOutlined />} onClick={() => openCleanup(plan)}>
              清理记录
            </Button>
          )}
        </Space>
      ),
    },
  ], [canWrite, isSuperAdmin, projects])

  return (
    <>
      <Space wrap style={{ marginBottom: 16, width: '100%' }}>
        {canWrite && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!projects.some(item => item.status === 'available')}
            onClick={openCreate}
          >
            新建批次
          </Button>
        )}
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => { void loadPlans(); void loadProjects() }}>刷新</Button>
        <Input.Search allowClear placeholder='搜索批次名称' style={{ width: 220 }} onChange={event => setKeyword(event.target.value)} />
        <Select allowClear placeholder='报考项目' style={{ width: 240 }} value={projectFilter} onChange={setProjectFilter} options={projects.map(item => ({ value: item.id, label: item.chinese_name }))} />
        <Select allowClear placeholder='批次状态' style={{ width: 140 }} value={statusFilter} onChange={setStatusFilter} options={Object.entries(PLAN_STATUS_MAP).map(([value, meta]) => ({ value, label: meta.text }))} />
      </Space>

      {canWrite && !projects.some(item => item.status === 'available') && (
        <Alert
          style={{ marginBottom: 16 }}
          type='info'
          showIcon
          message='请先在“报考项目”中完善配置并设置为可用，再创建批次。'
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={plans.filter(plan => plan.name.includes(keyword.trim()) && (!statusFilter || plan.status === statusFilter) && (!projectFilter || projects.find(item => item.id === projectFilter)?.code === plan.product_type))}
        loading={loading}
        pagination={false}
        scroll={{ x: 1650 }}
      />

      <Modal
        title={editingPlan ? '编辑人社批次' : '新建人社批次'}
        open={modalOpen}
        width={760}
        styles={{ body: { maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingRight: 8 } }}
        okText="保存"
        okButtonProps={{ loading: saving }}
        onOk={submitPlan}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name='project_code' label='报考项目' rules={[{ required: true, message: '请选择报考项目' }]}>
            <Select showSearch optionFilterProp='label' disabled={coreLocked} placeholder='选择本期报考项目' onChange={code => { selectProject(code); if (editingPlan) message.info('已重新加载项目配置，请检查考试类型、申报类型及本期安排') }} options={projects.filter(item => item.status === 'available' || item.code === editingPlan?.product_type).map(item => ({ value: item.code, label: item.chinese_name, disabled: item.status !== 'available' && item.code !== editingPlan?.product_type }))} />
          </Form.Item>
          <Form.Item name='project_config_id' hidden><InputNumber /></Form.Item>
          {selectedConfig && <>
            <Alert style={{ marginBottom: 16 }} type='info' showIcon message={`${selectedConfig.occupation_name} · ${selectedConfig.skill_level}`} description={`学历型报名；${selectedConfig.materials.filter(item => item.required).length} 类必填材料；发布后固定本期项目配置，不能更换项目及核心报考属性。`} />
            {!coreLocked && editingPlan && selectedProject?.config_id !== editingPlan.renshe_config_id && configId === editingPlan.renshe_config_id && <Alert style={{ marginBottom: 16 }} type='warning' showIcon message={`项目存在新配置 V${selectedProject?.version}，本草稿仍使用原版本。`} action={<Button size='small' onClick={() => selectProject(projectCode)}>更新为最新配置</Button>} />}
            <Space align='start' style={{ display: 'flex' }} size={16}>
              <Form.Item name='exam_type' label='本期考试类型' rules={[{ required: true, message: '请选择考试类型' }]} style={{ flex: 1 }}><Select disabled={coreLocked} options={selectedConfig.exam_types.map(value => ({ value, label: value }))} /></Form.Item>
              <Form.Item name='application_type' label='本期申报类型' rules={[{ required: true, message: '请选择申报类型' }]} style={{ flex: 1 }}><Select disabled={coreLocked} options={selectedConfig.application_types.map(value => ({ value, label: value }))} /></Form.Item>
            </Space>
          </>}
          <Form.Item name="name" label="批次名称" rules={[{ required: true, whitespace: true, message: '请输入批次名称' }]}>
            <Input maxLength={128} showCount disabled={coreLocked} />
          </Form.Item>
          <Form.Item
            name="apply_range"
            label="报名时间"
            rules={[
              { required: true, message: '请选择报名时间' },
              {
                validator: (_, value: [Dayjs, Dayjs] | undefined) => (
                  value?.[0]?.isBefore(value?.[1]) ? Promise.resolve() : Promise.reject(new Error('报名开始时间必须早于截止时间'))
                ),
              },
            ]}
          >
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Space align="start" style={{ display: 'flex' }} size={16}>
            <Form.Item name="price_yuan" label="价格（元）" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="capacity" label="名额（0 表示不限）" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sort_order" label="排序" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="exam_date" label="考试时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="exam_location" label="考试地点">
            <Input maxLength={256} />
          </Form.Item>
          <Form.Item name="description" label="报名说明">
            <Input.TextArea rows={4} maxLength={5000} showCount />
          </Form.Item>
          <Space align="start" style={{ display: 'flex' }} size={16}>
            <Form.Item name="contact_name" label="联系人" style={{ flex: 1 }}>
              <Input maxLength={64} />
            </Form.Item>
            <Form.Item
              name="contact_phone"
              label="联系电话"
              style={{ flex: 1 }}
              rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }]}
            >
              <Input maxLength={20} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Drawer
        title={cleanupPlan ? `批次清理记录 · ${cleanupPlan.name}` : '批次清理记录'}
        open={Boolean(cleanupPlan)}
        onClose={() => setCleanupPlan(null)}
        width="min(980px, 92vw)"
        extra={cleanupPlan && <Button icon={<ReloadOutlined />} loading={cleanupLoading} onClick={() => loadCleanupRuns(cleanupPlan)}>刷新</Button>}
      >
        {cleanupPlan?.cleanup_due_at && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            清理期限：{formatDate(cleanupPlan.cleanup_due_at)}
          </Text>
        )}
        <Table
          rowKey="id"
          columns={cleanupColumns}
          dataSource={cleanupRuns}
          loading={cleanupLoading}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Drawer>

      <ConsultationGroupDialog
        open={Boolean(consultationPlan)}
        planId={consultationPlan?.id ?? null}
        batchName={consultationPlan?.name ?? ''}
        onClose={() => setConsultationPlan(null)}
      />
    </>
  )
}
