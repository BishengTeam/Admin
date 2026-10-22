import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Button, Descriptions, Drawer, Space, Spin, Tabs } from 'antd'
import OfflinePaymentSection from '@/pages/orders/components/OfflinePaymentSection'
import { PaymentStatusTag } from './RegistrationPayment'
import type { RegistrationPaymentSummary } from './RegistrationPayment'

export default function RegistrationProcessingDrawer({ open, onClose, registrationNo, name, batch, status,
  payment, loading, onRefresh, footer, children }: {
  open: boolean; onClose: () => void; registrationNo: string; name?: string; batch?: string; status: ReactNode
  payment?: RegistrationPaymentSummary | null; loading?: boolean; onRefresh: () => Promise<void>
  footer?: ReactNode; children: ReactNode
}) {
  const [step, setStep] = useState('payment')
  const [financeActionsHost, setFinanceActionsHost] = useState<HTMLDivElement | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const allowed = !!payment?.review_payment_allowed && !loading && !refreshing && !error
  useEffect(() => { setStep(payment?.review_payment_allowed ? 'review' : 'payment') }, [registrationNo, payment?.review_payment_allowed])
  async function refresh(afterPayment = false) {
    setRefreshing(true); setError('')
    try { await onRefresh() }
    catch { setError(afterPayment ? '核账已完成，报名状态刷新失败，请重试' : '报名状态加载失败，请重试'); throw new Error('报名状态刷新失败') }
    finally { setRefreshing(false) }
  }
  return <Drawer title='报名办理' open={open} onClose={onClose} width='min(1120px, 94vw)'
    footer={<div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <Space><Button onClick={onClose}>关闭</Button><Button loading={refreshing} onClick={() => { void refresh().catch(() => {}) }}>刷新</Button></Space>
      <div ref={setFinanceActionsHost} style={{ display: (allowed ? step : 'payment') === 'payment' ? 'block' : 'none' }} />
      {allowed && step === 'review' && footer}
    </div>}>
    <Space direction='vertical' size={24} style={{ width: '100%' }}>
      <Descriptions bordered size='small' column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label='姓名'>{name || '—'}</Descriptions.Item><Descriptions.Item label='报名编号'>{registrationNo}</Descriptions.Item>
        <Descriptions.Item label='认证产品／批次' span={2}>{batch || '—'}</Descriptions.Item>
        <Descriptions.Item label='核账状态'><PaymentStatusTag summary={payment} /></Descriptions.Item>
        <Descriptions.Item label='报名审核状态'>{status}</Descriptions.Item>
      </Descriptions>
      {error && <Alert type='error' message={error} />}
      <Tabs activeKey={allowed ? step : 'payment'} onChange={setStep} items={[
        { key: 'payment', label: '① 核账', children: <>
          {!payment ? <Alert type='warning' message='付款状态尚未加载，请刷新后办理' /> : payment.payment_channel === 'bank_transfer' && payment.order_id
            ? <OfflinePaymentSection key={payment.order_id} orderId={payment.order_id} mode='registration' actionContainer={financeActionsHost} onChanged={() => refresh(true)} />
            : <Alert type={allowed ? 'success' : 'warning'} message={allowed
              ? payment.payment_channel === 'free' ? '零元报名已由系统确认，无需转账凭证' : '历史微信付款已确认，无需银行转账凭证'
              : payment.review_block_reason || '付款条件尚未满足'} />}
        </> },
        { key: 'review', label: '② 报名审核', disabled: !allowed, children: allowed ? children : null },
      ]} />
      {loading && <Spin />}
      {!allowed && <Alert type='warning' message={payment?.review_block_reason || '付款状态未确认，暂不能审核报名'} />}
    </Space>
  </Drawer>
}
