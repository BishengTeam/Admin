import { useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Space, Tag, Typography, message } from 'antd'
import { useReauthentication } from '@/hooks/useReauthentication'
import { nispService } from '@/services/nisp'
import type { NispMaterial, NispRegistration } from '@/services/nisp'
import { formatDate, formatPrice } from '@/utils/format'
import { registrationRefundStatus, refundRetryDescription } from '@/utils/refund'
import MaterialPreview from '../renshe/MaterialPreview'
import ReviewDetailDrawer from '../../shared/ReviewDetailDrawer'

const LEVEL_LABELS: Record<string, string> = {
  '1': 'NISP一级',
  '2': 'NISP二级',
}

const { Text } = Typography

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending_payment: { text: '待支付', color: 'orange' },
  pending_review: { text: '待初审', color: 'blue' },
  rejected_awaiting_resubmission: { text: '待补正', color: 'red' },
  pending_refund_confirmation: { text: '待退款确认', color: 'volcano' },
  refund_processing: { text: '退款中', color: 'processing' },
  approved: { text: '初审通过', color: 'green' },
  final_approved: { text: '终审通过', color: 'cyan' },
  refunded_closed: { text: '已退款关闭', color: 'default' },
  cancelled: { text: '已取消', color: 'default' },
}

const FIELD_LABELS: Record<string, string> = {
  name: '姓名',
  pinyin: '拼音',
  major: '专业',
  school: '学校/单位',
  id_card: '身份证号',
  phone: '手机号码',
  email: '邮箱',
  province: '报考省份',
  training_type: '培训种类',
  gender: '性别',
  age: '年龄',
  education: '最高学历',
  address: '地址',
  zip_code: '邮编',
  institution: '培训机构',
}

const MATERIAL_LABELS: Record<NispMaterial['material_type'], string> = {
  id_card_both_sides: '身份证双面',
  portrait_photo: '寸照',
  xuexin_report: '学籍验证报告',
  application_form: 'NISP二级考试报名申请表',
}

interface Props {
  registration: NispRegistration | null
  open: boolean
  onClose: () => void
  onReviewed?: (registration: NispRegistration) => void
  onNextPending?: () => void
}

export default function RegistrationReviewDrawer({
  registration,
  open,
  onClose,
  onReviewed,
  onNextPending,
}: Props) {
  const [detail, setDetail] = useState<NispRegistration | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectFields, setRejectFields] = useState<string[]>([])
  const [rejectMaterials, setRejectMaterials] = useState<NispMaterial['material_type'][]>([])
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { ensureReauthenticated, reauthDialog } = useReauthentication()

  useEffect(() => {
    if (!open || !registration) return
    let cancelled = false
    setDetail(null)
    setDetailLoading(true)
    nispService.getRegistration(registration.id)
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
  }, [open, registration])

  const current = detail ?? registration
  const currentMaterials = (current?.materials ?? []).filter((material) => material.is_current)

  const approve = async () => {
    if (!current) return
    setSubmitting(true)
    try {
      const result = await nispService.reviewRegistration(current.id, { decision: 'approved' })
      message.success('初审通过')
      setDetail(result)
      onReviewed?.(result)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '初审失败')
    } finally {
      setSubmitting(false)
    }
  }

  const openReject = () => {
    setRejectReason('')
    setRejectFields([])
    setRejectMaterials([])
    setRejectOpen(true)
  }

  const reject = async () => {
    if (!current || !rejectReason.trim()) return
    if (!rejectFields.length && !rejectMaterials.length) {
      message.warning('请选择至少一项补正内容')
      return
    }
    setSubmitting(true)
    try {
      const result = await nispService.reviewRegistration(current.id, {
        decision: 'rejected',
        reason_detail: rejectReason.trim(),
        allowed_fields: rejectFields,
        rejected_material_types: rejectMaterials,
      })
      message.success('已打回补正')
      setRejectOpen(false)
      setDetail(result)
      onReviewed?.(result)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '打回补正失败')
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
      const result = await nispService.rejectAndRefund(current.id, {
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
      const result = await nispService.finalReview(
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
  const canRefund = ['pending_review', 'approved', 'rejected_awaiting_resubmission'].includes(
    current?.status ?? '',
  )

  return (
    <>
      {current && (
        <ReviewDetailDrawer
          registrationNo={current.registration_no}
          open={open}
          onClose={onClose}
          materialLoading={detailLoading}
          statusItems={[
            { label: '级别', content: LEVEL_LABELS[current.level] },
            {
              label: '状态',
              content: (
                <Space direction='vertical' size={0}>
                  {(() => {
                    const item = current.active_refund
                      ? registrationRefundStatus(current.status, current.active_refund)
                      : STATUS_LABELS[current.status] ?? { text: current.status, color: 'default' }
                    return <Tag color={item.color}>{item.text}</Tag>
                  })()}
                  {refundRetryDescription(current.active_refund) && (
                    <Text type='danger' style={{ fontSize: 12 }}>
                      {refundRetryDescription(current.active_refund)}
                    </Text>
                  )}
                </Space>
              ),
            },
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
                {MATERIAL_LABELS[material.material_type]}
                {material.version_no ? <Tag>v{material.version_no}</Tag> : null}
              </Space>
            ),
            content: (
              <MaterialPreview
                available={Boolean(material.preview_url)}
                filename={material.original_filename || MATERIAL_LABELS[material.material_type]}
                isPdf={material.material_type !== 'portrait_photo'}
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
                .map((item) => MATERIAL_LABELS[item as NispMaterial['material_type']] ?? item)
                .join('、'),
              span: 2,
            }] : []),
          ] : undefined}
          footer={(
            <Space wrap>
              {current.status === 'pending_review' && (
                <Button type='primary' loading={submitting} onClick={approve}>初审通过</Button>
              )}
              {canReview && (
                <Button onClick={openReject}>打回补正</Button>
              )}
              {current.status === 'approved' && current.final_review_ready && current.final_export_item_id && (
                <Button type='primary' loading={submitting} onClick={submitFinalReview}>终审通过</Button>
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
        title='打回补正'
        open={rejectOpen}
        confirmLoading={submitting}
        onOk={reject}
        onCancel={() => setRejectOpen(false)}
      >
        <Select
          mode='multiple'
          placeholder='选择允许补正的字段'
          aria-label='允许补正的字段'
          style={{ width: '100%', marginBottom: 12 }}
          value={rejectFields}
          onChange={setRejectFields}
          options={[
            { value: 'pinyin', label: '拼音' },
            { value: 'phone', label: '手机号' },
            { value: 'email', label: '邮箱' },
            { value: 'school', label: '学校/单位' },
            { value: 'major', label: '专业' },
            { value: 'province', label: '报考省份' },
            { value: 'gender', label: '性别' },
            { value: 'age', label: '年龄' },
            { value: 'education', label: '最高学历' },
            { value: 'address', label: '地址' },
            { value: 'zip_code', label: '邮编' },
          ]}
        />
        <Select
          mode='multiple'
          placeholder='选择允许补交的材料'
          aria-label='允许补交的材料'
          style={{ width: '100%', marginBottom: 12 }}
          value={rejectMaterials}
          onChange={setRejectMaterials}
          options={(current?.materials ?? [])
            .filter((material) => material.is_current)
            .filter((material) => current?.level === '2' || ['id_card_both_sides', 'portrait_photo'].includes(material.material_type))
            .map((material) => ({
              value: material.material_type,
              label: MATERIAL_LABELS[material.material_type],
            }))}
        />
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder='请填写打回补正原因（用户可见）'
          maxLength={2000}
          showCount
        />
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
          maxLength={2000}
          showCount
        />
      </Modal>
      {reauthDialog}
    </>
  )
}
