import { useState } from 'react'
import { Button, Input, Select, Space, Table, Tag } from 'antd'
import { usePagination } from '@/hooks/usePagination'
import { nispService } from '@/services/nisp'
import type { NispRegistration } from '@/services/nisp'
import type { CertType } from '../type-registry'
import RegistrationReviewDrawer from './RegistrationReviewDrawer'
import { PaymentStatusTag, PAYMENT_FILTER_OPTIONS } from '../../shared/RegistrationPayment'
import { formatDate } from '@/utils/format'

const STATUS_OPTIONS = [
  { value: 'pending_payment', label: '待付款' }, { value: 'pending_review', label: '待初审' },
  { value: 'approved', label: '初审通过' }, { value: 'final_approved', label: '终审通过' },
  { value: 'rejected_awaiting_resubmission', label: '待补正' }, { value: 'pending_refund_confirmation', label: '待退款确认' },
  { value: 'refund_processing', label: '退款中' }, { value: 'refunded_closed', label: '已退款关闭' }, { value: 'cancelled', label: '已取消' },
]
export default function ReviewTab(_props: { type: CertType }) {
  const [status, setStatus] = useState<NispRegistration['status']>()
  const [paymentState, setPaymentState] = useState<string>()
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<NispRegistration | null>(null)
  const { data, loading, pagination, refresh, refreshOrThrow } = usePagination(page => nispService.listRegistrations({ ...page, status, payment_state: paymentState, keyword: keyword || undefined }), [status, paymentState, keyword])
  return <>
    <Space wrap style={{ marginBottom: 16 }}>
      <Input.Search placeholder='姓名 / 报名编号' allowClear onSearch={setKeyword} />
      <Select placeholder='核账状态' allowClear style={{ width: 160 }} value={paymentState} onChange={setPaymentState} options={PAYMENT_FILTER_OPTIONS} />
      <Select placeholder='报名审核状态' allowClear style={{ width: 160 }} value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      <Button onClick={refresh}>刷新</Button>
    </Space>
    <Table rowKey='id' dataSource={data?.items || []} loading={loading} pagination={pagination} scroll={{ x: 900 }} columns={[
      { title: '姓名', render: (_, row: NispRegistration) => String(row.candidate_snapshot.name || '—') },
      { title: '报名编号', dataIndex: 'registration_no' },
      { title: '核账状态', render: (_, row) => <PaymentStatusTag summary={row.payment_summary} /> },
      { title: '报名审核状态', dataIndex: 'status', render: value => <Tag>{STATUS_OPTIONS.find(item => item.value === value)?.label || value}</Tag> },
      { title: '提交时间', dataIndex: 'created_at', render: value => formatDate(value) },
      { title: '操作', render: (_, row) => <Button type='link' onClick={() => setSelected(row)}>办理</Button> },
    ]} />
    <RegistrationReviewDrawer key={selected?.id} registration={selected} open={!!selected} onClose={() => setSelected(null)} onReviewed={async row => { setSelected(previous => previous?.id === row.id ? row : previous); await refreshOrThrow() }} />
  </>
}
