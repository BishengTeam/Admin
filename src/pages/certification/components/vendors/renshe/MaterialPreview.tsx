import { useEffect, useRef, useState } from 'react'
import { Button, Image, Modal, Space, Typography } from 'antd'
import { DownloadOutlined, EyeOutlined, FilePdfOutlined, FileOutlined } from '@ant-design/icons'
import type { RensheSignedUrl } from '@/types/renshe'
import { formatBytes } from '@/utils/renshe'

interface Props {
  available: boolean; filename?: string | null; isPdf?: boolean
  getSignedUrl: (download: boolean) => Promise<RensheSignedUrl>
  businessTitle?: string; versionNo?: number; thumbnail?: boolean; sizeBytes?: number; contentType?: string
  cleared?: boolean; required?: boolean; resourceKey?: string
}
export default function MaterialPreview({ available, filename, isPdf = false, getSignedUrl, businessTitle, versionNo,
  thumbnail = false, sizeBytes, contentType, cleared = false, required = false, resourceKey }: Props) {
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [modalUrl, setModalUrl] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const generation = useRef(0)
  const cache = useRef<{ url: string; expires: number } | null>(null)
  const signer = useRef(getSignedUrl); signer.current = getSignedUrl
  const flight = useRef<Promise<string> | null>(null)
  const pdf = isPdf || contentType === 'application/pdf' || /\.pdf$/i.test(filename || '')
  const image = !pdf && (contentType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(filename || '') || !contentType && !filename)
  const title = businessTitle || filename || '报名材料'
  const previewTitle = `${title}${versionNo ? ` · 版本 ${versionNo}` : ''}`
  async function acquire() {
    if (cache.current && cache.current.expires > Date.now()) return cache.current.url
    if (flight.current) return flight.current
    const seq = generation.current
    setBusy(true); setError('')
    const request = signer.current(false).then(result => {
      if (seq !== generation.current) throw new Error('材料已切换，请重新预览')
      cache.current = { url: result.url, expires: Date.now() + Math.max(0, result.expires_in - 5) * 1000 }
      setUrl(result.url); return result.url
    }).catch(reason => { if (seq === generation.current) setError(reason instanceof Error ? reason.message : '预览加载失败，请重试'); throw reason })
      .finally(() => { if (seq === generation.current) { setBusy(false); flight.current = null } })
    flight.current = request
    return request
  }
  useEffect(() => {
    generation.current++; cache.current = null; flight.current = null; setUrl(null); setModalUrl(null); setError(''); setBusy(false); setDownloading(false)
    if (!thumbnail || !image || !available || cleared) return
    let active = true
    const load = () => { if (active) void acquire().catch(() => {}) }
    if (typeof IntersectionObserver === 'undefined') load()
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (entries.some(item => item.isIntersecting)) { load(); observer?.disconnect() }
    }, { rootMargin: '80px' })
    if (box.current) observer?.observe(box.current)
    return () => { active = false; generation.current++; observer?.disconnect() }
  }, [resourceKey, filename, thumbnail, image, available, cleared])
  useEffect(() => () => { generation.current++ }, [])
  async function preview() { try { const result = await acquire(); setModalUrl(result) } catch { /* inline retry */ } }
  async function download() {
    const seq = generation.current
    setDownloading(true); setError('')
    try {
      const result = await signer.current(true)
      if (seq !== generation.current) return
      const link = document.createElement('a'); link.href = result.url; link.target = '_blank'; link.rel = 'noopener noreferrer'
      if (filename) link.download = filename
      document.body.appendChild(link); link.click(); link.remove()
    } catch (reason) { if (seq === generation.current) setError(reason instanceof Error ? reason.message : '材料下载失败，请重试') }
    finally { if (seq === generation.current) setDownloading(false) }
  }
  const failed = () => { cache.current = null; setUrl(null); setModalUrl(null); setError('预览已过期或加载失败，请重试') }
  return <div ref={box} style={thumbnail ? { border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, minWidth: 180, maxWidth: '100%' } : undefined}>
    <Space direction={thumbnail ? 'vertical' : 'horizontal'} size={8} wrap style={{ maxWidth: '100%' }}>
      <Typography.Text strong={thumbnail}>{businessTitle || (filename ? title : '材料')}</Typography.Text>
      {sizeBytes != null && <Typography.Text type='secondary'>{pdf ? 'PDF' : image ? '图片' : '文件'} · {formatBytes(sizeBytes)}</Typography.Text>}
      {!available || cleared ? <Typography.Text type={required && !cleared ? 'danger' : 'secondary'}>{cleared ? '材料已清理' : required ? '必填材料未提交' : '未提交'}</Typography.Text> : <>
        {thumbnail && image && <div style={{ minHeight: 100, display: 'flex', alignItems: 'center' }}>
          {url ? <Image src={url} alt={title} preview={false} onClick={() => void preview()} onError={failed} style={{ width: 180, height: 140, objectFit: 'contain', cursor: 'zoom-in' }} />
            : <Typography.Text type='secondary'>{busy ? '正在加载缩略图' : error ? '图片加载失败' : '进入可视范围后加载'}</Typography.Text>}
        </div>}
        {thumbnail && !image && (pdf ? <FilePdfOutlined style={{ fontSize: 40, color: '#d46b08' }} /> : <FileOutlined style={{ fontSize: 40 }} />)}
        <Space wrap>
          {(pdf || image) && <Button type='link' size='small' icon={<EyeOutlined />} loading={busy} onClick={() => void preview()}>预览</Button>}
          <Button type='link' size='small' icon={<DownloadOutlined />} loading={downloading} onClick={() => void download()}>下载</Button>
        </Space>
      </>}
      {error && <Space direction='vertical'><Typography.Text type='danger'>{error}</Typography.Text><Button size='small' onClick={() => { cache.current = null; void acquire().catch(() => {}) }}>重试</Button></Space>}
    </Space>
    <Modal title={previewTitle} open={!!modalUrl} onCancel={() => setModalUrl(null)} footer={null} width={pdf ? '90vw' : 880} destroyOnClose>
      {modalUrl && (pdf ? <iframe title={previewTitle} src={modalUrl} onError={failed} style={{ width: '100%', height: '75vh', border: 0 }} />
        : <Image src={modalUrl} alt={previewTitle} onError={failed} style={{ maxHeight: '70vh', objectFit: 'contain' }} />)}
    </Modal>
  </div>
}
