import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
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
import {
  formatBytes,
  isPdfMaterial,
  RENSHE_APPLICATION_STATUS_MAP,
  RENSHE_MATERIAL_LABELS,
  RENSHE_PAYMENT_STATUS_MAP,
  RENSHE_REVIEW_STAGE_LABELS,
} from '@/utils/renshe'
import MaterialPreview from './MaterialPreview'

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
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
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
  const [detail, setDetail] = useState<RensheApplicationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [rejectionStage, setRejectionStage] = useState<RensheReviewStage | null>(null)
  const [correctingReview, setCorrectingReview] = useState<RensheReview | null>(null)
  const [rejectionForm] = Form.useForm<RejectionFormValues>()
  const [correctionForm] = Form.useForm<CorrectionFormValues>()
  const canWrite = usePermission('user:write')
  const { admin } = useAuth()
  const isSuperAdmin = admin?.role === 'super_admin'

  const loadDetail = useCallback(async () => {
    if (!applicationId) return
    setLoading(true)
    try {
      setDetail(await rensheService.getApplication(applicationId))
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
    Modal.confirm({
      title: `确认${RENSHE_REVIEW_STAGE_LABELS[stage]}通过`,
      content: '审核结果会绑定当前报名版本。',
      okText: '确认通过',
      onOk: async () => {
        if (!applicationId) return
        setReviewing(true)
        try {
          await rensheService.reviewApplication(applicationId, stage, { decision: 'approved' })
          message.success(`${RENSHE_REVIEW_STAGE_LABELS[stage]}已通过`)
          await finishMutation()
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
        reason: values.reason.trim(),
        required_changes: values.required_changes,
      })
      message.success(`${RENSHE_REVIEW_STAGE_LABELS[rejectionStage]}已驳回`)
      setRejectionStage(null)
      rejectionForm.resetFields()
      await finishMutation()
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
      render: (kind: RensheMaterial['kind']) => RENSHE_MATERIAL_LABELS[kind],
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
  ], [])

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
    ...(isSuperAdmin ? [{
      title: '操作',
      width: 80,
      render: (_: unknown, review: RensheReview) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openCorrection(review)}>
          更正
        </Button>
      ),
    }] : []),
  ], [isSuperAdmin])

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
            <Title level={5}>学生信息</Title>
            {renderSnapshot(version.student_snapshot)}
            <Title level={5}>报名信息</Title>
            {renderSnapshot(version.form_data)}
            <Title level={5}>材料</Title>
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
  }, [detail, materialColumns, reviewColumns])

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
              <Descriptions.Item label="批次 ID">#{detail.plan_id}</Descriptions.Item>
              <Descriptions.Item label="用户 ID">#{detail.user_id}</Descriptions.Item>
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
                  {detail.current_refund_id ? `#${detail.current_refund_id} ` : ''}{detail.current_refund_status || '-'}
                </Descriptions.Item>
              )}
            </Descriptions>

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
            <Select mode="tags" options={REQUIRED_CHANGE_OPTIONS} placeholder="选择材料或输入字段名" />
          </Form.Item>
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
