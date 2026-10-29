import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { Alert, Card, Descriptions, Empty, Space, Tag, Timeline, Typography } from 'antd'
import { OFFLINE_STATUS, type PaymentAudit } from '@/services/offlinePayment'
import { formatPrice } from '@/utils/format'
import styles from './OfflinePaymentAuditTrail.module.css'

dayjs.extend(utc)

const ACTION_LABELS: Record<string, string> = {
  'user.submit': '提交转账凭证', 'user.exception': '申报转账异常', 'admin.confirm': '确认到账',
  'admin.return': '驳回凭证', 'admin.exception': '标记资金异常', 'admin.refund': '登记实际退款',
  'admin.exception_refund': '登记异常款退回', 'admin.generic_refund_approved': '审批订单退款',
}
const REASON_LABELS: Record<string, string> = {
  amount_mismatch: '到账金额不符', returned_for_correction: '凭证需补交', manual_exception: '管理员标记异常',
}
const bankTime = (value: string) => dayjs(value).utcOffset(480).format('YYYY-MM-DD HH:mm:ss')

export default function OfflinePaymentAuditTrail({ audits }: { audits: PaymentAudit[] }) {
  if (!audits.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无核账操作记录' />
  // The API supplies append-only records in chronological order. Copy before reversing.
  return <div className={styles.trail}>
    <Typography.Paragraph type='secondary'>最近操作在前 · 时间均为北京时间 · 每条记录仅代表当次处理结果</Typography.Paragraph>
    <Timeline items={[...audits].reverse().map((audit, index) => {
      const s = audit.summary
      const abnormal = s.result === 'exception' || s.result === 'returned'
      const user = audit.action.startsWith('user.')
      const manualReason = ['admin.return', 'admin.exception'].includes(audit.action) ? s.note : undefined
      const reason = s.reason || manualReason
      const result = s.result ? OFFLINE_STATUS[s.result] : undefined
      const mismatch = s.reason_code === 'amount_mismatch'
      const canCompare = audit.action === 'admin.confirm' && s.expected_amount_cents != null && s.amount_cents != null
      const difference = canCompare ? s.amount_cents! - s.expected_amount_cents! : 0
      return {
        color: abnormal ? (s.result === 'returned' ? 'orange' : 'red') : s.result === 'confirmed' ? 'green' : 'blue',
        children: <Card size='small' className={styles.card} key={`${audit.created_at}-${index}`}>
          <div className={styles.heading}>
            <Typography.Text strong>{audit.action === 'admin.confirm' && s.result === 'exception' ? '确认到账未通过' : ACTION_LABELS[audit.action] || audit.action}</Typography.Text>
            <Space size={4} wrap>
              {s.version != null && <Tag>凭证第 {s.version} 版</Tag>}
              {s.result && <Tag color={result?.color}>{result?.text || s.result}</Tag>}
            </Space>
          </div>
          <Typography.Paragraph type='secondary' className={styles.meta}>
            {bankTime(audit.created_at)} · {user ? '用户' : '管理员'} #{audit.actor_id}
          </Typography.Paragraph>
          {abnormal && <Alert showIcon className={styles.reason} type={s.result === 'returned' ? 'warning' : 'error'}
            message={REASON_LABELS[s.reason_code || ''] || (s.result === 'returned' ? '补交原因' : '异常原因')}
            description={reason || '该历史记录未保存具体异常原因，请结合当时银行流水核实；不能用当前处理说明替代历史原因。'} />}
          <Descriptions size='small' column={1} colon className={styles.details}>
            {s.expected_amount_cents != null && audit.action === 'admin.confirm' && <Descriptions.Item label='当次应付金额'>{formatPrice(s.expected_amount_cents)}</Descriptions.Item>}
            {s.amount_cents != null && <Descriptions.Item label={user ? '用户申报金额' : audit.action.includes('refund') ? '实际退款金额' : '核实到账金额'}>
              <Typography.Text strong type={mismatch ? 'danger' : undefined}>{formatPrice(s.amount_cents)}</Typography.Text>
            </Descriptions.Item>}
            {canCompare && difference !== 0 && <Descriptions.Item label='金额差额'>
              <Typography.Text type='danger'>{difference < 0 ? '少到账' : '多到账'} {formatPrice(Math.abs(difference))}</Typography.Text>
            </Descriptions.Item>}
            {s.bank_time && <Descriptions.Item label={audit.action === 'admin.refund' ? '银行实际退款时间' : '银行实际到账时间'}>{bankTime(s.bank_time)}</Descriptions.Item>}
            {s.bank_reference && <Descriptions.Item label='银行流水标识'><Typography.Text copyable className={styles.text}>{s.bank_reference}</Typography.Text></Descriptions.Item>}
            {s.deadline && <Descriptions.Item label='补交截止时间'>{bankTime(s.deadline)}</Descriptions.Item>}
            {s.note && <Descriptions.Item label={user ? '用户备注' : '管理员备注'}><span className={styles.text}>{s.note}</span></Descriptions.Item>}
          </Descriptions>
        </Card>,
      }
    })} />
  </div>
}
