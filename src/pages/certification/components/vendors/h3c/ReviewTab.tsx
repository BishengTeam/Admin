import { useState } from 'react'
import {
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { h3cService } from '@/services/h3c'
import { formatDate, formatPrice } from '@/utils/format'
import type { CertType } from '../type-registry'
import type {
  H3cRegistration,
  H3cRegistrationStatus,
  H3cRegistrationType,
} from '@/types/h3c'
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
  pending_review: { text: '待审核', color: 'blue' },
  rejected_awaiting_resubmission: { text: '等待补交', color: 'red' },
  pending_refund_confirmation: { text: '待确认退款', color: 'volcano' },
  refund_processing: { text: '退款中', color: 'processing' },
  approved: { text: '审核通过', color: 'green' },
  final_approved: { text: '终审通过', color: 'cyan' },
  refunded_closed: { text: '已退款关闭', color: 'default' },
  cancelled: { text: '已取消', color: 'default' },
}

function statusTag(status: H3cRegistrationStatus) {
  const item = STATUS_LABELS[status]
  return <Tag color={item.color}>{item.text}</Tag>
}

export default function ReviewTab(_props: { type: CertType }) {
  const [type, setType] = useState<H3cRegistrationType>()
  const [status, setStatus] = useState<H3cRegistrationStatus>()
  const [selected, setSelected] = useState<H3cRegistration | null>(null)
  const [detail, setDetail] = useState<H3cRegistration | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const [form] = Form.useForm<{
    decision: 'approved' | 'rejected'
    reason_code?: string
    reason_detail?: string
    rejected_material_types?: string[]
    allowed_fields?: string[]
  }>()
  const { data, loading, pagination, refresh } = usePagination(
    (page) => h3cService.listRegistrations({ ...page, registration_type: type, status }),
    [type, status],
  )

  const submit = async () => {
    if (!selected) return
    const values = await form.validateFields()
    if (
      values.decision === 'rejected'
      && !(values.allowed_fields?.length || values.rejected_material_types?.length)
    ) {
      form.setFields([{ name: 'allowed_fields', errors: ['请选择至少一项补正内容'] }])
      throw new Error('请选择至少一项补正内容')
    }
    try {
      await h3cService.reviewRegistration(selected.id, values)
      message.success('审核结果已提交')
      setReviewOpen(false)
      setDetailOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核提交失败，请重试')
    }
  }

  const submitRefund = async () => {
    if (!selected || !refundReason.trim()) return
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      await h3cService.rejectAndRefund(selected.id, {
        reason_code: 'review_rejected',
        reason_detail: refundReason.trim(),
      }, token)
      message.success('已授权退款，等待微信处理')
      setRefundOpen(false)
      setRefundReason('')
      setDetailOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '拒绝并退款失败')
    }
  }

  const submitFinalReview = async (row: H3cRegistration) => {
    if (!row.final_export_item_id) {
      message.warning('请先为当前版本生成有效导出')
      return
    }
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      await h3cService.finalReview(
        row.id,
        row.final_export_item_id,
        '已核对有效导出版本',
        token,
      )
      message.success('终审通过')
      setDetailOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '终审失败')
    }
  }

  const openDetail = async (registration: H3cRegistration) => {
    setSelected(registration)
    setDetail(null)
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      setDetail(await h3cService.getRegistration(registration.id))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载报名详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const columns: ColumnsType<H3cRegistration> = [
    { title: '报名号', dataIndex: 'registration_no', width: 175 },
    { title: '类型', dataIndex: 'registration_type', width: 100, render: (value: H3cRegistrationType) => TYPE_LABELS[value] },
    { title: '考生', width: 100, render: (_, row) => String(row.candidate_snapshot.candidate_name ?? '-') },
    { title: '状态', dataIndex: 'status', width: 125, render: statusTag },
    { title: '金额', dataIndex: 'price_cents', width: 100, render: (value: number) => formatPrice(value) },
    { title: '提交时间', dataIndex: 'created_at', width: 165, render: (value: string) => formatDate(value) },
    {
      title: '操作',
      width: 150,
      render: (_, row) => (
        <Space>
          <Button size='small' onClick={() => void openDetail(row)}>详情</Button>
          {['pending_review', 'approved'].includes(row.status) && (
            <Button size='small' type='primary' onClick={() => {
              setSelected(row)
              form.resetFields()
              form.setFieldsValue({ decision: 'approved' })
              setReviewOpen(true)
            }}>审核</Button>
          )}
          {['pending_review', 'approved', 'rejected_awaiting_resubmission'].includes(row.status) && (
            <Button size='small' danger onClick={() => { setSelected(row); setRefundOpen(true) }}>
              拒绝并退款
            </Button>
          )}
          {row.status === 'approved' && row.final_export_item_id && (
            <Button size='small' type='primary' onClick={() => void submitFinalReview(row)}>
              终审
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const current = detail ?? selected
  const currentMaterials = (current?.materials ?? []).filter((material) => material.is_current)

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder='报名类型'
          style={{ width: 140 }}
          value={type}
          onChange={setType}
          options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Select
          allowClear
          placeholder='状态'
          style={{ width: 160 }}
          value={status}
          onChange={setStatus}
          options={Object.entries(STATUS_LABELS).map(([value, item]) => ({ value, label: item.text }))}
        />
        <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
      </Space>
      <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />

      {current && (
        <ReviewDetailDrawer
          registrationNo={current.registration_no}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          materialLoading={detailLoading}
          statusItems={[
            { label: '报名类型', content: TYPE_LABELS[current.registration_type] },
            { label: '状态', content: statusTag(current.status) },
            { label: '金额', content: formatPrice(current.price_cents) },
            { label: '补交次数', content: current.resubmission_count },
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
            {
              label: '结果',
              content: current.latest_review.decision === 'approved' ? '通过' : '驳回',
            },
            {
              label: '审核时间',
              content: formatDate(current.latest_review.reviewed_at),
            },
            ...(current.latest_review.reason_detail ? [{
              label: '原因',
              content: current.latest_review.reason_detail,
              span: 2,
            }] : []),
            ...(current.latest_review.rejected_material_types?.length ? [{
              label: '驳回材料',
              content: current.latest_review.rejected_material_types
                .map((item) => MATERIAL_LABELS[item] ?? item)
                .join('、'),
              span: 2,
            }] : []),
          ] : undefined}
        />
      )}

      <Modal title='H3C 审核' open={reviewOpen} onOk={submit} onCancel={() => setReviewOpen(false)}>
        <Form form={form} layout='vertical'>
          <Form.Item name='decision' label='审核结果' rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value='approved'>通过</Radio.Button>
              <Radio.Button value='rejected'>拒绝</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => getFieldValue('decision') === 'rejected' ? (
              <>
                <Form.Item name='reason_code' label='拒绝原因' rules={[{ required: true }]}>
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
                    options={(selected?.materials ?? [])
                      .filter((material) => material.is_current)
                      .map((material) => ({ label: material.material_type, value: material.material_type }))}
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
