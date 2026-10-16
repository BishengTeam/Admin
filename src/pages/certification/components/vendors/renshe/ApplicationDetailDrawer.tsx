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
import { RENSHE_GRADUATED_CHECKS, RENSHE_GRADUATED_CHANGE_OPTIONS } from '@/utils/renshe'

const { Text, Title } = Typography

const SNAPSHOT_LABELS: Record<string, string> = {
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
  ethnicity: '民族',
  institution_type: '院校类型', graduation_date: '毕业日期', certificate_number: '毕业证书编号', graduated: '已取得毕业证',
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
          {typeof value === 'boolean' ? (value ? '是' : '否') : typeof value === 'object' ? JSON.stringify(value) : ({ technical: '技工院校', vocational: '中等及以上职业院校', general_higher: '普通高等学校', secondary_vocational: '中专', associate: '大专', bachelor: '本科', master: '硕士', doctorate: '博士', student: '学生', social: '社会人员', enterprise: '企业人员' } as Record<string, string>)[String(value)] || String(value)}
        </Descriptions.Item>
      ))}
    </Descriptions>
  )
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
  const graduated = detail?.plan.renshe_config?.qualification_rule === 'related_major_graduated_degree_v1'
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
    if (graduated && stage === 'initial' && checks.length !== Object.keys(RENSHE_GRADUATED_CHECKS).length) {
      message.warning('请先逐项核对七项学历型初审核验内容')
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
      render: (items: string[] | null) => items?.map((item) => RENSHE_MATERIAL_LABELS[item as keyof typeof RENSHE_MATERIAL_LABELS] ?? item).join('、') || '-',
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
            <Title level={5}>{graduated ? '毕业学历信息' : '学生信息'}</Title>
            {renderSnapshot(graduated ? (version.form_data.education_info as Record<string, unknown> || {}) : version.student_snapshot)}
            <Title level={5}>报名信息</Title>
            {renderSnapshot(Object.fromEntries(Object.entries(version.form_data).filter(([key]) => !['materials', 'education_info', 'plan_id'].includes(key))))}
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
  }, [detail, graduated, materialColumns, reviewColumns])

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
              <Title level={5}>学历型初审核验</Title>
              <Alert type='info' showIcon message='结合当前版本的实名、学历字段和材料逐项核验；专业别名或不明确匹配须人工判断。' style={{ marginBottom: 12 }} />
              <Checkbox.Group value={checks} onChange={values => setChecks(values as string[])} style={{ marginBottom: 20 }}>
                <Space direction='vertical'>{Object.entries(RENSHE_GRADUATED_CHECKS).map(([key, label]) => <Checkbox key={key} value={key}>{label}</Checkbox>)}</Space>
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
            <Select mode={graduated ? 'multiple' : 'tags'} options={graduated ? RENSHE_GRADUATED_CHANGE_OPTIONS : detail?.plan.renshe_config?.materials.map(item => ({ value: item.kind, label: item.name })) ?? REQUIRED_CHANGE_OPTIONS} placeholder="选择需要补正的具体字段或材料" />
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
