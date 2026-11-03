import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Empty, Input, Modal, Progress, Space, Table, Tag, Typography, message } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import { courseManagementService as service } from '@/services/courseManagement'
import type { CourseChapter, CourseUpload } from '@/types/course'

const fileAccept = '.mp4,.mov,.mkv,.pdf'
export function validateChapterFile(file: Pick<File, 'name' | 'size'>): string | null {
  if (!/\.(mp4|mov|mkv|pdf)$/i.test(file.name)) return '仅支持 MP4、MOV、MKV 视频及 PDF；Word、PPT 请先转为 PDF'
  if (file.size <= 0) return '不能上传空文件'
  if (/\.pdf$/i.test(file.name) && file.size > 50 * 1024 * 1024) return 'PDF 单份不能超过 50MB'
  if (file.size > 5 * 1024 * 1024 * 1024) return '视频单份不能超过 5GB'
  return null
}
type LocalJob = { file: File; percent: number; busy: boolean; error?: string }
const sizeText = (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`

export default function CourseContent({ courseId, canWrite }: { courseId: number; canWrite: boolean }) {
  const [chapters, setChapters] = useState<CourseChapter[]>([]), [uploads, setUploads] = useState<CourseUpload[]>([])
  const [jobs, setJobs] = useState<Record<number, LocalJob>>({})
  const [error, setError] = useState(''), [loading, setLoading] = useState(false), [preparing, setPreparing] = useState(false)
  const [editing, setEditing] = useState<CourseChapter | null>(null), [title, setTitle] = useState(''), [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<{ chapter: CourseChapter; url: string } | null>(null)
  const chooser = useRef<HTMLInputElement>(null), replacement = useRef<CourseChapter | null>(null)
  const controllers = useRef(new Map<number, AbortController>()), generation = useRef(0), active = useRef(true)
  const load = useCallback(async () => {
    const seq = ++generation.current
    setLoading(true)
    try {
      const [first, tasks] = await Promise.all([service.listChapters(courseId, { page: 1, page_size: 100 }), service.listUploads(courseId)])
      const rows = [...first.items]
      for (let page = 2; rows.length < first.total; page++) rows.push(...(await service.listChapters(courseId, { page, page_size: 100 })).items)
      if (active.current && seq === generation.current) { setChapters(rows); setUploads(tasks); setError('') }
    } catch (reason) { if (active.current && seq === generation.current) setError(reason instanceof Error ? reason.message : '课程内容加载失败') }
    finally { if (active.current && seq === generation.current) setLoading(false) }
  }, [courseId])
  useEffect(() => { active.current = true; void load(); return () => { active.current = false; generation.current++; controllers.current.forEach(controller => controller.abort()) } }, [load])
  useEffect(() => {
    if (!uploads.some(upload => upload.status === 'validating')) return
    const timer = window.setInterval(() => { void load() }, 3000)
    return () => window.clearInterval(timer)
  }, [uploads, load])
  const updateJob = (id: number, patch: Partial<LocalJob>) => { if (active.current) setJobs(current => ({ ...current, [id]: { ...current[id], ...patch } })) }
  const transfer = async (upload: CourseUpload, file: File) => {
    const controller = new AbortController()
    controllers.current.set(upload.id, controller)
    updateJob(upload.id, { file, percent: 0, busy: true, error: undefined })
    try {
      await service.uploadChapterFile(upload, file, percent => updateJob(upload.id, { percent }), controller.signal)
      if (active.current) setJobs(current => { const next = { ...current }; delete next[upload.id]; return next })
    } catch (reason) { updateJob(upload.id, { busy: false, error: reason instanceof Error ? reason.message : '文件上传失败' }) }
    finally { controllers.current.delete(upload.id); if (active.current) await load() }
  }
  const choose = async (files: File[]) => {
    const target = replacement.current
    replacement.current = null
    setPreparing(true)
    const queue: Array<{ upload: CourseUpload; file: File }> = []
    try {
      for (const file of files) {
        const invalid = validateChapterFile(file)
        if (invalid) { message.error(`${file.name}：${invalid}`); continue }
        try {
          // Reserve each position in selection order before concurrent transfers start.
          const upload = await service.createUpload({ kind: 'chapter_file', course_id: courseId, filename: file.name,
            content_type: file.type || 'application/octet-stream', size_bytes: file.size,
            ...(target ? { chapter_id: target.id, expected_resource_version: target.resource_version } : {}) })
          queue.push({ upload, file }); setUploads(current => [...current, upload])
        } catch (reason) { message.error(reason instanceof Error ? reason.message : '创建上传任务失败') }
      }
      const worker = async () => { while (queue.length) { const task = queue.shift()!; await transfer(task.upload, task.file) } }
      await Promise.all([worker(), worker(), worker()])
    } finally { if (active.current) { setPreparing(false); await load() } }
  }
  const chooseOriginal = (upload: CourseUpload) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = fileAccept
    input.onchange = () => { const file = input.files?.[0]; if (file) void transfer(upload, file) }; input.click()
  }
  const move = async (index: number, offset: number) => {
    const rows = [...chapters]; [rows[index], rows[index + offset]] = [rows[index + offset], rows[index]]
    try { await service.sortChapters(courseId, rows.map((row, order) => ({ id: row.id, sort_order: order + 1 }))); await load() }
    catch (reason) { message.error(reason instanceof Error ? reason.message : '排序失败') }
  }
  const showPreview = async (chapter: CourseChapter) => {
    try { const result = await service.previewChapter(courseId, chapter.id); setPreview({ chapter, url: result.url }) }
    catch (reason) { message.error(reason instanceof Error ? reason.message : '预览失败') }
  }
  const cancel = async (upload: CourseUpload) => {
    controllers.current.get(upload.id)?.abort()
    try { await service.abortUpload(upload.id); setJobs(current => { const next = { ...current }; delete next[upload.id]; return next }); await load() }
    catch (reason) { message.error(reason instanceof Error ? reason.message : '取消失败，请刷新查看任务状态') }
  }
  return <Card title="课程内容" extra={<Space><Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button>
    {canWrite && <Button type="primary" icon={<UploadOutlined />} loading={preparing} onClick={() => { replacement.current = null; if (chooser.current) chooser.current.multiple = true; chooser.current?.click() }}>上传文件</Button>}</Space>}>
    <input ref={chooser} hidden type="file" multiple accept={fileAccept} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void choose(files) }} />
    <Typography.Paragraph type="secondary">共{chapters.length}章 · 视频{chapters.filter(row => row.resource_type === 'video').length}章 · 文档{chapters.filter(row => row.resource_type === 'document').length}章</Typography.Paragraph>
    <Typography.Paragraph type="secondary">支持视频及 PDF，每个文件生成一个章节。PDF ≤50MB；视频 MP4／MOV／MKV ≤5GB。</Typography.Paragraph>
    {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
    <Table<CourseChapter> rowKey="id" loading={loading} dataSource={chapters} pagination={{ pageSize: 20, showSizeChanger: true }} scroll={{ x: 1000 }} locale={{ emptyText: <Empty description="暂无课程内容，请上传文件" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} columns={[
      { title: '排序', width: 70, render: (_, row) => chapters.findIndex(chapter => chapter.id === row.id) + 1 },
      { title: '章节名称', width: 230, render: (_, row) => <Space direction="vertical" size={0}><Typography.Text strong>{row.title}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.original_filename}</Typography.Text></Space> },
      { title: '内容', width: 140, render: (_, row) => row.resource_type === 'document' ? <Tag>PDF · {row.page_count}页</Tag> : <Tag color="blue">视频 · {Math.ceil((row.duration || 0) / 60)}分</Tag> },
      { title: '大小', dataIndex: 'size_bytes', width: 100, render: sizeText }, { title: '状态', width: 80, render: () => <Tag color="green">可用</Tag> },
      { title: '操作', width: 330, fixed: 'right', render: (_, row) => { const index = chapters.findIndex(chapter => chapter.id === row.id); return <Space size={4} wrap>
        <Button type="link" size="small" onClick={() => void showPreview(row)}>预览</Button>
        {canWrite && <><Button type="link" size="small" onClick={() => { setEditing(row); setTitle(row.title) }}>编辑</Button>
          <Button type="link" size="small" disabled={preparing} onClick={() => { replacement.current = row; if (chooser.current) chooser.current.multiple = false; chooser.current?.click() }}>替换</Button>
          <Button size="small" aria-label={`上移${row.title}`} icon={<ArrowUpOutlined />} disabled={index === 0 || uploads.length > 0} onClick={() => void move(index, -1)} />
          <Button size="small" aria-label={`下移${row.title}`} icon={<ArrowDownOutlined />} disabled={index === chapters.length - 1 || uploads.length > 0} onClick={() => void move(index, 1)} />
          <Button danger type="link" size="small" onClick={() => Modal.confirm({ title: `删除章节“${row.title}”？`, content: '该章节及其学习进度将被移除。', onOk: async () => { await service.deleteChapter(courseId, row.id, true); await load() } })}>删除</Button></>}
      </Space> } },
    ]} />
    {uploads.length > 0 && <Table<CourseUpload> title={() => '上传任务'} rowKey="id" dataSource={uploads} pagination={false} size="small" scroll={{ x: 750 }} columns={[
      { title: '文件', dataIndex: 'filename' }, { title: '状态', render: (_, row) => {
        const job = jobs[row.id]
        return <Space direction="vertical" size={4}>{job?.busy ? <Progress percent={job.percent} size="small" style={{ width: 150 }} format={percent => percent === 100 ? '验证中' : `${percent}%`} />
          : row.status === 'validating' ? '正在验证' : row.status === 'completed' ? '历史上传，待生成章节' : row.status === 'pending' ? '待完成上传' : '验证失败'}
          {(job?.error || row.validation_error) && <Typography.Text type="danger">{job?.error || row.validation_error}</Typography.Text>}</Space>
      } },
      { title: '操作', render: (_, row) => canWrite && <Space>
        {row.status === 'validating' && <Button size="small" onClick={() => void service.completeUpload(row.id).then(load).catch(reason => message.error(reason.message))}>检查／恢复</Button>}
        {!jobs[row.id]?.busy && row.status !== 'validating' && (row.status === 'completed' ? <Button size="small" onClick={async () => { try { await service.batchCreateChapters(courseId, [row.id]); await load() } catch (reason) { message.error(reason instanceof Error ? reason.message : '生成章节失败') } }}>生成章节</Button>
          : <Button size="small" onClick={() => { const local = jobs[row.id]; if (local) void transfer(row, local.file); else if (row.status === 'failed' && !row.oss_upload_id) void service.completeUpload(row.id).then(load).catch(reason => message.error(reason.message)); else chooseOriginal(row) }}>重试／续传</Button>)}
        {row.status !== 'validating' && !(jobs[row.id]?.busy && jobs[row.id].percent === 100) && <Button size="small" danger onClick={() => void cancel(row)}>取消</Button>}
      </Space> },
    ]} />}
    <Modal title="编辑章节名称" open={!!editing} confirmLoading={saving} onCancel={() => setEditing(null)} onOk={async () => {
      if (!editing || !title.trim()) { message.error('请输入章节名称'); return }
      setSaving(true)
      try { await service.updateChapter(courseId, editing.id, { title: title.trim() }); setEditing(null); await load() }
      catch (reason) { message.error(reason instanceof Error ? reason.message : '保存失败') } finally { setSaving(false) }
    }}><Input value={title} onChange={event => setTitle(event.target.value)} maxLength={256} /></Modal>
    <Modal title={preview?.chapter.title} open={!!preview} onCancel={() => setPreview(null)} footer={null} width="min(1000px, 94vw)" destroyOnClose>
      {preview && (preview.chapter.resource_type === 'document' ? <iframe title={preview.chapter.title} src={preview.url} style={{ width: '100%', height: '70vh', border: 0 }} /> : <video controls src={preview.url} style={{ width: '100%' }} />)}
    </Modal>
  </Card>
}
