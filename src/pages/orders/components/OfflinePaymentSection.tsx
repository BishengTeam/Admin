import { createPortal } from 'react-dom'
import MaterialPreview from '@/pages/certification/components/vendors/renshe/MaterialPreview'
import { useCallback, useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Collapse, Descriptions, Space, Tag, Typography } from 'antd'
import { useAuth } from '@/hooks/useAuth'
import { offlinePaymentService, OFFLINE_STATUS, type OfflinePayment } from '@/services/offlinePayment'
import { formatDate, formatPrice } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import OfflineDecisionModal from './OfflineDecisionModal'
import OfflinePaymentAuditTrail from './OfflinePaymentAuditTrail'

export default function OfflinePaymentSection({ orderId, onChanged, mode = 'order', actionContainer }: { orderId: number; onChanged?: () => void | Promise<void>; mode?: 'order' | 'registration'; actionContainer?: HTMLElement | null }) {
  const { permissions } = useAuth()
  const can = (code: string) => permissions.includes('*') || permissions.includes(code)
  const [payment, setPayment] = useState<OfflinePayment | null>(null)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const previewUrls = useRef<string[]>([])
  useEffect(() => () => { previewUrls.current.forEach(url => URL.revokeObjectURL(url)); previewUrls.current = [] }, [orderId])
  const [action, setAction] = useState<'confirm' | 'return' | 'exception' | 'resolve' | 'refund' | 'refund-approval' | null>(null)
  const load = useCallback(async () => {
    const seq = ++generation.current
    try { const result = await offlinePaymentService.detail(orderId); if (seq === generation.current) { setPayment(result); setError('') } }
    catch (reason) { if (seq === generation.current) { setPayment(null); setError(reason instanceof Error ? reason.message : '收款信息加载失败') }; throw reason }
  }, [orderId])
  useEffect(() => { setPayment(null); setAction(null); if (can('offline:view')) void load().catch(() => {}); return () => { generation.current++ } }, [load, permissions])
  if (!can('offline:view')) return <Typography.Paragraph type='secondary'>线下凭证需要独立查看权限。</Typography.Paragraph>
  if (!payment) return <Space direction='vertical'><Typography.Text type='danger'>{error}</Typography.Text><Button onClick={() => void load().catch(() => {})}>重新加载收款信息</Button></Space>
  const download = async (id: number) => {
    try { const material = payment.materials.find(m => m.id === id); if (material) downloadBlob(await offlinePaymentService.content(orderId, id), material.filename) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '凭证获取失败') }
  }
  const financialActions = <Space wrap>
    {payment.order_status === 'pending' && ['under_review', 'exception'].includes(payment.status) && <Space wrap>
      {can('offline:return') && <Button onClick={() => setAction('return')}>驳回凭证</Button>}
      {can('offline:confirm') && <><Button onClick={() => setAction('exception')}>标记异常</Button><Button type='primary' onClick={() => setAction('confirm')}>确认到账</Button></>}
    </Space>}
    {(['paid', 'completed'].includes(payment.order_status) || (payment.order_status === 'closed' && payment.status === 'exception')) && can('offline:confirm') && <Button onClick={() => setAction('exception')}>记录异常处理说明</Button>}
    {mode === 'order' && payment.status === 'exception' && ['pending', 'closed'].includes(payment.order_status) && can('offline:refund') && <Button onClick={() => setAction('resolve')}>登记异常转账已实际退回</Button>}
    {mode === 'order' && payment.refund_business === 'order' && ['paid', 'completed'].includes(payment.order_status) && <Space>
      {can('order:write') && !payment.generic_refund_approved && <Button onClick={() => setAction('refund-approval')}>审批退款</Button>}
      {can('offline:refund') && payment.generic_refund_approved && <Button onClick={() => setAction('refund')}>登记线下退款</Button>}
    </Space>}
  </Space>
  const snapshot = payment.account
  return <Space direction='vertical' size={16} style={{ width: '100%', marginBottom: 24 }}>
    <Space wrap><Typography.Title level={5} style={{ margin: 0 }}>线下收款</Typography.Title><Tag color={OFFLINE_STATUS[payment.status]?.color}>{payment.status_label}</Tag>
      <Typography.Text>订单应付 <Typography.Text strong>{formatPrice(payment.amount_cents)}</Typography.Text></Typography.Text>
      <Button size='small' onClick={() => void load().catch(() => {})}>刷新</Button></Space>
    {['exception', 'returned'].includes(payment.status) && <Alert showIcon type={payment.status === 'exception' ? 'error' : 'warning'}
      message={payment.status === 'exception' ? '当前资金异常，需继续核实' : '当前凭证已驳回，等待补交'}
      description={payment.message || '未记录具体处理原因，请核对银行流水和操作记录。'} />}
    <Descriptions bordered size='small' column={1} title='收款账户快照'>
      <Descriptions.Item label='收款户名'>{snapshot.account_name}</Descriptions.Item><Descriptions.Item label='开户行'>{snapshot.bank_name}</Descriptions.Item>
      <Descriptions.Item label='账号'><Typography.Text copyable>{snapshot.account_number}</Typography.Text></Descriptions.Item>
      <Descriptions.Item label='联系方式'>{snapshot.contact_name} · {snapshot.contact_phone} · {snapshot.contact_wechat}</Descriptions.Item>
      <Descriptions.Item label='提交截止'>{payment.deadline ? formatDate(payment.deadline) : "—"}</Descriptions.Item>
      <Descriptions.Item label='处理说明'>{payment.message || '—'}</Descriptions.Item>
    </Descriptions>
    {payment.status === 'awaiting_proof' && <Typography.Text type='secondary'>等待用户上传转账凭证</Typography.Text>}
    <Collapse items={payment.submissions.map(s => ({ key: s.version, label: `第 ${s.version} 版凭证 · ${formatDate(s.created_at)} · ${OFFLINE_STATUS[s.status]?.text || s.status}`, children: <Space direction='vertical' style={{ width: '100%' }}>
      <Descriptions column={1} size='small' bordered><Descriptions.Item label='转账人'>{s.payer}</Descriptions.Item><Descriptions.Item label='申报金额'>{formatPrice(s.amount_cents)}</Descriptions.Item>
        <Descriptions.Item label='转账时间'>{formatDate(s.transfer_time)}</Descriptions.Item><Descriptions.Item label='用户填写流水'>{s.bank_reference || '—'}</Descriptions.Item>
        <Descriptions.Item label='备注／审核原因'>{s.note} {s.reason}</Descriptions.Item></Descriptions>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 16, width: '100%' }}>{s.material_ids.map((id, index) => {
        const material = payment.materials.find(m => m.id === id)
        return <MaterialPreview key={`${orderId}-${s.version}-${id}`} resourceKey={`${orderId}-${s.version}-${id}`}
          available={!!material} businessTitle={`转账凭证 ${index + 1}`} versionNo={s.version} thumbnail
          filename={material?.filename} contentType={material?.content_type} sizeBytes={material?.size_bytes}
          isPdf={material?.filename.toLowerCase().endsWith('.pdf')} getSignedUrl={async () => {
          const seq = generation.current
          const blob = await offlinePaymentService.content(orderId, id)
          if (seq !== generation.current) throw new Error('报名或付款状态已切换，请重新预览')
          const url = URL.createObjectURL(blob); previewUrls.current.push(url)
          return { url, expires_in: 3600 }
        }} />
      })}</div>
    </Space> }))} defaultActiveKey={payment.submissions[0] ? [payment.submissions[0].version] : []} />
    {payment.entries.map(e => <Descriptions key={e.kind} title={e.kind === 'refund' ? '已登记退款' : '已核实到账'} column={1} bordered size='small'>
      <Descriptions.Item label='银行流水'>{e.bank_reference}</Descriptions.Item><Descriptions.Item label='实际金额'>{formatPrice(e.amount_cents)}</Descriptions.Item>
      <Descriptions.Item label='银行时间'>{formatDate(e.bank_time)}</Descriptions.Item><Descriptions.Item label='系统登记时间'>{formatDate(e.created_at)}</Descriptions.Item>
      {e.material_ids?.length > 0 && <Descriptions.Item label='实际退款凭证'>{e.material_ids.map(id => <Button key={id} type='link' onClick={() => void download(id)}>下载查看退款凭证</Button>)}</Descriptions.Item>}
    </Descriptions>)}
    <Collapse items={[{ key: 'audit', label: `核账操作记录（${payment.audits.length}）`, children: <OfflinePaymentAuditTrail audits={payment.audits} /> }]} />
    {mode === 'order' && payment.business_link && can(`${payment.business_link.vendor}:review`) && <Link to={`/admin/certification/${payment.business_link.vendor}/batches/${payment.business_link.batch_id}?openRegistrationId=${payment.business_link.registration_id}`}>进入报名详情</Link>}
    {error && <Typography.Text type='danger'>{error}</Typography.Text>}
    {payment.order_status === 'pending' && payment.status === 'returned' && <Typography.Text type='secondary'>等待用户补交新版本</Typography.Text>}
    {actionContainer ? createPortal(financialActions, actionContainer) : financialActions}
    <OfflineDecisionModal refund={{ kind: 'order', id: orderId }} payment={payment} action={action} onClose={() => setAction(null)} onChanged={async () => { await Promise.all([load(), Promise.resolve(onChanged?.())]) }} />
  </Space>
}
