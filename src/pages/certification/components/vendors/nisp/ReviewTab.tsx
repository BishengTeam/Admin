import { useState } from 'react'
import {
  Button, Card, Input, Modal,
  Select, Space, Table, Tag, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { nispService } from '@/services/nisp'
import type { NispMaterial, NispRegistration } from '@/services/nisp'
import { formatPrice, formatDate } from '@/utils/format'
import MaterialPreview from '../renshe/MaterialPreview'
import ReviewDetailDrawer from '../../shared/ReviewDetailDrawer'

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  pending_payment: { text: '待支付', color: 'orange' },
  pending_review: { text: '待审核', color: 'blue' },
  rejected_awaiting_resubmission: { text: '待补交材料', color: 'red' },
  approved: { text: '审核通过', color: 'green' },
  final_approved: { text: '终审通过', color: 'cyan' },
  cancelled: { text: '已取消', color: 'default' },
  pending_refund_confirmation: { text: '待退款确认', color: 'orange' },
  refund_processing: { text: '退款中', color: 'cyan' },
  refunded_closed: { text: '已退款关闭', color: 'default' },
}

const LEVEL_LABELS: Record<string, string> = {
  '1': '一级',
  '2': '二级',
}

const FIELD_LABELS: Record<string, string> = {
  name: '姓名', pinyin: '拼音', major: '专业', school: '学校/单位',
  id_card: '身份证号', phone: '手机号码', email: '邮箱', province: '报考省份',
  training_type: '培训种类', gender: '性别', age: '年龄', education: '最高学历',
  address: '地址', zip_code: '邮编', institution: '培训机构',
  birth_date: '出生日期', exam_date: '考试日期', exam_location: '考试地点',
}

const MATERIAL_LABELS: Record<NispMaterial['material_type'], string> = {
  id_card_both_sides: '身份证双面',
  portrait_photo: '寸照',
  xuexin_report: '学籍验证报告',
  application_form: 'NISP二级考试报名申请表',
}

export default function NispReviewTab() {
  const [statusFilter, setStatusFilter] = useState<string>('pending_review')
  const [selected, setSelected] = useState<NispRegistration | null>(null)
  const [detail, setDetail] = useState<NispRegistration | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectFields, setRejectFields] = useState<string[]>([])
  const [rejectMaterials, setRejectMaterials] = useState<NispMaterial['material_type'][]>([])
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const { data, loading, pagination, refresh } = usePagination(
    (page) => nispService.listRegistrations({ ...page, status: statusFilter || undefined }),
    [statusFilter],
  )

  const approve = async (reg: NispRegistration) => {
    try {
      await nispService.reviewRegistration(reg.id, { decision: 'approved' })
      message.success('已通过')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const openDetail = async (reg: NispRegistration) => {
    setSelected(reg)
    setDetail(null)
    setDetailLoading(true)
    try {
      setDetail(await nispService.getRegistration(reg.id))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载报名详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const reject = async () => {
    if (!selected || !rejectReason.trim()) return
    if (!rejectFields.length && !rejectMaterials.length) {
      message.warning('请选择至少一项补正内容')
      return
    }
    try {
      await nispService.reviewRegistration(selected.id, {
        decision: 'rejected',
        reason_detail: rejectReason.trim(),
        allowed_fields: rejectFields,
        rejected_material_types: rejectMaterials,
      })
      message.success('已驳回')
      setRejectOpen(false)
      setRejectReason('')
      setRejectFields([])
      setRejectMaterials([])
      setSelected(null)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const submitRefund = async () => {
    if (!selected || !refundReason.trim()) return
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      await nispService.rejectAndRefund(selected.id, {
        reason_code: 'review_rejected',
        reason_detail: refundReason.trim(),
      }, token)
      message.success('已授权退款，等待微信处理')
      setRefundOpen(false)
      setRefundReason('')
      setSelected(null)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '拒绝并退款失败')
    }
  }

  const submitFinalReview = async (row: NispRegistration) => {
    if (!row.final_export_item_id) {
      message.warning('请先为当前版本生成有效导出')
      return
    }
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      await nispService.finalReview(
        row.id,
        row.final_export_item_id,
        '已核对有效导出版本',
        token,
      )
      message.success('终审通过')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '终审失败')
    }
  }

  const columns: ColumnsType<NispRegistration> = [
    { title: '报名编号', dataIndex: 'registration_no', width: 160 },
    {
      title: '级别',
      dataIndex: 'level',
      width: 70,
      render: (v: string) => <Tag color={v === '1' ? 'blue' : 'purple'}>{LEVEL_LABELS[v]}</Tag>,
    },
    {
      title: '姓名',
      width: 100,
      render: (_, row) => String(row.candidate_snapshot?.name ?? '-'),
    },
    {
      title: '学校',
      width: 160,
      ellipsis: true,
      render: (_, row) => String(row.candidate_snapshot?.school ?? '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v] ?? { text: v, color: 'default' }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    { title: '金额', dataIndex: 'price_cents', width: 90, render: (v: number) => formatPrice(v) },
    { title: '报名时间', dataIndex: 'created_at', width: 110, render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作',
      width: 160,
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' onClick={() => void openDetail(row)}>详情</Button>
          {row.status === 'pending_review' && (
            <>
              <Button size='small' type='primary' onClick={() => approve(row)}>通过</Button>
              <Button size='small' danger onClick={() => { setSelected(row); setRejectReason(''); setRejectedTypes([]); setRejectOpen(true) }}>驳回</Button>
            </>
          )}
          {['pending_review', 'approved'].includes(row.status) && (
            <Button size='small' danger onClick={() => {
              setSelected(row)
              setRejectReason('')
              setRejectFields([])
              setRejectMaterials([])
              setRejectOpen(true)
            }}>打回</Button>
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
  const currentMaterials = (current?.materials ?? [])
    .filter((material) => material.is_current)

  return (
    <>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            allowClear
            placeholder="筛选状态"
            options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.text }))}
          />
        </Space>
        <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />
      </Card>

      {current && (
        <ReviewDetailDrawer
          registrationNo={current.registration_no}
          open={!!selected}
          onClose={() => setSelected(null)}
          materialLoading={detailLoading}
          statusItems={[
            { label: '级别', content: LEVEL_LABELS[current.level] },
            {
              label: '状态',
              content: (
                <Tag color={STATUS_CONFIG[current.status]?.color}>
                  {STATUS_CONFIG[current.status]?.text ?? current.status}
                </Tag>
              ),
            },
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
                .map((item) => MATERIAL_LABELS[item as NispMaterial['material_type']] ?? item)
                .join('、'),
              span: 2,
            }] : []),
          ] : undefined}
        />
      )}

      <Modal
        title="驳回报名"
        open={rejectOpen}
        onCancel={() => { setRejectOpen(false); setRejectReason('') }}
        onOk={reject}
      >
        <Select
          mode="multiple"
          placeholder="选择允许补正的字段"
          aria-label="允许补正的字段"
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
          mode="multiple"
          placeholder="选择允许补交的材料"
          aria-label="允许补交的材料"
          style={{ width: '100%', marginBottom: 12 }}
          value={rejectMaterials}
          onChange={setRejectMaterials}
          options={(selected?.materials ?? [])
            .filter(material => material.is_current)
            .filter(material => selected?.level === '2' || ['id_card_both_sides', 'portrait_photo'].includes(material.material_type))
            .map(material => ({
              value: material.material_type,
              label: MATERIAL_LABELS[material.material_type],
            }))}
        />
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请填写驳回原因（用户可见）"
          maxLength={2000}
        />
      </Modal>
      {reauthDialog}

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
          maxLength={2000}
          showCount
        />
      </Modal>
    </>
  )
}
