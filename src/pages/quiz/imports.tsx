import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Empty, Modal, Progress, Segmented, Select, Space, Table, Tag, Tooltip, Tree, Upload, message } from 'antd'
import { CloseCircleOutlined, DownloadOutlined, FileOutlined, FolderOpenOutlined, ReloadOutlined, SafetyCertificateOutlined, SyncOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'
import type { UploadFile } from 'antd/es/upload/interface'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import { ApiError, isConflictError, isNotFoundError } from '@/core/request'
import { usePermission } from '@/hooks/usePermission'
import type { ImportCategoryImpact, ImportCategoryImpactNode, ImportErrorFilter, ImportErrorItem, ImportErrorPage, ImportFilter, ImportJob, ImportSourceType, ImportStatus, JsonImportRequest } from '@/types/quiz'
import { notifyQuizImportSucceeded } from '@/utils/quizEvents'

const MAX_SIZE = 10 * 1024 * 1024
const PROCESSING: ImportStatus[] = ['queued', 'validating', 'importing']
const statusLabels: Record<ImportStatus, string> = {
  queued: '排队中',
  validating: '校验中',
  importing: '写入中',
  awaiting_category_confirmation: '等待分类确认',
  succeeded: '成功',
  validation_failed: '校验失败',
  failed: '失败',
  cancelled: '已取消',
  expired: '已过期',
}
const statusColors: Record<ImportStatus, string> = {
  queued: 'default',
  validating: 'processing',
  importing: 'processing',
  awaiting_category_confirmation: 'gold',
  succeeded: 'success',
  validation_failed: 'warning',
  failed: 'error',
  cancelled: 'default',
  expired: 'default',
}
const impactStatusLabels: Record<ImportCategoryImpactNode['status'], string> = {
  existing: '复用现有分类',
  will_create: '将新建',
  blocked: '已阻断',
}
const impactStatusColors: Record<ImportCategoryImpactNode['status'], string> = {
  existing: 'blue',
  will_create: 'green',
  blocked: 'red',
}

function errorText(error: unknown) { return error instanceof Error ? error.message : '请求失败' }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-' }
function isExpired(value: string) { return new Date(value).getTime() <= Date.now() }
function downloadSignedFile(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
function countCsvRecords(text: string) {
  let quoted = false
  let records = 0
  let hasContent = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { index += 1; continue }
      quoted = !quoted
      hasContent = true
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (hasContent) records += 1
      hasContent = false
      if (char === '\r' && text[index + 1] === '\n') index += 1
    } else if (char.trim()) hasContent = true
  }
  if (hasContent) records += 1
  return records
}

async function readUtf8(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '') }
  catch { throw new Error('文件必须使用 UTF-8 编码，不支持 GBK') }
}

function validateFile(file: File, source: ImportSourceType) {
  const extension = file.name.toLowerCase().split('.').pop()
  if (extension !== source) throw new Error(`请选择 .${source} 文件`)
  if (file.size < 1 || file.size > MAX_SIZE) throw new Error('文件大小必须在 1 B 至 10 MiB 之间')
}

function validateJsonShape(value: unknown): JsonImportRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON 顶层必须是包含 questions 的对象')
  const keys = Object.keys(value as object)
  if (keys.length !== 1 || keys[0] !== 'questions') throw new Error('JSON 顶层仅允许 questions 字段')
  const questions = (value as { questions?: unknown }).questions
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 5000) throw new Error('questions 必须包含 1 至 5000 道题目')
  const allowed = new Set(['category_path', 'question_type', 'question_text', 'options', 'correct_answer', 'explanation'])
  questions.forEach((question, index) => {
    if (!question || typeof question !== 'object' || Array.isArray(question)) throw new Error(`第 ${index + 1} 题必须是对象`)
    const unknown = Object.keys(question).filter((key) => !allowed.has(key))
    if (unknown.length) throw new Error(`第 ${index + 1} 题包含不允许的字段：${unknown.join(', ')}`)
    const questionType = (question as { question_type?: unknown }).question_type
    if (questionType === 'single' || questionType === 'multi') throw new Error(`第 ${index + 1} 题必须使用 single_choice 或 multiple_choice`)
  })
  return { questions } as JsonImportRequest
}

function rowProgress(job: ImportJob) {
  if (!job.total_rows) return job.status === 'succeeded' ? 100 : 0
  return Math.min(100, Math.round((Math.max(job.validated_rows, job.created_count) / job.total_rows) * 100))
}

function impactTreeData(nodes: ImportCategoryImpactNode[]): DataNode[] {
  return nodes.map((node) => ({
    key: node.path.join('/'),
    title: (
      <Space size={6} wrap>
        <span>{node.name}</span>
        <Tag color={impactStatusColors[node.status]}>{impactStatusLabels[node.status]}</Tag>
        <span style={{ color: '#666' }}>直接 {node.direct_question_count} 题 / 子树 {node.subtree_question_count} 题</span>
        {node.blocking_reasons.map((reason) => <Tag color="red" key={reason}>{reason}</Tag>)}
      </Space>
    ),
    children: impactTreeData(node.children),
  }))
}

function errorLocation(item: ImportErrorItem) {
  if (item.row != null) return `第 ${item.row} 行`
  if (item.question_index != null) return `第 ${item.question_index} 题`
  return '-'
}

export default function QuizImports() {
  const canImport = usePermission('quiz:import')
  const canWrite = usePermission('quiz:write')
  const [source, setSource] = useState<ImportSourceType>('csv')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<ImportFilter>({ page: 1, page_size: 20 })
  const [data, setData] = useState<{ items: ImportJob[]; total: number; page: number; page_size: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<ImportJob | null>(null)
  const [errorJob, setErrorJob] = useState<ImportJob | null>(null)
  const [errorData, setErrorData] = useState<ImportErrorPage | null>(null)
  const [errorFilter, setErrorFilter] = useState<ImportErrorFilter>({ page: 1 })
  const [errorLoading, setErrorLoading] = useState(false)
  const [impactJob, setImpactJob] = useState<ImportJob | null>(null)
  const [impact, setImpact] = useState<ImportCategoryImpact | null>(null)
  const [impactLoading, setImpactLoading] = useState(false)
  const [impactAction, setImpactAction] = useState<'confirm' | 'cancel' | null>(null)
  const [signedLoading, setSignedLoading] = useState<string | null>(null)
  const [retryLoading, setRetryLoading] = useState<number | null>(null)
  const reported = useRef(new Set<number>())
  const submitted = useRef(new Set<number>())
  const heartbeatWarned = useRef(new Set<number>())
  const notifiedSucceeded = useRef(new Set<number>())
  const pollStarted = useRef(Date.now())
  const lastSignature = useRef('')
  const visible = useRef(true)
  const controller = useRef<AbortController | null>(null)
  const taskController = useRef<AbortController | null>(null)
  const errorController = useRef<AbortController | null>(null)
  const impactController = useRef<AbortController | null>(null)

  const applyJobUpdate = useCallback((job: ImportJob) => {
    setData((current) => current ? {
      ...current,
      items: current.items.map((item) => item.id === job.id ? job : item),
    } : current)
    setDetail((current) => current?.id === job.id ? job : current)
    setErrorJob((current) => current?.id === job.id ? job : current)
    setImpactJob((current) => current?.id === job.id ? job : current)
  }, [])

  const load = useCallback(async (params = filter, options: { quiet?: boolean } = {}) => {
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    if (!options.quiet) setLoading(true)
    try {
      const result = await quizService.listImports(params, next.signal)
      if (!next.signal.aborted) {
        const signature = result.items.map((job) => `${job.id}:${job.status}:${job.updated_at}:${job.error_count}`).join('|')
        if (signature !== lastSignature.current) { lastSignature.current = signature; pollStarted.current = Date.now() }
        setData(result)
      }
      return result
    } catch (error) {
      if (!next.signal.aborted && !options.quiet) message.error(errorText(error))
      return null
    } finally { if (!next.signal.aborted && !options.quiet) setLoading(false) }
  }, [JSON.stringify(filter)])

  useEffect(() => {
    load()
    return () => {
      controller.current?.abort()
      taskController.current?.abort()
      errorController.current?.abort()
      impactController.current?.abort()
    }
  }, [load])

  const pollTaskDetails = useCallback(async () => {
    if (!visible.current) return
    const ids = new Set<number>([
      ...(data?.items ?? []).filter((job) => PROCESSING.includes(job.status)).map((job) => job.id),
      ...submitted.current,
    ])
    if (!ids.size) return
    taskController.current?.abort()
    const next = new AbortController(); taskController.current = next
    const results = await Promise.all(Array.from(ids).map(async (id) => {
      try { return await quizService.getImport(id, next.signal) }
      catch (error) { if (!next.signal.aborted && !(error instanceof ApiError && error.status === 404)) message.error(errorText(error)); return null }
    }))
    if (next.signal.aborted) return
    const jobs = results.filter((job): job is ImportJob => Boolean(job))
    if (!jobs.length) return
    const byId = new Map(jobs.map((job) => [job.id, job]))
    setData((current) => current ? { ...current, items: current.items.map((job) => byId.get(job.id) ?? job) } : current)
    if (detail && byId.has(detail.id)) setDetail(byId.get(detail.id)!)
    jobs.forEach((job) => {
      if (job.status === 'succeeded' && !notifiedSucceeded.current.has(job.id)) {
        notifiedSucceeded.current.add(job.id)
        notifyQuizImportSucceeded(job.id)
      }
      if (!PROCESSING.includes(job.status)) {
        submitted.current.delete(job.id)
        heartbeatWarned.current.delete(job.id)
      }
    })
  }, [data, detail])

  useEffect(() => {
    const onVisibility = () => {
      visible.current = document.visibilityState === 'visible'
      if (visible.current) { pollStarted.current = Date.now(); load(filter, { quiet: true }) }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [filter, load])

  useEffect(() => {
    let timer: number | undefined
    const poll = async () => {
      if (visible.current) {
        const active = (data?.items ?? []).some((job) => PROCESSING.includes(job.status)) || submitted.current.size > 0
        if (active) {
          await pollTaskDetails()
          if (Date.now() - pollStarted.current > 60_000) {
            const delayed = (data?.items ?? []).find((job) => ['queued', 'validating', 'importing'].includes(job.status))
            if (delayed && !heartbeatWarned.current.has(delayed.id)) { heartbeatWarned.current.add(delayed.id); message.info('任务超过 60 秒没有结束，可能仍在后台处理中') }
          }
        }
      }
      const delay = Date.now() - pollStarted.current > 30_000 ? 10_000 : 2_000
      timer = window.setTimeout(poll, delay)
    }
    timer = window.setTimeout(poll, 2_000)
    return () => { if (timer) window.clearTimeout(timer) }
  }, [data, pollTaskDetails])

  const currentFile = fileList[0]?.originFileObj
  const handleUpload = async () => {
    if (!canImport || !currentFile) { message.warning('请选择要导入的文件'); return }
    try {
      validateFile(currentFile, source)
      setUploading(true)
      let job: ImportJob
      if (source === 'csv') {
        const csvText = await readUtf8(currentFile)
        const records = countCsvRecords(csvText)
        const header = csvText.split(/\r?\n/, 1)[0]
        if (header !== 'category_path,question_type,question_text,options,correct_answer,explanation') throw new Error('CSV 表头不符合冻结契约')
        if (records < 2 || records - 1 > 5000) throw new Error('CSV 必须包含 1 至 5,000 条数据行')
        job = await quizService.importCsv(currentFile, { filename: currentFile.name, size_bytes: currentFile.size })
      } else {
        const parsed = validateJsonShape(JSON.parse(await readUtf8(currentFile)))
        job = await quizService.importJson(parsed)
      }
      submitted.current.add(job.id)
      setFileList([])
      setFilter((current) => ({ ...current, page: 1 }))
      await load({ ...filter, page: 1 })
      message.success(`导入任务 #${job.id} 已提交`)
    } catch (error) { message.error(errorText(error)) }
    finally { setUploading(false) }
  }

  const openSignedFile = async (job: ImportJob, kind: 'source' | 'report') => {
    if (isExpired(job.expires_at) || (kind === 'report' && !job.report_available) || reported.current.has(job.id)) return
    const loadingKey = `${kind}:${job.id}`
    reported.current.add(job.id); setSignedLoading(loadingKey)
    try {
      const result = kind === 'source'
        ? await quizService.getImportSourceUrl(job.id)
        : await quizService.getImportReportUrl(job.id)
      downloadSignedFile(
        result.url,
        kind === 'source' ? `quiz-import-${job.id}.${job.source_type}` : `quiz-import-${job.id}-errors.json`,
      )
      message.success(`${kind === 'source' ? '源文件' : '错误报告'}下载已开始，地址最长 300 秒有效`)
    }
    catch (error) {
      reported.current.delete(job.id)
      if (isNotFoundError(error)) {
        setDetail(null)
        await load(filter)
        message.warning(`导入任务或${kind === 'source' ? '源文件' : '错误报告'}不存在，列表已刷新`)
      } else message.error(errorText(error))
    }
    finally { reported.current.delete(job.id); setSignedLoading(null) }
  }

  const retryJob = async (job: ImportJob) => {
    if (!canImport || job.status !== 'failed' || isExpired(job.expires_at)) return
    setRetryLoading(job.id)
    try {
      const updated = await quizService.retryImport(job.id)
      submitted.current.add(updated.id)
      pollStarted.current = Date.now()
      setData((current) => current ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) } : current)
      if (detail?.id === updated.id) setDetail(updated)
      message.success(`导入任务 #${updated.id} 已重新排队`)
    } catch (error) {
      if (isNotFoundError(error)) {
        setDetail(null)
        await load(filter)
        message.warning('导入任务不存在，列表已刷新')
      } else message.error(errorText(error))
    } finally { setRetryLoading(null) }
  }

  const loadErrors = useCallback(async (job: ImportJob, nextFilter: ImportErrorFilter = errorFilter) => {
    errorController.current?.abort()
    const next = new AbortController()
    errorController.current = next
    setErrorLoading(true)
    try {
      const result = await quizService.listImportErrors(job.id, nextFilter, next.signal)
      if (!next.signal.aborted) setErrorData(result)
      return result
    } catch (error) {
      if (!next.signal.aborted) {
        if (isNotFoundError(error)) {
          setErrorJob(null)
          setErrorData(null)
          await load(filter)
          message.warning('导入任务或错误明细不存在，列表已刷新')
        } else message.error(errorText(error))
      }
      return null
    } finally {
      if (!next.signal.aborted) setErrorLoading(false)
    }
  }, [JSON.stringify(errorFilter), filter, load])

  const openErrors = async (job: ImportJob) => {
    if (isExpired(job.expires_at) || job.error_count < 1) return
    const nextFilter: ImportErrorFilter = { page: 1 }
    setErrorJob(job)
    setErrorFilter(nextFilter)
    setErrorData(null)
    await loadErrors(job, nextFilter)
  }

  const changeErrorFilter = (next: ImportErrorFilter) => {
    if (!errorJob) return
    setErrorFilter(next)
    void loadErrors(errorJob, next)
  }

  const loadImpact = useCallback(async (job: ImportJob) => {
    impactController.current?.abort()
    const next = new AbortController()
    impactController.current = next
    setImpactLoading(true)
    try {
      const latestJob = await quizService.getImport(job.id, next.signal)
      if (next.signal.aborted) return null
      applyJobUpdate(latestJob)
      if (latestJob.status !== 'awaiting_category_confirmation') {
        setImpactJob(null)
        setImpact(null)
        message.warning('该任务已不再等待分类确认，列表已刷新')
        return null
      }
      const result = await quizService.getImportCategoryImpact(job.id, next.signal)
      if (!next.signal.aborted) {
        setImpactJob(latestJob)
        setImpact(result)
      }
      return result
    } catch (error) {
      if (!next.signal.aborted) {
        if (isNotFoundError(error)) {
          setImpactJob(null)
          setImpact(null)
          await load(filter)
          message.warning('导入任务不存在，列表已刷新')
        } else message.error(errorText(error))
      }
      return null
    } finally {
      if (!next.signal.aborted) setImpactLoading(false)
    }
  }, [applyJobUpdate, filter, load])

  const openImpact = async (job: ImportJob) => {
    setImpactJob(job)
    setImpact(null)
    await loadImpact(job)
  }

  const confirmCategories = async () => {
    if (!impactJob || !impact || !canImport || !canWrite || impact.blocking_reasons.length) return
    setImpactAction('confirm')
    try {
      const updated = await quizService.confirmImportCategories(impactJob.id, {
        lock_version: impact.lock_version,
        impact_version: impact.impact_version,
      })
      applyJobUpdate(updated)
      submitted.current.add(updated.id)
      pollStarted.current = Date.now()
      setImpactJob(null)
      setImpact(null)
      message.success(`任务 #${updated.id} 已确认，分类和全部草稿题目将由 Worker 在同一事务创建`)
    } catch (error) {
      if (isConflictError(error)) {
        message.warning('任务版本或分类影响已变化，已加载最新影响，请重新确认')
        await loadImpact(impactJob)
      } else if (isNotFoundError(error)) {
        setImpactJob(null)
        setImpact(null)
        await load(filter)
        message.warning('导入任务不存在，列表已刷新')
      } else message.error(errorText(error))
    } finally { setImpactAction(null) }
  }

  const cancelAwaitingJob = async () => {
    if (!impactJob || !impact || !canImport) return
    setImpactAction('cancel')
    try {
      const updated = await quizService.cancelImport(impactJob.id, { lock_version: impact.lock_version })
      applyJobUpdate(updated)
      setImpactJob(null)
      setImpact(null)
      message.success(`导入任务 #${updated.id} 已取消，未创建任何分类或题目`)
    } catch (error) {
      if (isConflictError(error)) {
        message.warning('任务版本已变化，已加载最新状态')
        await loadImpact(impactJob)
      } else if (isNotFoundError(error)) {
        setImpactJob(null)
        setImpact(null)
        await load(filter)
        message.warning('导入任务不存在，列表已刷新')
      } else message.error(errorText(error))
    } finally { setImpactAction(null) }
  }

  const errorColumns: ColumnsType<ImportErrorItem> = [
    { title: '位置', key: 'location', width: 110, render: (_, item) => errorLocation(item) },
    { title: '字段', dataIndex: 'field', width: 160, render: (value: string | null) => value || '-' },
    { title: '错误码', dataIndex: 'error_code', width: 150, render: (value: string | null) => value || '-' },
    { title: '原因', dataIndex: 'message' },
  ]

  const columns: ColumnsType<ImportJob> = [
    { title: '任务 ID', dataIndex: 'id', width: 100 },
    { title: '来源', dataIndex: 'source_type', width: 80, render: (value: ImportSourceType) => value.toUpperCase() },
    { title: '大小', dataIndex: 'source_size_bytes', width: 110, render: (value: number) => `${(value / 1024 / 1024).toFixed(2)} MiB` },
    { title: '状态', dataIndex: 'status', width: 150, render: (value: ImportStatus) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag> },
    { title: '进度', key: 'progress', width: 180, render: (_, job) => <Progress percent={rowProgress(job)} size="small" status={job.status === 'failed' ? 'exception' : undefined} /> },
    { title: '错误数', dataIndex: 'error_count', width: 80 },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: formatDate },
    { title: '过期时间', dataIndex: 'expires_at', width: 170, render: formatDate },
    {
      title: '操作', key: 'actions', width: 380, fixed: 'right', render: (_, job) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => setDetail(job)}>详情</Button>
          {!isExpired(job.expires_at) && <Button type="link" size="small" icon={<FileOutlined />} loading={signedLoading === `source:${job.id}`} onClick={() => void openSignedFile(job, 'source')}>源文件</Button>}
          {job.error_count > 0 && !isExpired(job.expires_at) && <Button type="link" size="small" onClick={() => void openErrors(job)}>错误明细</Button>}
          {job.status === 'awaiting_category_confirmation' && <Button type="link" size="small" icon={<FolderOpenOutlined />} onClick={() => void openImpact(job)}>分类影响</Button>}
          {job.status === 'failed' && canImport && (
            <Tooltip title={isExpired(job.expires_at) ? '源文件已超过 7 天，不能重试' : '沿用同一任务和批次键重新排队'}>
              <Button type="link" size="small" icon={<SyncOutlined />} disabled={isExpired(job.expires_at)} loading={retryLoading === job.id} onClick={() => Modal.confirm({ title: `重试导入任务 #${job.id}？`, content: '仅系统执行失败的任务可以重试；服务端会再次校验状态、有效期和重试预算。', onOk: () => retryJob(job) })}>重试</Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <PageContainer title="导入任务">
      {canImport && <Card size="small" title="提交导入任务" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Segmented value={source} onChange={(value) => { setSource(value as ImportSourceType); setFileList([]) }} options={[{ label: 'CSV', value: 'csv' }, { label: 'JSON', value: 'json' }]} />
          <Upload beforeUpload={() => false} maxCount={1} accept={source === 'csv' ? '.csv' : '.json'} fileList={fileList} onChange={({ fileList: next }) => setFileList(next)}>
            <Button icon={<UploadOutlined />}>选择 .{source} 文件</Button>
          </Upload>
          <Space wrap>
            <Button type="primary" icon={<UploadOutlined />} loading={uploading} disabled={!currentFile} onClick={handleUpload}>提交任务</Button>
            <Button icon={<DownloadOutlined />} href={`/templates/quiz-import-v1.${source}`} download={`quiz-import-v1.${source}`}>下载 v1 模板</Button>
          </Space>
          <Alert type="info" showIcon message="UTF-8 文件，最大 10 MiB，最多 5,000 行；导入只创建草稿。若文件包含不存在的分类，任务会等待确认；确认后分类和全部草稿题目在同一事务创建，任一错误全部回滚。CSV 表头固定为 category_path、question_type、question_text、options、correct_answer、explanation。" />
        </Space>
      </Card>}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select allowClear placeholder="状态" value={filter.status} onChange={(value) => setFilter((current) => ({ ...current, status: value, page: 1 }))} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} style={{ width: 140 }} />
        <Select allowClear placeholder="来源" value={filter.source_type} onChange={(value) => setFilter((current) => ({ ...current, source_type: value, page: 1 }))} options={[{ value: 'csv', label: 'CSV' }, { value: 'json', label: 'JSON' }]} style={{ width: 120 }} />
        <Button icon={<ReloadOutlined />} onClick={() => load(filter)}>刷新</Button>
      </Space>
      <Table<ImportJob> rowKey="id" scroll={{ x: 1450 }} columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={{ current: data?.page ?? 1, pageSize: data?.page_size ?? 20, total: data?.total ?? 0, showSizeChanger: true, onChange: (page, pageSize) => setFilter((current) => ({ ...current, page, page_size: pageSize })) }} />
      <Drawer title={`导入任务 #${detail?.id ?? ''}`} open={Boolean(detail)} onClose={() => setDetail(null)} width={460}>
        {detail && <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="状态"><Tag color={statusColors[detail.status]}>{statusLabels[detail.status]}</Tag></Descriptions.Item>
          <Descriptions.Item label="来源">{detail.source_type.toUpperCase()}</Descriptions.Item>
          <Descriptions.Item label="总行数">{detail.total_rows}</Descriptions.Item>
          <Descriptions.Item label="已校验">{detail.validated_rows}</Descriptions.Item>
          <Descriptions.Item label="已创建草稿">{detail.created_count}</Descriptions.Item>
          <Descriptions.Item label="错误数">{detail.error_count}</Descriptions.Item>
          <Descriptions.Item label="错误摘要">{detail.error_message || '-'}</Descriptions.Item>
          <Descriptions.Item label="缺失分类">{detail.missing_category_count}</Descriptions.Item>
          <Descriptions.Item label="受影响题目">{detail.affected_question_count}</Descriptions.Item>
          <Descriptions.Item label="任务版本">{detail.lock_version}</Descriptions.Item>
          <Descriptions.Item label="校验版本">{detail.validation_version}</Descriptions.Item>
          <Descriptions.Item label="确认管理员">{detail.confirmed_by ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="确认时间">{formatDate(detail.confirmed_at)}</Descriptions.Item>
          <Descriptions.Item label="重试次数">{detail.retry_count}</Descriptions.Item>
          <Descriptions.Item label="心跳">{formatDate(detail.heartbeat_at)}</Descriptions.Item>
          <Descriptions.Item label="开始时间">{formatDate(detail.started_at)}</Descriptions.Item>
          <Descriptions.Item label="完成时间">{formatDate(detail.finished_at)}</Descriptions.Item>
          <Descriptions.Item label="过期时间">{formatDate(detail.expires_at)}</Descriptions.Item>
        </Descriptions>}
        {detail?.error_count ? <Alert style={{ marginTop: 16 }} type="warning" showIcon message={`共 ${detail.error_count} 条逐行错误`} description="点击列表中的“错误明细”，可在当前页面按字段筛选并查看行号、字段和原因；需要留档时再下载 JSON。" /> : null}
        {detail?.status === 'awaiting_category_confirmation' ? <Button block type="primary" style={{ marginTop: 16 }} icon={<FolderOpenOutlined />} onClick={() => void openImpact(detail)}>查看分类影响并确认</Button> : null}
      </Drawer>
      <Drawer
        title={`导入错误明细 #${errorJob?.id ?? ''}`}
        open={Boolean(errorJob)}
        onClose={() => { errorController.current?.abort(); setErrorJob(null); setErrorData(null) }}
        width={860}
        extra={errorJob?.report_available && !isExpired(errorJob.expires_at) ? (
          <Button
            icon={<DownloadOutlined />}
            loading={signedLoading === `report:${errorJob.id}`}
            onClick={() => void openSignedFile(errorJob, 'report')}
          >
            下载 JSON
          </Button>
        ) : undefined}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="错误详情已永久脱敏"
          description="仅展示位置、字段、错误码和原因，不展示题干、选项、答案或原始值。每页固定 50 条。"
        />
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            allowClear
            placeholder="全部字段"
            value={errorFilter.field}
            options={(errorData?.available_fields ?? []).map((field) => ({ label: field, value: field }))}
            onChange={(field) => changeErrorFilter({ field, page: 1 })}
            style={{ width: 220 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => errorJob && void loadErrors(errorJob, errorFilter)}>刷新</Button>
          <span style={{ color: '#666' }}>校验版本：{errorData?.validation_version ?? errorJob?.validation_version ?? '-'}</span>
        </Space>
        <Table<ImportErrorItem>
          rowKey={(item) => [
            item.row ?? 'q',
            item.question_index ?? 'row',
            item.field ?? 'global',
            item.error_code,
            item.message,
          ].join(':')}
          columns={errorColumns}
          dataSource={errorData?.items ?? []}
          loading={errorLoading}
          locale={{ emptyText: <Empty description="没有匹配的错误" /> }}
          pagination={{
            current: errorData?.page ?? errorFilter.page ?? 1,
            pageSize: 50,
            total: errorData?.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page) => changeErrorFilter({ ...errorFilter, page }),
          }}
        />
      </Drawer>
      <Drawer
        title={`缺失分类影响 #${impactJob?.id ?? ''}`}
        open={Boolean(impactJob)}
        onClose={() => { impactController.current?.abort(); setImpactJob(null); setImpact(null) }}
        width={760}
        extra={<Button icon={<ReloadOutlined />} loading={impactLoading} onClick={() => impactJob && void loadImpact(impactJob)}>重新计算</Button>}
        footer={impactJob && impact ? (
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              disabled={!canImport}
              loading={impactAction === 'cancel'}
              onClick={() => Modal.confirm({
                title: `取消导入任务 #${impactJob.id}？`,
                content: '取消后不会创建任何分类或题目，该任务不能继续确认。',
                okText: '确认取消',
                okButtonProps: { danger: true },
                onOk: cancelAwaitingJob,
              })}
            >
              取消任务
            </Button>
            <Tooltip title={!canWrite ? '确认创建分类还需要 quiz:write 权限' : impact.blocking_reasons.length ? '存在阻断原因，不能确认' : undefined}>
              <Button
                type="primary"
                icon={<SafetyCertificateOutlined />}
                disabled={!canImport || !canWrite || impact.blocking_reasons.length > 0}
                loading={impactAction === 'confirm'}
                onClick={() => Modal.confirm({
                  title: `确认创建 ${impact.new_category_count} 个分类并导入 ${impact.affected_question_count} 道题？`,
                  content: '执行前服务端会重新计算分类影响。分类和全部草稿题目在同一 PostgreSQL 事务创建，任一错误全部回滚；影响变化时必须重新确认。',
                  okText: '确认创建并导入',
                  onOk: confirmCategories,
                })}
              >
                确认创建并导入
              </Button>
            </Tooltip>
          </Space>
        ) : undefined}
      >
        {impactLoading && !impact ? <Progress percent={50} status="active" showInfo={false} /> : impact && <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type={impact.blocking_reasons.length ? 'error' : 'warning'}
            showIcon
            message={impact.blocking_reasons.length ? '当前影响存在阻断，不能确认' : '请核对将复用和新建的分类'}
            description={impact.blocking_reasons.length ? impact.blocking_reasons.join('；') : '确认时仍会重新计算；影响版本变化后不会静默执行。'}
          />
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="将新建分类">{impact.new_category_count}</Descriptions.Item>
            <Descriptions.Item label="复用分类">{impact.reused_category_count}</Descriptions.Item>
            <Descriptions.Item label="受影响草稿题">{impact.affected_question_count}</Descriptions.Item>
            <Descriptions.Item label="计算时间">{formatDate(impact.calculated_at)}</Descriptions.Item>
            <Descriptions.Item label="影响版本" span={2}><span style={{ wordBreak: 'break-all' }}>{impact.impact_version}</span></Descriptions.Item>
          </Descriptions>
          <Tree showLine defaultExpandAll treeData={impactTreeData(impact.tree)} />
        </Space>}
      </Drawer>
    </PageContainer>
  )
}
