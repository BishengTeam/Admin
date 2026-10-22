import { useEffect, useRef, useState } from 'react'
import { Button, Collapse, Descriptions, Modal, Space, Typography, message } from 'antd'
import type { RensheReviewRequirements, RensheRuleReference } from '@/types/renshe'
import { rensheService } from '@/services/renshe'
import { downloadBlob } from '@/utils/download'
import { rensheDisplayValue } from '@/utils/renshe'

export default function RuleReferencePanel({ requirements }: { requirements: RensheReviewRequirements }) {
  const [preview, setPreview] = useState<{ url?: string; text?: string; title: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const lock = useRef(false)
  const generation = useRef(0)
  const urls = useRef<string[]>([])
  useEffect(() => () => { generation.current++; urls.current.forEach(url => URL.revokeObjectURL(url)) }, [])
  async function open(reference: RensheRuleReference) {
    if (lock.current) return
    lock.current = true; setBusy(reference.document_id)
    const seq = generation.current
    try {
      const blob = await rensheService.referenceContent(reference.document_id)
      if (seq !== generation.current) return
      if (reference.action === 'download') {
        const extension = blob.type.includes('wordprocessingml') ? 'docx' : blob.type.includes('spreadsheetml') ? 'xlsx' : 'pdf'
        downloadBlob(blob, `${reference.title}.${extension}`)
      } else if (blob.type.startsWith('text/')) {
        const text = await blob.text()
        if (seq === generation.current) setPreview({ text, title: reference.title })
      } else { const url = URL.createObjectURL(blob); urls.current.push(url); setPreview({ url, title: reference.title }) }
    } catch (error) { if (seq === generation.current) message.error(error instanceof Error ? error.message : '依据文件加载失败，请重试') }
    finally { if (seq === generation.current) { lock.current = false; setBusy(null) } }
  }
  const path = requirements.path
  return <>
    <Typography.Title level={5}>{path.occupation} · {path.level} · {path.application_type}</Typography.Title>
    <Typography.Paragraph>具体路径：{path.label}</Typography.Paragraph>
    <Typography.Paragraph ellipsis={{ rows: 3 }}>核心条件：{path.condition || '按本版本绑定规则逐项核验'}</Typography.Paragraph>
    <Collapse size='small' items={[{ key: 'references', label: '查看完整要求与依据', children: <Space direction='vertical' style={{ width: '100%' }}>
      <Descriptions column={1} size='small' bordered>
        <Descriptions.Item label='完整申报条件'>{path.condition || '按原申报规则核验'}</Descriptions.Item>
        <Descriptions.Item label='相关专业'>{path.related_majors || '结合原始申报条件逐项核验'}</Descriptions.Item>
        <Descriptions.Item label='相关职业'>{path.related_occupations || '结合原始申报条件逐项核验'}</Descriptions.Item>
        <Descriptions.Item label='院校范围'>{path.institution_types?.map(value => rensheDisplayValue('institution_type', value)).join('、') || '不适用'}</Descriptions.Item>
      </Descriptions>
      {requirements.references.map(reference => <Space key={reference.document_id} wrap><Typography.Text>{reference.title} · {reference.locator}</Typography.Text><Button size='small' loading={busy === reference.document_id} disabled={!!busy} onClick={() => void open(reference)}>{reference.action === 'preview' ? '查看' : '下载'}</Button></Space>)}
      {requirements.source_notes.map((note, i) => <Typography.Paragraph key={i} type='secondary' style={{ margin: 0 }}>{note}</Typography.Paragraph>)}
    </Space> }]} />
    <Modal title={preview?.title} open={!!preview} onCancel={() => { urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current = []; setPreview(null) }} width='90vw' footer={null} destroyOnClose>
      {preview?.url ? <iframe title={preview.title} src={preview.url} style={{ width: '100%', height: '75vh', border: 0 }} /> : <pre style={{ whiteSpace: 'pre-wrap' }}>{preview?.text}</pre>}
    </Modal>
  </>
}
