import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Collapse, Descriptions, Space, Tag, Typography } from 'antd'
import { useAuth } from '@/hooks/useAuth'
import { offlinePaymentService, OFFLINE_STATUS, type OfflinePayment } from '@/services/offlinePayment'
import { formatDate, formatPrice } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import OfflineDecisionModal from './OfflineDecisionModal'

const ACTION_LABELS: Record<string, string> = {
  'user.submit': '提交转账凭证', 'user.exception': '申报转账异常', 'admin.confirm': '核账处理',
  'admin.return': '退回补交', 'admin.exception': '标记异常', 'admin.refund': '登记实际退款',
  'admin.exception_refund': '登记异常款退回', 'admin.generic_refund_approved': '审批订单退款',
}

export default function OfflinePaymentSection({ orderId, onChanged }: { orderId: number; onChanged?: () => void }) {
  const { permissions } = useAuth()
  const can = (code: string) => permissions.includes('*') || permissions.includes(code)
  const [payment, setPayment] = useState<OfflinePayment | null>(null)
  const [error, setError] = useState('')
  const [action, setAction] = useState<'confirm' | 'return' | 'exception' | 'resolve' | 'refund' | 'refund-approval' | null>(null)
  const load = useCallback(async () => { try { setPayment(await offlinePaymentService.detail(orderId)); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : '收款信息加载失败') } }, [orderId])
  useEffect(() => { if (can('offline:view')) void load() }, [load, permissions])
  if (!can('offline:view')) return <Typography.Paragraph type='secondary'>线下凭证需要独立查看权限。</Typography.Paragraph>
  if (!payment) return <Space direction='vertical'><Typography.Text type='danger'>{error}</Typography.Text><Button onClick={() => void load()}>重新加载收款信息</Button></Space>
  const download = async (id: number) => {
    try { const material = payment.materials.find(m => m.id === id); if (material) downloadBlob(await offlinePaymentService.content(orderId, id), material.filename) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '凭证获取失败') }
  }
  const snapshot = payment.account
  return <Space direction='vertical' size={16} style={{ width: '100%', marginBottom: 24 }}>
    <Space><Typography.Title level={5} style={{ margin: 0 }}>线下收款</Typography.Title><Tag color={OFFLINE_STATUS[payment.status]?.color}>{payment.status_label}</Tag><Button size='small' onClick={() => void load()}>刷新</Button></Space>
    <Descriptions bordered size='small' column={1} title='收款账户快照'>
      <Descriptions.Item label='收款户名'>{snapshot.account_name}</Descriptions.Item><Descriptions.Item label='开户行'>{snapshot.bank_name}</Descriptions.Item>
      <Descriptions.Item label='账号'><Typography.Text copyable>{snapshot.account_number}</Typography.Text></Descriptions.Item>
      <Descriptions.Item label='联系方式'>{snapshot.contact_name} · {snapshot.contact_phone} · {snapshot.contact_wechat}</Descriptions.Item>
      <Descriptions.Item label='提交截止'>{payment.deadline ? formatDate(payment.deadline) : "—"}</Descriptions.Item>
      <Descriptions.Item label='处理说明'>{payment.message || '—'}</Descriptions.Item>
    </Descriptions>
    <Collapse items={payment.submissions.map(s => ({ key: s.version, label: `第 ${s.version} 版凭证 · ${formatDate(s.created_at)} · ${OFFLINE_STATUS[s.status]?.text || s.status}`, children: <Space direction='vertical' style={{ width: '100%' }}>
      <Descriptions column={1} size='small' bordered><Descriptions.Item label='转账人'>{s.payer}</Descriptions.Item><Descriptions.Item label='申报金额'>{formatPrice(s.amount_cents)}</Descriptions.Item>
        <Descriptions.Item label='转账时间'>{formatDate(s.transfer_time)}</Descriptions.Item><Descriptions.Item label='用户填写流水'>{s.bank_reference || '—'}</Descriptions.Item>
        <Descriptions.Item label='备注／审核原因'>{s.note} {s.reason}</Descriptions.Item></Descriptions>
      {s.material_ids.map(id => <Button key={id} type='link' onClick={() => void download(id)} style={{ whiteSpace: 'normal', height: 'auto', wordBreak: 'break-all' }}>{payment.materials.find(m => m.id === id)?.filename || '转账凭证'} · 下载查看</Button>)}
    </Space> }))} defaultActiveKey={payment.submissions[0] ? [payment.submissions[0].version] : []} />
    {payment.entries.map(e => <Descriptions key={e.kind} title={e.kind === 'refund' ? '已登记退款' : '已核实到账'} column={1} bordered size='small'>
      <Descriptions.Item label='银行流水'>{e.bank_reference}</Descriptions.Item><Descriptions.Item label='实际金额'>{formatPrice(e.amount_cents)}</Descriptions.Item>
      <Descriptions.Item label='银行时间'>{formatDate(e.bank_time)}</Descriptions.Item><Descriptions.Item label='系统登记时间'>{formatDate(e.created_at)}</Descriptions.Item>
      {e.material_ids?.length > 0 && <Descriptions.Item label='实际退款凭证'>{e.material_ids.map(id => <Button key={id} type='link' onClick={() => void download(id)}>下载查看退款凭证</Button>)}</Descriptions.Item>}
    </Descriptions>)}
    <Collapse items={[{ key: 'audit', label: '核账操作记录', children: payment.audits.map((a, i) => <Space key={i} direction='vertical' size={2} style={{ display: 'flex', marginBottom: 16 }}>
      <Typography.Text>{ACTION_LABELS[a.action] || a.action}</Typography.Text>
      <Typography.Text type='secondary'>{formatDate(a.created_at)} · {a.action.startsWith('user.') ? '用户' : '管理员'} {a.actor_id} · 第 {a.summary.version} 版</Typography.Text>
      {a.summary.result && <Tag color={OFFLINE_STATUS[a.summary.result]?.color}>{OFFLINE_STATUS[a.summary.result]?.text || a.summary.result}</Tag>}
      {a.summary.amount_cents != null && <Typography.Text>{a.action.startsWith('user.') ? '申报金额' : '实际金额'} {formatPrice(a.summary.amount_cents)}</Typography.Text>}
      {a.summary.bank_reference && <Typography.Text copyable>{a.summary.bank_reference}</Typography.Text>}
      {a.summary.bank_time && <Typography.Text>银行时间 {formatDate(a.summary.bank_time)}</Typography.Text>}
      {a.summary.deadline && <Typography.Text>补交截止 {formatDate(a.summary.deadline)}</Typography.Text>}
      <Typography.Text>{a.summary.note}</Typography.Text>
    </Space>) }]} />
    {payment.business_link && can(`${payment.business_link.vendor}:review`) && <Link to={`/admin/certification/${payment.business_link.vendor}/batches/${payment.business_link.batch_id}?openRegistrationId=${payment.business_link.registration_id}`}>进入报名详情</Link>}
    {error && <Typography.Text type='danger'>{error}</Typography.Text>}
    {payment.order_status === 'pending' && payment.status === 'returned' && <Typography.Text type='secondary'>等待用户补交新版本</Typography.Text>}
    {payment.order_status === 'pending' && ['under_review', 'exception'].includes(payment.status) && <Space wrap>
      {can('offline:return') && <Button onClick={() => setAction('return')}>驳回补交</Button>}
      {can('offline:confirm') && <><Button onClick={() => setAction('exception')}>标记异常</Button><Button type='primary' onClick={() => setAction('confirm')}>确认到账</Button></>}
    </Space>}
    {(['paid', 'completed'].includes(payment.order_status) || (payment.order_status === 'closed' && payment.status === 'exception')) && can('offline:confirm') && <Button onClick={() => setAction('exception')}>记录异常处理说明</Button>}
    {payment.status === 'exception' && ['pending', 'closed'].includes(payment.order_status) && can('offline:refund') && <Button onClick={() => setAction('resolve')}>登记异常转账已实际退回</Button>}
    {payment.refund_business === 'order' && ['paid', 'completed'].includes(payment.order_status) && <Space>
      {can('order:write') && !payment.generic_refund_approved && <Button onClick={() => setAction('refund-approval')}>审批退款</Button>}
      {can('offline:refund') && payment.generic_refund_approved && <Button onClick={() => setAction('refund')}>登记线下退款</Button>}
    </Space>}
    <OfflineDecisionModal refund={{ kind: 'order', id: orderId }} payment={payment} action={action} onClose={() => setAction(null)} onChanged={() => { void load(); onChanged?.() }} />
  </Space>
}
