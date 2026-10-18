import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Alert,
  Checkbox,
  DatePicker,
  Collapse,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { CheckOutlined, CloseOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { rensheService } from '@/services/renshe'
import type {
  RensheApplicationDetail,
  RensheApplicationVersion,
  RensheMaterial,
  RensheReview,
  RensheReviewDecision,
  RensheReviewStage,
} from '@/types/renshe'
import { formatDate } from '@/utils/format'
import { refundErrorText } from '@/utils/refund'
import {
  formatBytes,
  isPdfMaterial,
  RENSHE_APPLICATION_STATUS_MAP,
  RENSHE_MATERIAL_LABELS,
  RENSHE_PAYMENT_STATUS_MAP,
  RENSHE_REVIEW_STAGE_LABELS,
} from '@/utils/renshe'
import MaterialPreview from './MaterialPreview'
import dayjs, { type Dayjs } from 'dayjs'
import { RENSHE_GRADUATED_CHECKS, RENSHE_DEGREE_CHECKS, RENSHE_EMPLOYMENT_CHECKS, RENSHE_GRADUATED_CHANGE_OPTIONS } from '@/utils/renshe'

const { Text, Title } = Typography
const ADDITIONAL_EDUCATION_LABELS: Record<string, string> = { primary: '小学', junior_high: '初中', senior_high: '高中', other: '其他' }

const SNAPSHOT_LABELS: Record<string, string> = {
  cultural_education: '文化程度', occupation_name: '证书职业／工种', grade: '证书等级', issued_on: '证书取得日期',
  real_name: '姓名',
  id_card: '身份证号',
  id_card_number: '身份证号',
  phone: '手机号',
  contact_phone: '联系电话',
  education: '学历',
  school: '学校',
  major: '专业',
  mailing_address: '通讯地址',
  email: '邮箱',
  gender: '性别',
  birth_date: '出生日期',
  age_as_of: '年龄核算基准日（首次正式提交，北京时间）',
  ethnicity: '民族',
  political_status: '政治面貌', occupation_status: '从事职业', has_work_experience: '参加过工作',
  work_start_date: '参加工作日期', enrollment_date: '入学日期', occupation_years: '实际职业年限（年）',
  work_unit: '工作单位', social_insurance_unit: '社保参保单位',
  institution_type: '院校类型', graduation_date: '毕业日期', certificate_number: '证书编号', graduated: '已取得毕业证',
}

const REQUIRED_CHANGE_OPTIONS = Object.entries(RENSHE_MATERIAL_LABELS).map(([value, label]) => ({ value, label }))

interface ApplicationDetailDrawerProps {
  applicationId: number | null
  open: boolean
  onClose: () => void
  onChanged?: () => void | Promise<void>
}

interface RejectionFormValues {
  reason: string
  required_changes: string[]
  correction_due_at?: Dayjs
}

interface CorrectionFormValues {
  to_decision: RensheReviewDecision
  reason: string
}

function renderStatus(status: string, map: Record<string, { text: string; color: string }>) {
  const config = map[status]
  return <Tag color={config?.color}>{config?.text ?? status}</Tag>
}

function renderSnapshot(snapshot: Record<string, unknown>) {
  const entries = Object.entries(snapshot).filter(([, value]) => value != null && value !== '')
  if (entries.length === 0) return <Text type="secondary">暂无数据</Text>

  return (
    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
      {entries.map(([key, value]) => (
        <Descriptions.Item key={key} label={SNAPSHOT_LABELS[key] ?? key}>
          {typeof value === 'boolean' ? (value ? '是' : '否') : typeof value === 'object' ? JSON.stringify(value) : ({ ...ADDITIONAL_EDUCATION_LABELS, technical: '技工院校', vocational: '中等及以上职业院校', general_higher: '普通高等学校', secondary_vocational: '中专', technical_school: '技校', vocational_high: '职高', higher_vocational: '高职', associate: '大专', bachelor: '大学本科', master: '硕士', doctorate: '博士', student: '学生', social: '社会人员', enterprise: '企业人员' } as Record<string, string>)[String(value)] || String(value)}
        </Descriptions.Item>
      ))}
    </Descriptions>
  )
}

function EmploymentSnapshot({ info }: { info: Record<string, unknown> }) {
  const entries = (info.work_experiences || []) as Array<Record<string, unknown>>
  return <>
    {renderSnapshot({ cultural_education: info.cultural_education })}
    {Boolean(info.skill_certificate) && <><Title level={5}>五级技能证书</Title>{renderSnapshot({ ...info.skill_certificate as Record<string, unknown>, grade: '五级／初级工' })}</>}
    <Title level={5}>逐段工作经历</Title>
    <Table size='small' pagination={false} rowKey={(_, index) => String(index)} dataSource={entries} scroll={{ x: 700 }} columns={[
      { title: '工作单位', dataIndex: 'work_unit' }, { title: '岗位', dataIndex: 'position' },
      { title: '从事职业／工种', dataIndex: 'occupation_name' }, { title: '开始日期', dataIndex: 'start_date' },
      { title: '结束日期', dataIndex: 'end_date', render: value => value || '至今（按提交日期核算）' },
    ]} style={{ marginBottom: 16 }} />
  </>
}

export default function ApplicationDetailDrawer({
  applicationId,
  open,
  onClose,
  onChanged,
}: ApplicationDetailDrawerProps) {
  const navigate = useNavigate()
  const [detail, setDetail] = useState<RensheApplicationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [checks, setChecks] = useState<string[]>([])
  const levelFive = detail?.plan.renshe_config?.qualification_rule === 'level_five_employment_v1'
  const currentEligibility = detail?.versions.find(version => version.id === detail.current_version_id)?.form_data.eligibility_snapshot as Record<string, unknown> | undefined
  const employment = levelFive || detail?.plan.renshe_config?.qualification_rule === 'documented_employment_v1'
  const compound = detail?.plan.renshe_config?.application_types[0] === '复合型'
  const graduated = employment || detail?.plan.renshe_config?.qualification_rule === 'related_major_graduated_degree_v1'
  const reviewChecks: Record<string, string> = employment ? { ...RENSHE_EMPLOYMENT_CHECKS, ...(levelFive ? { age: '首次正式提交日（北京时间）年满16周岁，按本人实名出生日期核验', employment: '五级工龄型：实际从事相关职业，不设最低工作年数', social_security: '单位与工作单位一致，时间信息与经历相符，验证码完整有效且可验证' } : {}), ...(compound ? { certificate: '五级证书与同一材料内网查截图一致且可验证；证书取得后累计相关工作满3年' } : {}) } : detail?.plan.renshe_config?.materials.some(item => item.kind === 'registration_portrait') ? RENSHE_DEGREE_CHECKS : RENSHE_GRADUATED_CHECKS
  const graduatedChangeOptions = RENSHE_GRADUATED_CHANGE_OPTIONS.filter(item => employment ? !item.value.startsWith('education_info.') && (compound || !item.value.startsWith('qualification_info.skill_certificate.')) : !item.value.startsWith('qualification_info.')).filter(item => item.value.includes('.') || ['contact_phone', 'email', 'mailing_address'].includes(item.value) || detail?.plan.renshe_config?.materials.some(material => material.kind === item.value))
  const [rejectionStage, setRejectionStage] = useState<RensheReviewStage | null>(null)
  const [correctingReview, setCorrectingReview] = useState<RensheReview | null>(null)
  const [rejectionForm] = Form.useForm<RejectionFormValues>()
  const [correctionForm] = Form.useForm<CorrectionFormValues>()
  const canWrite = usePermission('renshe:review')
  const canViewRefunds = usePermission('order:list')
  const { admin } = useAuth()
  const isSuperAdmin = admin?.role === 'super_admin'

  const loadDetail = useCallback(async () => {
    if (!applicationId) return
    setLoading(true)
    try {
      setDetail(await rensheService.getApplication(applicationId))
      setChecks([])
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    if (open && applicationId) {
      setDetail(null)
      void loadDetail()
    }
  }, [applicationId, loadDetail, open])

  const finishMutation = async () => {
    await loadDetail()
    await onChanged?.()
  }

  const submitApprovedReview = (stage: RensheReviewStage) => {
    if (graduated && stage === 'initial' && checks.length !== Object.keys(reviewChecks).length) {
      message.warning('请先逐项完成当前申报路径的初审核验')
      return
    }
    Modal.confirm({
      title: `确认${RENSHE_REVIEW_STAGE_LABELS[stage]}通过`,
      content: '审核结果会绑定当前报名版本。',
      okText: '确认通过',
      onOk: async () => {
        if (!applicationId) return
        setReviewing(true)
        try {
          await rensheService.reviewApplication(applicationId, stage, { decision: 'approved', expected_version_id: detail?.current_version_id || undefined, ...(graduated && stage === 'initial' ? { checklist: Object.fromEntries(checks.map(key => [key, true])) } : {}) })
          message.success(`${RENSHE_REVIEW_STAGE_LABELS[stage]}已通过`)
          await finishMutation()
        } catch (error) {
          message.error(error instanceof Error ? error.message : '审核失败')
          throw error
        } finally {
          setReviewing(false)
        }
      },
    })
  }

  const submitRejectedReview = async () => {
    if (!applicationId || !rejectionStage) return
    const values = await rejectionForm.validateFields()
    setReviewing(true)
    try {
      await rensheService.reviewApplication(applicationId, rejectionStage, {
        decision: 'rejected',
        expected_version_id: detail?.current_version_id || undefined,
        reason: values.reason.trim(),
        required_changes: values.required_changes,
        correction_due_at: values.correction_due_at?.toISOString(),
      })
      message.success(`${RENSHE_REVIEW_STAGE_LABELS[rejectionStage]}已驳回`)
      setRejectionStage(null)
      rejectionForm.resetFields()
      await finishMutation()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '驳回失败')
    } finally {
      setReviewing(false)
    }
  }

  const submitCorrection = async () => {
    if (!correctingReview) return
    const values = await correctionForm.validateFields()
    setReviewing(true)
    try {
      await rensheService.correctReview(correctingReview.id, {
        to_decision: values.to_decision,
        reason: values.reason.trim(),
      })
      message.success('审核结果已更正')
      setCorrectingReview(null)
      correctionForm.resetFields()
      await finishMutation()
    } finally {
      setReviewing(false)
    }
  }

  const openCorrection = (review: RensheReview) => {
    setCorrectingReview(review)
    correctionForm.setFieldsValue({
      to_decision: review.decision === 'approved' ? 'rejected' : 'approved',
      reason: '',
    })
  }

  const materialColumns = useMemo<ColumnsType<RensheMaterial>>(() => [
    {
      title: '材料',
      dataIndex: 'kind',
      width: 150,
      render: (kind: RensheMaterial['kind']) => detail?.plan.renshe_config?.materials.find(item => item.kind === kind)?.name || RENSHE_MATERIAL_LABELS[kind],
    },
    {
      title: '文件',
      dataIndex: 'original_filename',
      ellipsis: true,
    },
    {
      title: '大小',
      dataIndex: 'size_bytes',
      width: 100,
      render: (value: number) => formatBytes(value),
    },
    {
      title: '操作',
      width: 190,
      render: (_, material) => (
        <MaterialPreview
          available={!material.is_deleted}
          filename={material.original_filename}
          isPdf={isPdfMaterial(material.original_filename, material.content_type)}
          getSignedUrl={(download) => rensheService.getMaterialSignedUrl(material.id, download)}
        />
      ),
    },
  ], [detail?.plan.renshe_config])

  const reviewColumns = useMemo<ColumnsType<RensheReview>>(() => [
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 80,
      render: (stage: RensheReview['stage']) => RENSHE_REVIEW_STAGE_LABELS[stage],
    },
    {
      title: '结果',
      dataIndex: 'decision',
      width: 80,
      render: (decision: RensheReviewDecision) => (
        <Tag color={decision === 'approved' ? 'green' : 'red'}>{decision === 'approved' ? '通过' : '驳回'}</Tag>
      ),
    },
    { title: '审核人', dataIndex: 'reviewer_id', width: 90, render: (id: number) => `#${id}` },
    { title: '原因', dataIndex: 'reason', ellipsis: true, render: (value: string | null) => value || '-' },
    {
      title: '待修改项',
      dataIndex: 'required_changes',
      width: 180,
      render: (items: string[] | null) => items?.map((item) => RENSHE_GRADUATED_CHANGE_OPTIONS.find(option => option.value === item)?.label ?? RENSHE_MATERIAL_LABELS[item as keyof typeof RENSHE_MATERIAL_LABELS] ?? item).join('、') || '-',
    },
    { title: '时间', dataIndex: 'reviewed_at', width: 170, render: (value: string) => formatDate(value) },
    { title: '补正截止', dataIndex: 'correction_due_at', render: (value?: string) => value ? formatDate(value) : '-' },
    { title: '初审核验', render: (_: unknown, review: RensheReview) => review.checklist ? `${Object.values(review.checklist).filter(Boolean).length}/7 项已核验` : '-' },
    ...(isSuperAdmin && !graduated ? [{
      title: '操作',
      width: 80,
      render: (_: unknown, review: RensheReview) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openCorrection(review)}>
          更正
        </Button>
      ),
    }] : []),
  ], [isSuperAdmin, graduated])

  const versionItems = useMemo(() => {
    if (!detail) return []
    return [...detail.versions]
      .sort((a, b) => b.version_no - a.version_no)
      .map((version: RensheApplicationVersion) => ({
        key: String(version.id),
        label: (
          <Space>
            <Text strong>版本 {version.version_no}</Text>
            {version.id === detail.current_version_id && <Tag color="blue">当前版本</Tag>}
            {version.sensitive_cleared_at && <Tag>敏感信息已清理</Tag>}
            <Text type="secondary">{formatDate(version.submitted_at)}</Text>
          </Space>
        ),
        children: (
          <>
            <Title level={5}>实名信息</Title>
            {renderSnapshot(version.realname_snapshot)}
            {graduated && detail.plan.renshe_config?.rule_profile && <section style={{ marginBottom: 16 }}>
              <Title level={5}>{`${detail.plan.renshe_config.occupation_name} · ${detail.plan.renshe_config.export_skill_level} · ${detail.plan.renshe_config.application_types.join('、')}`}</Title>
              {detail.plan.renshe_config.rule_profile.source_conditions?.map(item => <div key={item}>{item}</div>)}
              <div>相关专业：{detail.plan.renshe_config.rule_profile.related_majors}</div>
              <div>相关职业：{detail.plan.renshe_config.rule_profile.related_occupations}</div>
              {detail.plan.renshe_config.rule_profile.project_limits?.map(item => <div key={item}>{item}</div>)}
              <div>资料依据：{detail.plan.renshe_config.rule_profile.sources?.join('；')}</div>
            </section>}
            <Title level={5}>{employment ? '工龄与证书信息' : graduated ? '毕业学历信息' : '学生信息'}</Title>
            {employment ? <EmploymentSnapshot info={version.form_data.qualification_info as Record<string, unknown> || {}} /> : renderSnapshot(graduated ? (version.form_data.education_info as Record<string, unknown> || {}) : version.student_snapshot)}
            {graduated && <><Title level={5}>模板填报信息</Title>{renderSnapshot(version.form_data.reporting_info as Record<string, unknown> || {})}{!version.form_data.reporting_info && <Alert type='warning' message='该历史版本缺少模板填报信息，导出前请驳回补正后重新初审。' style={{ marginBottom: 16 }} />}</>}
            <Title level={5}>报名信息</Title>
            {renderSnapshot(Object.fromEntries(Object.entries(version.form_data).filter(([key]) => !['materials', 'education_info', 'qualification_info', 'eligibility_snapshot', 'reporting_info', 'reporting_contract', 'reporting_config_id', 'commitment_template', 'plan_id'].includes(key))))}
            <Title level={5}>材料</Title>
            {detail.plan.renshe_config && <Space wrap style={{ marginBottom: 12 }}>{detail.plan.renshe_config.materials.map(item => <Tag key={item.kind}>{item.name} · {item.required ? '必填' : '选填'} · {item.extensions.join('/')} · {item.max_count} 个</Tag>)}</Space>}
            <Table
              rowKey="id"
              columns={materialColumns}
              dataSource={version.materials}
              pagination={false}
              size="small"
              style={{ marginBottom: 16 }}
            />
            <Title level={5}>审核记录</Title>
            <Table
              rowKey="id"
              columns={reviewColumns}
              dataSource={version.reviews}
              pagination={false}
              size="small"
            />
          </>
        ),
      }))
  }, [detail, graduated, employment, materialColumns, reviewColumns])

  const reviewActions = detail && canWrite ? (
    <Space>
      {detail.status === 'pending_initial_review' && (
        <>
          <Button danger icon={<CloseOutlined />} loading={reviewing} onClick={() => setRejectionStage('initial')}>
            初审驳回
          </Button>
          <Button type="primary" icon={<CheckOutlined />} loading={reviewing} onClick={() => submitApprovedReview('initial')}>
            初审通过
          </Button>
        </>
      )}
      {detail.status === 'pending_external_review' && (
        <>
          <Button danger icon={<CloseOutlined />} loading={reviewing} onClick={() => setRejectionStage('external')}>
            外审驳回
          </Button>
          <Button type="primary" icon={<CheckOutlined />} loading={reviewing} onClick={() => submitApprovedReview('external')}>
            外审通过
          </Button>
        </>
      )}
      <Button icon={<ReloadOutlined />} onClick={loadDetail}>刷新</Button>
    </Space>
  ) : (
    <Button icon={<ReloadOutlined />} onClick={loadDetail}>刷新</Button>
  )

  return (
    <>
      <Drawer
        title={applicationId ? `报名详情 #${applicationId}` : '报名详情'}
        open={open}
        onClose={onClose}
        width="min(1120px, 94vw)"
        extra={reviewActions}
      >
        {loading && !detail ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : detail ? (
          <>
            <Descriptions bordered size="small" column={3} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="报名 ID">#{detail.id}</Descriptions.Item>
              <Descriptions.Item label="批次">{detail.plan.name}（#{detail.plan_id}）</Descriptions.Item>
              <Descriptions.Item label="用户 ID">#{detail.user_id}</Descriptions.Item>
              <Descriptions.Item label="报考项目">{detail.plan.project_name || '待核实'}</Descriptions.Item>
              <Descriptions.Item label="职业／工种">{detail.plan.occupation_name || '待核实'}</Descriptions.Item>
              <Descriptions.Item label="技能等级">{detail.plan.skill_level || '待核实'}</Descriptions.Item>
              <Descriptions.Item label="考试 / 申报">
                {detail.plan.exam_type || '待核实'} / {detail.plan.application_type || '待核实'}
              </Descriptions.Item>
              <Descriptions.Item label="报名状态">
                {renderStatus(detail.status, RENSHE_APPLICATION_STATUS_MAP)}
              </Descriptions.Item>
              <Descriptions.Item label="支付状态">
                {detail.current_order_status
                  ? renderStatus(detail.current_order_status, RENSHE_PAYMENT_STATUS_MAP)
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="订单 ID">{detail.current_order_id ? `#${detail.current_order_id}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{detail.submitted_at ? formatDate(detail.submitted_at) : '-'}</Descriptions.Item>
              <Descriptions.Item label="冻结时间">{detail.frozen_at ? formatDate(detail.frozen_at) : '-'}</Descriptions.Item>
              <Descriptions.Item label="关闭时间">{detail.closed_at ? formatDate(detail.closed_at) : '-'}</Descriptions.Item>
              {detail.freeze_reason && <Descriptions.Item label="冻结原因" span={3}>{detail.freeze_reason}</Descriptions.Item>}
              {detail.close_reason && <Descriptions.Item label="关闭原因" span={3}>{detail.close_reason}</Descriptions.Item>}
              {(detail.current_refund_id || detail.current_refund_status) && (
                <Descriptions.Item label="退款" span={3}>
                  <Space direction='vertical' size={0}>
                    <span>
                      {detail.current_refund_id ? `#${detail.current_refund_id} ` : ''}
                      {detail.current_refund_status || '-'}
                      {detail.current_refund_retry_count ? ` · 已重试 ${detail.current_refund_retry_count} 次` : ''}
                    </span>
                    {detail.current_refund_status === 'failed' && detail.current_refund_last_error && (
                      <Text type='danger' style={{ fontSize: 12 }}>
                        {refundErrorText(detail.current_refund_last_error)}
                      </Text>
                    )}
                    {canViewRefunds && detail.current_refund_id && (
                      <Button
                        size='small'
                        type='link'
                        style={{ padding: 0, height: 'auto' }}
                        onClick={() => {
                          onClose()
                          navigate(
                            `/admin/certification/renshe/batches/${detail.plan_id}?tab=refunds&refundRegistrationId=${detail.id}`,
                          )
                        }}
                      >
                        查看退款记录
                      </Button>
                    )}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>

            {graduated && detail.status === 'pending_initial_review' && canWrite && <>
              {levelFive && renderSnapshot({ birth_date: currentEligibility?.birth_date, age_as_of: currentEligibility?.age_as_of })}
              <Title level={5}>{levelFive ? '五级工龄型初审核验' : employment ? '工龄与证书路径初审核验' : '学历型初审核验'}</Title>

              <Checkbox.Group value={checks} onChange={values => setChecks(values as string[])} style={{ marginBottom: 20 }}>
                <Space direction='vertical'>{Object.entries(reviewChecks).map(([key, label]) => <Checkbox key={key} value={key}>{label}</Checkbox>)}</Space>
              </Checkbox.Group>
            </>}
            {detail.correction_due_at && <Alert type='warning' message={`补正截止：${formatDate(detail.correction_due_at)}`} style={{ marginBottom: 16 }} />}
            <Title level={5}>版本记录</Title>
            <Collapse
              items={versionItems}
              defaultActiveKey={detail.current_version_id ? [String(detail.current_version_id)] : undefined}
            />
          </>
        ) : null}
      </Drawer>

      <Modal
        title={`${rejectionStage ? RENSHE_REVIEW_STAGE_LABELS[rejectionStage] : ''}驳回`}
        open={Boolean(rejectionStage)}
        okText="确认驳回"
        okButtonProps={{ danger: true, loading: reviewing }}
        onOk={submitRejectedReview}
        onCancel={() => {
          setRejectionStage(null)
          rejectionForm.resetFields()
        }}
        destroyOnClose
      >
        <Form form={rejectionForm} layout="vertical">
          <Form.Item name="reason" label="驳回原因" rules={[{ required: true, whitespace: true, message: '请填写驳回原因' }]}>
            <Input.TextArea rows={4} maxLength={2000} showCount />
          </Form.Item>
          <Form.Item name="required_changes" label="待修改项" rules={[{ required: true, message: '请选择至少一个待修改项' }]}>
            <Select mode={graduated ? 'multiple' : 'tags'} options={graduated ? graduatedChangeOptions : detail?.plan.renshe_config?.materials.map(item => ({ value: item.kind, label: item.name })) ?? REQUIRED_CHANGE_OPTIONS} placeholder="选择需要补正的具体字段或材料" />
          </Form.Item>
          {graduated && <Form.Item name='correction_due_at' label='补正截止时间' rules={[{ required: true, message: '请设置补正截止时间' }, { validator: (_, value?: Dayjs) => value && value.isAfter(dayjs()) ? Promise.resolve() : Promise.reject(new Error('截止时间必须晚于现在')) }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>}
        </Form>
      </Modal>

      <Modal
        title="更正审核结果"
        open={Boolean(correctingReview)}
        okText="确认更正"
        okButtonProps={{ loading: reviewing }}
        onOk={submitCorrection}
        onCancel={() => {
          setCorrectingReview(null)
          correctionForm.resetFields()
        }}
        destroyOnClose
      >
        <Form form={correctionForm} layout="vertical">
          <Form.Item name="to_decision" label="更正为" rules={[{ required: true }]}>
            <Select options={[{ value: 'approved', label: '通过' }, { value: 'rejected', label: '驳回' }]} />
          </Form.Item>
          <Form.Item name="reason" label="更正原因" rules={[{ required: true, whitespace: true, message: '请填写更正原因' }]}>
            <Input.TextArea rows={4} maxLength={2000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
