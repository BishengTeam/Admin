import { useEffect, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, Radio, Select, Space, Tag, Typography, message } from 'antd'
import { useReauthentication } from '@/hooks/useReauthentication'
import { h3cService } from '@/services/h3c'
import { formatDate, formatPrice } from '@/utils/format'
import { registrationRefundStatus, refundRetryDescription } from '@/utils/refund'
import type { H3cRegistration, H3cRegistrationStatus, H3cRegistrationType } from '@/types/h3c'
import MaterialPreview from '../renshe/MaterialPreview'
import ReviewDetailDrawer from '../../shared/ReviewDetailDrawer'

const FIELD_LABELS: Record<string, string> = {
  candidate_name: '姓名',
  gender: '性别',
  candidate_idcard: '身份证号',
  school: '单位/学校',
  address: '通信地址',
  phone: '手机号',
  email: '邮箱',
  education: '学历',
  first_name_en: '英文名（名）',
  last_name_en: '英文名（姓）',
  coupon_code: '考券号',
  verify_code: '学信网验证码',
}

const MATERIAL_LABELS: Record<string, string> = {
  coupon_proof: '优惠券证明',
  student_proof: '学生证明',
}

const TYPE_LABELS: Record<H3cRegistrationType, string> = {
  coupon: '考券报名',
  student: '学生报名',
  full: '全额报名',
}

const STATUS_LABELS: Record<H3cRegistrationStatus, { text: string; color: string }> = {
  pending_payment: { text: '待支付', color: 'orange' },
  pending_review: { text: '待初审', color: 'blue' },
  rejected_awaiting_resubmission: { text: '待补正', color: 'red' },
  pending_refund_confirmation: { text: '待确认退款', color: 'volcano' },
  refund_processing: { text: '退款中', color: 'processing' },
  approved: { text: '初审通过', color: 'green' },
  final_approved: { text: '终审通过', color: 'cyan' },
  refunded_closed: { text: '已退款关闭', color: 'default' },
  cancelled: { text: '已取消', color: 'default' },
}

function statusTag(
  status: H3cRegistrationStatus,
  activeRefund?: H3cRegistration['active_refund'],
) {
  const item = activeRefund
    ? registrationRefundStatus(status, activeRefund)
    : STATUS_LABELS[status]
  const retryDescription = refundRetryDescription(activeRefund)
  return (
    <Space direction='vertical' size={0}>
      <Tag color={item.color}>{item.text}</Tag>
      {retryDescription && (
        <Text type='danger' style={{ fontSize: 12 }}>{retryDescription}</Text>
      )}
    </Space>
  )
}

const { Text } = Typography

interface Props {
  registration: H3cRegistration | null
  open: boolean
  onClose: () => void
  onReviewed?: (registration: H3cRegistration) => void
  onNextPending?: () => void
}

interface ReviewFormValues {
  decision: 'approved' | 'rejected'
  reason_code?: string
  reason_detail?: string
  rejected_material_types?: string[]
  allowed_fields?: string[]
}

export default function RegistrationReviewDrawer({
  registration,
  open,
  onClose,
  onReviewed,
  onNextPending,
}: Props) {
  const [detail, setDetail] = useState<H3cRegistration | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const [form] = Form.useForm<ReviewFormValues>()

  useEffect(() => {
    if (!open || !registration) return
    let cancelled = false
    setDetail(null)
    setDetailLoading(true)
    h3cService.getRegistration(registration.id)
      .then((result) => {
        if (!cancelled) setDetail(result)
      })
      .catch((error: unknown) => {
        if (!cancelled) message.error(error instanceof Error ? error.message : '加载报名详情失败')
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  },[open, registration])

  const current = detail ?? registration
  const currentMaterials = (current?.materials ?? []).filter((material) => material.is_current)

  const openReview = (decision: ReviewFormValues['decision']) => {
    form.resetFields()
    form.setFieldsValue({ decision })
    setReviewOpen(true)
  }

  const submitReview = async () => {
    if (!current) return
    const values = await form.validateFields()
    if (
      values.decision === 'rejected'
      && !(values.allowed_fields?.length || values.rejected_material_types?.length)
    ) {
      form.setFields([{ name: 'allowed_fields', errors: ['请选择至少一项补正内容'] }])
      throw new Error('请选择至少一项补正内容')
    }
    setSubmitting(true)
    try {
      const result = await h3cService.reviewRegistration(current.id, values)
      message.success('审核结果已提交')
      setReviewOpen(false)
      setDetail(result)
      onReviewed?.(result)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const submitRefund = async () => {
    if (!current || !refundReason.trim()) return
    setSubmitting(true)
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      const result = await h3cService.rejectAndRefund(current.id, {
        reason_code: 'review_rejected',
        reason_detail: refundReason.trim(),
      }, token)
      message.success('已授权退款，等待微信处理')
      setRefundOpen(false)
      setRefundReason('')
      setDetail(result)
      onReviewed?.(result)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '拒绝并退款失败')
    } finally {
      setSubmitting(false)
    }
  }

  const submitFinalReview = async () => {
    if (!current?.final_export_item_id) {
      message.warning('请先为当前版本生成有效导出')
      return
    }
    setSubmitting(true)
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      const result = await h3cService.finalReview(
        current.id,
        current.final_export_item_id,
        '已核对有效导出版本',
        token,
      )
      message.success('终审通过')
      setDetail(result)
      onReviewed?.(result)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '终审失败')
    } finally {
      setSubmitting(false)
    }
  }

  const canReview = current?.status === 'pending_review' || current?.status === 'approved'
  const canRefund = ['pending_review', 'approved', 'rejected_awaiting_resubmission'].includes(current?.status ?? '')

  return (
    <>
      {current && (
        <ReviewDetailDrawer
          registrationNo={current.registration_no}
          open={open}
          onClose={onClose}
          materialLoading={detailLoading}
          statusItems={[
            { label: '报名类型', content: TYPE_LABELS[current.registration_type] },
            { label: '状态', content: statusTag(current.status, current.active_refund) },
            { label: '金额', content: formatPrice(current.price_cents) },
            { label: '补交次数', content: current.resubmission_count },
            { label: '有效导出', content: current.latest_valid_export_finished_at ? formatDate(current.latest_valid_export_finished_at) : '未导出' },
            { label: '终审条件', content: current.status === 'approved' ? (current.final_review_ready ? '可终审' : current.final_review_block_reason ?? '暂不可终审') : '-' },
          ]}
          informationItems={Object.entries(current.candidate_snapshot)
            .filter(([key]) => FIELD_LABELS[key])
            .map(([key, value]) => ({
              label: FIELD_LABELS[key],
              content: String(value ?? '-'),
            }))}
          materialItems={currentMaterials.map((material) => ({
            label: (
              <Space size={4}>
                {MATERIAL_LABELS[material.material_type] ?? material.material_type}
                <Tag>v{material.version_no}</Tag>
              </Space>
            ),
            content: (
              <MaterialPreview
                available={Boolean(material.preview_url)}
                filename={material.original_filename}
                getSignedUrl={async () => {
                  if (!material.preview_url) throw new Error('材料预览地址不可用')
                  return { url: material.preview_url, expires_in: 3600 }
                }}
              />
            ),
          }))}
          latestReviewItems={current.latest_review ? [
            { label: '结果', content: current.latest_review.decision === 'approved' ? '初审通过' : '打回补正' },
            { label: '审核时间', content: formatDate(current.latest_review.reviewed_at) },
            ...(current.latest_review.reason_detail ? [{
              label: '原因', content: current.latest_review.reason_detail, span: 2,
            }] : []),
            ...(current.latest_review.rejected_material_types?.length ? [{
              label: '驳回材料',
              content: current.latest_review.rejected_material_types
                .map((item) => MATERIAL_LABELS[item] ?? item)
                .join('、'),
              span: 2,
            }] : []),
          ] : undefined}
          footer={(
            <Space wrap>
              {current.status === 'pending_review' && (
                <Button type='primary' onClick={() => openReview('approved')}>初审通过</Button>
              )}
              {canReview && (
                <Button onClick={() => openReview('rejected')}>打回补正</Button>
              )}
              {current.status === 'approved' && current.final_review_ready && current.final_export_item_id && (
                <Button type='primary' onClick={submitFinalReview} loading={submitting}>终审通过</Button>
              )}
              {canRefund && (
                <Button danger onClick={() => setRefundOpen(true)}>拒绝并退款</Button>
              )}
              {current.status === 'pending_review' && onNextPending && (
                <Button onClick={onNextPending}>下一位待初审</Button>
              )}
            </Space>
          )}
        />
      )}

      <Modal
        title='H3C 初审'
        open={reviewOpen}
        confirmLoading={submitting}
        onOk={submitReview}
        onCancel={() => setReviewOpen(false)}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='decision' label='审核结果' rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value='approved'>初审通过</Radio.Button>
              <Radio.Button value='rejected'>打回补正</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => getFieldValue('decision') === 'rejected' ? (
              <>
                <Form.Item name='reason_code' label='打回原因' rules={[{ required: true }]}>
                  <Select options={[
                    { label: '图片模糊', value: 'image_unclear' },
                    { label: '图片不完整', value: 'image_incomplete' },
                    { label: '材料类型不匹配', value: 'material_type_mismatch' },
                    { label: '在线验证码无效', value: 'verify_code_invalid' },
                    { label: '疑似伪造材料', value: 'suspected_forged_material' },
                  ]} />
                </Form.Item>
                <Form.Item name='allowed_fields' label='允许补正字段'>
                  <Checkbox.Group
                    options={[
                      { label: '手机号', value: 'phone' },
                      { label: '邮箱', value: 'email' },
                      { label: '学校/单位', value: 'school' },
                      { label: '通信地址', value: 'address' },
                      { label: '学籍验证码', value: 'verify_code' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name='rejected_material_types' label='允许补正材料'>
                  <Checkbox.Group
                    options={(current?.materials ?? [])
                      .filter((material) => material.is_current)
                      .map((material) => ({ label: MATERIAL_LABELS[material.material_type] ?? material.material_type, value: material.material_type }))}
                  />
                </Form.Item>
                <Form.Item name='reason_detail' label='补充说明'>
                  <Input.TextArea rows={3} maxLength={1000} />
                </Form.Item>
              </>
            ) : null}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title='拒绝并退款'
        open={refundOpen}
        confirmLoading={submitting}
        onOk={submitRefund}
        onCancel={() => setRefundOpen(false)}
        okText='授权退款'
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={4}
          value={refundReason}
          onChange={(event) => setRefundReason(event.target.value)}
          placeholder='请填写用户可见的拒绝与退款原因'
          maxLength={1000}
          showCount
        />
      </Modal>
      {reauthDialog}
    </>
  )
}
