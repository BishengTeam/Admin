import { Button, Collapse, Space, Tag, Typography } from 'antd'
import type { RensheApplicationVersion, RensheReview } from '@/types/renshe'
import { formatDate } from '@/utils/format'
import { rensheFieldLabel, RENSHE_REVIEW_STAGE_LABELS } from '@/utils/renshe'
import ApplicationReviewContent from './ApplicationReviewContent'

export function ReviewRecords({ reviews, onCorrect }: { reviews: RensheReview[]; onCorrect?: (review: RensheReview) => void }) {
  if (!reviews.length) return <Typography.Text type='secondary'>暂无审核记录</Typography.Text>
  return <Space direction='vertical' style={{ width: '100%' }}>{reviews.map(review => {
    const snapshot = review.checklist_snapshot
    const checked = snapshot ? snapshot.checks.filter(check => review.checklist?.[check.key] === true).length : Object.values(review.checklist || {}).filter(value => value === true).length
    return <section key={review.id} style={{ width: '100%', padding: 12, border: '1px solid #f0f0f0', borderRadius: 8 }}>
      <Space wrap><Typography.Text strong>{RENSHE_REVIEW_STAGE_LABELS[review.stage]}</Typography.Text><Tag color={review.decision === 'approved' ? 'green' : 'red'}>{review.decision === 'approved' ? '通过' : '打回补正'}</Tag><Typography.Text type='secondary'>{formatDate(review.reviewed_at)} · 审核人 #{review.reviewer_id}</Typography.Text></Space>
      <Typography.Paragraph>{snapshot ? `已核验 ${checked}/${snapshot.checks.length} 项` : review.checklist ? `已核验 ${checked} 项` : '未记录逐项核验'}</Typography.Paragraph>
      {onCorrect && <Button size='small' onClick={() => onCorrect(review)}>更正审核结果</Button>}
      {review.reason && <Typography.Paragraph>{review.reason}</Typography.Paragraph>}
      {!!review.required_changes?.length && <Typography.Paragraph>待补正：{review.required_changes.map(rensheFieldLabel).join('、')}</Typography.Paragraph>}
      {snapshot && <Collapse size='small' items={[{ key: 'snapshot', label: '查看当次核验内容', children: <Space direction='vertical'>
        <Typography.Text>{snapshot.path.occupation} · {snapshot.path.level} · {snapshot.path.label}</Typography.Text>
        {snapshot.checks.map(check => <Typography.Paragraph key={check.key}><Tag color={review.checklist?.[check.key] === true ? 'green' : 'default'}>{review.checklist?.[check.key] === true ? '已核验' : '未核验'}</Tag>{check.label}：{check.description}</Typography.Paragraph>)}
      </Space> }]} />}
    </section>
  })}</Space>
}
export default function ApplicationHistory({ versions }: { versions: RensheApplicationVersion[] }) {
  return <Collapse items={[...versions].sort((a, b) => b.version_no - a.version_no).map(version => ({ key: version.id,
    label: `历史版本 ${version.version_no} · ${formatDate(version.submitted_at)}${version.sensitive_cleared_at ? ' · 已清理' : ''}`,
    children: <Space direction='vertical' size={20} style={{ width: '100%' }}><ApplicationReviewContent version={version} checks={[]} /><ReviewRecords reviews={version.reviews} /></Space>,
  }))} />
}
