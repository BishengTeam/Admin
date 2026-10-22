import { Alert, Button, Card, Checkbox, Collapse, Descriptions, Grid, Space, Tag, Typography } from 'antd'
import type { RensheApplicationVersion } from '@/types/renshe'
import { formatBytes, RENSHE_FIELD_LABELS, RENSHE_MATERIAL_LABELS, rensheDisplayValue, rensheFieldLabel } from '@/utils/renshe'
import { rensheService } from '@/services/renshe'
import MaterialPreview from './MaterialPreview'
import RuleReferencePanel from './RuleReferencePanel'

export function locateReviewCheck(versionId: number, key: string) {
  document.getElementById(`review-${versionId}-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function getPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, value)
}
export function SnapshotFields({ value, path = '' }: { value: unknown; path?: string }) {
  const screens = Grid.useBreakpoint()
  const columns = screens.sm ? 2 : 1
  if (Array.isArray(value)) return <Space direction='vertical' style={{ width: '100%' }}>{value.length ? value.map((item, index) => <Card key={index} size='small' title={`第 ${index + 1} 段`}><SnapshotFields value={item} path={path} /></Card>) : <Typography.Text type='secondary'>未填写</Typography.Text>}</Space>
  if (!value || typeof value !== 'object') return <Typography.Text>{rensheDisplayValue(path, value)}</Typography.Text>
  const entries = Object.entries(value as Record<string, unknown>)
  const known = entries.filter(([key]) => key in RENSHE_FIELD_LABELS)
  const unknown = entries.filter(([key]) => !(key in RENSHE_FIELD_LABELS))
  return <Space direction='vertical' size={12} style={{ width: '100%' }}>
    {!!known.length && <Descriptions bordered size='small' column={columns}>{known.map(([key, item]) => <Descriptions.Item key={key} label={RENSHE_FIELD_LABELS[key]} span={item && typeof item === 'object' ? columns : 1}>{item && typeof item === 'object' ? <SnapshotFields value={item} path={`${path}.${key}`} /> : rensheDisplayValue(key, item)}</Descriptions.Item>)}</Descriptions>}
    {!!unknown.length && <Collapse size='small' items={[{ key: 'compatibility', label: '兼容信息', children: <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(Object.fromEntries(unknown), null, 2)}</pre> }]} />}
    {!entries.length && <Typography.Text type='secondary'>未填写</Typography.Text>}
  </Space>
}
export default function ApplicationReviewContent({ version, checks, onCheck, editable = false }: {
  version: RensheApplicationVersion; checks: string[]; onCheck?: (key: string, checked: boolean) => void; editable?: boolean
}) {
  const requirements = version.review_requirements
  if (!requirements) return <Alert type='warning' message='本版本尚未返回审核要求，请刷新后办理' />
  const rules = requirements.material_requirements
  if (requirements.status !== 'resolved') return <Space direction='vertical' style={{ width: '100%' }}>
    <Alert type={requirements.status === 'cleared' ? 'info' : 'error'} message={requirements.block_reason || '当前规则无法解析'} />
    {requirements.status !== 'cleared' && <>
      <SnapshotFields value={version.realname_snapshot} />
      <SnapshotFields value={version.student_snapshot} />
      <SnapshotFields value={Object.fromEntries(Object.entries(version.form_data).filter(([key]) => !['materials', 'commitment_template', 'reporting_contract'].includes(key)))} />
    </>}
    {version.materials.map((material, index) => <MaterialPreview key={material.id} available={!material.is_deleted} cleared={!!version.sensitive_cleared_at || material.is_deleted} businessTitle={(RENSHE_MATERIAL_LABELS as Record<string, string>)[material.kind] || `其他材料 ${index + 1}`} versionNo={version.version_no} thumbnail filename={material.original_filename} contentType={material.content_type} sizeBytes={material.size_bytes} getSignedUrl={download => rensheService.getMaterialSignedUrl(material.id, download)} />)}
  </Space>
  return <Space direction='vertical' size={20} style={{ width: '100%' }}>
    <RuleReferencePanel key={version.id} requirements={requirements} />
    {requirements.groups.map(group => {
      const groupRules = rules.filter(rule => rule.group_id === group.id)
      const extra = version.materials.filter(material => !rules.some(rule => rule.kind === material.kind))
      const ownChecks = requirements.checks.filter(check => check.group_id === group.id)
      const associated = requirements.checks.filter(check => check.group_id !== group.id && check.related_material_kinds.some(kind => groupRules.some(rule => rule.kind === kind)))
      const complete = ownChecks.filter(check => checks.includes(check.key)).length
      return <Card key={group.id} size='small' title={<Space wrap><span>{group.title}</span>{editable && !!ownChecks.length && <Tag color={complete === ownChecks.length ? 'green' : 'orange'}>{complete}/{ownChecks.length} 项已核验</Tag>}</Space>}>
        <Space direction='vertical' size={16} style={{ width: '100%' }}>
          {group.field_paths.map(path => <section key={path}><Typography.Text strong>{rensheFieldLabel(path)}</Typography.Text><SnapshotFields value={getPath(version, path)} path={path} /></section>)}
          {['work', 'skill', 'title', 'education'].includes(group.id) && <Collapse size='small' items={[{ key: 'scope', label: '查看本组适用范围', children: <Space direction='vertical'>
            <Typography.Text>相关职业：{requirements.path.related_occupations || '结合完整申报条件核验'}</Typography.Text>
            {group.id === 'education' && <Typography.Text>相关专业：{requirements.path.related_majors || '结合完整申报条件核验'}</Typography.Text>}
            {group.id === 'education' && <Typography.Text>院校范围：{requirements.path.institution_types?.map(value => rensheDisplayValue('institution_type', value)).join('、') || '按当前路径要求核验'}</Typography.Text>}
          </Space> }]} />}
          <Space wrap align='start'>
            {groupRules.map(rule => {
              const material = version.materials.find(item => item.id === rule.material_id)
              return <div key={rule.kind} style={{ width: 230, maxWidth: '100%' }}>
                <MaterialPreview resourceKey={`${version.id}-${material?.id || rule.kind}`} available={!!material && !material.is_deleted} cleared={!!material?.is_deleted} required={rule.required} businessTitle={rule.name} versionNo={version.version_no} thumbnail filename={material?.original_filename} sizeBytes={material?.size_bytes} contentType={material?.content_type} getSignedUrl={download => material ? rensheService.getMaterialSignedUrl(material.id, download) : Promise.reject(new Error('材料未提交'))} />
                <Typography.Paragraph type='secondary' style={{ marginTop: 6 }}>{rule.extensions.join('、')}{rule.max_bytes ? `，最大 ${formatBytes(rule.max_bytes)}` : ''}{rule.required ? '，必填' : '，选填'}</Typography.Paragraph>
                {!rule.valid && <Typography.Text type={rule.required ? 'danger' : 'secondary'}>{rule.error}</Typography.Text>}
              </div>
            })}
            {group.id === 'extra' && extra.map((material, index) => <MaterialPreview key={material.id} available={!material.is_deleted} cleared={material.is_deleted} businessTitle={`${(RENSHE_MATERIAL_LABELS as Record<string, string>)[material.kind] || '其他材料'} ${index + 1}`} versionNo={version.version_no} thumbnail filename={material.original_filename} contentType={material.content_type} sizeBytes={material.size_bytes} getSignedUrl={download => rensheService.getMaterialSignedUrl(material.id, download)} />)}
          </Space>
          {ownChecks.map(check => <div key={check.key} id={`review-${version.id}-${check.key}`} style={{ scrollMarginTop: 24 }}>
            {editable ? <Checkbox checked={checks.includes(check.key)} onChange={event => onCheck?.(check.key, event.target.checked)}>{check.label}</Checkbox> : <Typography.Text strong>{check.label}</Typography.Text>}
            <Typography.Paragraph type='secondary' style={{ margin: '4px 0 0 24px' }}>{check.description}</Typography.Paragraph>
          </div>)}
          {!!associated.length && <Space wrap>{associated.map(check => <Button key={check.key} type='link' size='small' onClick={() => locateReviewCheck(version.id, check.key)}>定位关联核验：{check.label}</Button>)}</Space>}
        </Space>
      </Card>
    })}
  </Space>
}
