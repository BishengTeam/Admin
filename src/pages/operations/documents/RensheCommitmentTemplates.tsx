import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Empty, Modal, Select, Space, Spin, Tag, Typography, message } from 'antd'
import { FilePdfOutlined, FileWordOutlined, ReloadOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { checkPermission } from '@/core/permission'
import { isApiError } from '@/core/request'
import { rensheService } from '@/services/renshe'
import type { RensheProject, RensheCommitmentTemplate } from '@/types/rensheProject'
import { formatBytes } from '@/utils/renshe'
import CommitmentTemplateUpload from '@/pages/certification/components/vendors/renshe/CommitmentTemplateUpload'
import styles from './index.module.css'

export default function RensheCommitmentTemplates() {
  const { permissions } = useAuth()
  const canRead = checkPermission(permissions, 'content:read') && checkPermission(permissions, 'content:list')
  const canWrite = canRead && checkPermission(permissions, 'content:write')
  const [params] = useSearchParams()
  const requested = useRef(params.get('renshe_product_id'))
  const [products, setProducts] = useState<RensheProject[]>([])
  const [selectedId, setSelectedId] = useState<number>()
  const selected = useRef<number>(); selected.current = selectedId
  const [pending, setPending] = useState<RensheCommitmentTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [selectionError, setSelectionError] = useState('')
  const sequence = useRef(0)
  const saveLock = useRef(false)
  const confirmation = useRef<ReturnType<typeof Modal.confirm> | null>(null)
  const product = products.find(item => item.id === selectedId)
  const current = product?.commitment_template || product?.config.commitment_template || product?.config.reporting_policy?.commitment_template || null
  const load = useCallback(async () => {
    if (!canRead) return
    const request = ++sequence.current
    setLoading(true); setLoadError('')
    try {
      const items = await rensheService.listProjects()
      if (request !== sequence.current) return
      setProducts(items)
      const preferred = selected.current ?? (requested.current ? Number(requested.current) : undefined)
      if (preferred && !items.some(item => item.id === preferred)) { setSelectedId(undefined); setSelectionError('未找到指定人社产品，请重新选择') }
      else { setSelectedId(preferred || items[0]?.id); setSelectionError('') }
    } catch (reason) { if (request === sequence.current) setLoadError(reason instanceof Error ? reason.message : '人社产品加载失败，请重试') }
    finally { if (request === sequence.current) setLoading(false) }
  }, [canRead])
  useEffect(() => {
    if (canRead) void load()
    return () => { sequence.current++; confirmation.current?.destroy() }
  }, [canRead, load])
  function switchProduct(id: number) {
    if (saving || uploading || id === selectedId) return
    const change = () => { setSelectedId(id); setPending(null); setSaveError(''); setSelectionError('') }
    if (!pending) change()
    else confirmation.current = Modal.confirm({ title: '切换人社产品', content: '当前上传的模板尚未保存，切换将放弃本次绑定修改；已上传文件不会绑定到其他产品。', okText: '放弃并切换', cancelText: '继续编辑', onOk: change })
  }
  function refresh() {
    if (!pending) void load()
    else confirmation.current = Modal.confirm({ title: '重新加载产品', content: '重新加载会放弃尚未保存的模板绑定，请确认后重新核对。', okText: '放弃并重新加载', cancelText: '继续编辑', onOk: () => { setPending(null); setSaveError(''); return load() } })
  }
  async function save() {
    if (!canWrite || !product || !pending || uploading || loading || loadError || saveLock.current) return
    const target = product.id, request = sequence.current
    saveLock.current = true; setSaving(true); setSaveError('')
    try {
      const result = await rensheService.saveCommitmentTemplate(target, pending, product.version)
      if (request !== sequence.current || target !== selected.current) return
      setProducts(previous => previous.map(item => item.id === target ? result : item)); setPending(null)
      message.success('承诺书模板已更新')
    } catch (reason) {
      if (request === sequence.current) setSaveError(isApiError(reason) && reason.status === 409
        ? '产品配置已被其他管理员修改，请重新加载后核对，当前模板尚未保存'
        : reason instanceof Error ? reason.message : '承诺书模板保存失败，请重试')
    } finally { saveLock.current = false; if (request === sequence.current) setSaving(false) }
  }
  if (!canRead) return null
  const shown = pending || current
  return <section className={styles.section} aria-labelledby='renshe-commitment-heading'>
    <div className={styles.sectionHeader}><span id='renshe-commitment-heading'>人社承诺书空白模板</span><Button icon={<ReloadOutlined />} disabled={saving || uploading} loading={loading} onClick={refresh}>刷新产品</Button></div>
    <Typography.Paragraph type='secondary'>此处维护供考生下载填写的空白承诺书。考生需亲笔签名、按手印后上传报名材料。</Typography.Paragraph>
    {loadError && <Alert type='error' message='人社产品加载失败' description={loadError} action={<Button onClick={refresh}>重新加载</Button>} style={{ marginBottom: 16 }} />}
    <Spin spinning={loading}>
      <Select aria-label='人社产品' showSearch optionFilterProp='label' placeholder='请选择人社产品' value={selectedId} disabled={saving || uploading || loading || !!loadError}
        style={{ width: '100%', maxWidth: 480, marginBottom: 16 }} options={products.map(item => ({ value: item.id, label: `${item.chinese_name} · ${item.config.occupation_name}／${item.config.skill_level}` }))} onChange={switchProduct} />
      {selectionError && <Typography.Paragraph type='danger'>{selectionError}</Typography.Paragraph>}
      {!loading && !products.length && !loadError && <Empty description='暂无人社产品，请先创建并保存产品草稿' />}
      {product && <article className={`${styles.documentCard} ${styles.templateCard}`}>
        <Space wrap align='start'>
          {shown?.filename.toLowerCase().endsWith('.docx') ? <FileWordOutlined className={styles.templateIcon} /> : <FilePdfOutlined className={styles.templateIcon} />}
          <Space direction='vertical' style={{ minWidth: 0, maxWidth: '100%' }}>
            <Space wrap><Typography.Text strong>人社承诺书空白模板</Typography.Text><Tag color={pending ? 'orange' : current ? 'green' : 'default'}>{pending ? '待保存' : current ? '已配置' : '未配置'}</Tag></Space>
            <Typography.Text className={styles.templateFilename}>{shown?.original_filename || shown?.filename || '尚未配置承诺书模板'}</Typography.Text>
            {shown && <Typography.Text type='secondary'>{shown.filename.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF'} · {shown.size_bytes != null ? formatBytes(shown.size_bytes) : '大小暂无'}</Typography.Text>}
            {pending && current && <Typography.Text type='secondary'>当前生效模板：{current.original_filename || current.filename}</Typography.Text>}
          </Space>
        </Space>
        {product.commitment_template_error && <Typography.Paragraph type='danger'>{product.commitment_template_error}</Typography.Paragraph>}
        <Typography.Paragraph type='secondary' style={{ marginTop: 16 }}>支持 PDF／DOCX，最大10 MB。上传后须保存设置才生效；已提交报名保留原模板依据。</Typography.Paragraph>
        <CommitmentTemplateUpload key={product.id} value={shown || undefined} downloadValue={product.commitment_template_error ? null : current} disabled={!canWrite || saving || loading || !!loadError} showName={false} showPending={!!pending} onBusyChange={setUploading} onChange={value => { setPending(value); setSaveError('') }} />
        {canWrite ? <Space direction='vertical' style={{ marginTop: 16 }}>
          <Button type='primary' loading={saving} disabled={!pending || uploading || loading || !!loadError || !product.version} onClick={() => void save()}>保存设置</Button>
          {saveError && <Typography.Text type='danger' role='alert'>{saveError}</Typography.Text>}
        </Space> : <Typography.Paragraph type='secondary' style={{ marginTop: 16 }}>当前仅可下载，上传及保存需要人社内容写入权限。</Typography.Paragraph>}
      </article>}
    </Spin>
  </section>
}
