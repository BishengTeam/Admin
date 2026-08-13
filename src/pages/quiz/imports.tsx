import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Progress, Segmented, Select, Space, Table, Tag, Upload, message } from 'antd'
import { DownloadOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import { ApiError, isNotFoundError } from '@/core/request'
import { usePermission } from '@/hooks/usePermission'
import type { ImportFilter, ImportJob, ImportSourceType, ImportStatus, JsonImportRequest } from '@/types/quiz'
import { notifyQuizImportSucceeded } from '@/utils/quizEvents'

const MAX_SIZE = 10 * 1024 * 1024
const TERMINAL: ImportStatus[] = ['succeeded', 'validation_failed', 'failed']
const statusLabels: Record<ImportStatus, string> = { queued: '排队中', validating: '校验中', importing: '写入中', succeeded: '成功', validation_failed: '校验失败', failed: '失败' }
const statusColors: Record<ImportStatus, string> = { queued: 'default', validating: 'processing', importing: 'processing', succeeded: 'success', validation_failed: 'warning', failed: 'error' }

function errorText(error: unknown) { return error instanceof Error ? error.message : '请求失败' }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-' }
function isExpired(value: string) { return new Date(value).getTime() <= Date.now() }
function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url)
}

function csvEscape(value: string) { return `"${value.replace(/"/g, '""')}"` }
function csvTemplate() {
  const header = 'category_path,question_type,question_text,options,correct_answer,explanation'
  const row = [
    '["网络","基础"]',
    'single_choice',
    '示例题',
    '{"A":"选项 A","B":"选项 B","C":"选项 C"}',
    'A',
    '解析',
  ].map(csvEscape).join(',')
  return `${header}\n${row}\n`
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

export default function QuizImports() {
  const canImport = usePermission('quiz:import')
  const [source, setSource] = useState<ImportSourceType>('csv')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<ImportFilter>({ page: 1, page_size: 20 })
  const [data, setData] = useState<{ items: ImportJob[]; total: number; page: number; page_size: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<ImportJob | null>(null)
  const [reportLoading, setReportLoading] = useState<number | null>(null)
  const reported = useRef(new Set<number>())
  const submitted = useRef(new Set<number>())
  const heartbeatWarned = useRef(new Set<number>())
  const notifiedSucceeded = useRef(new Set<number>())
  const pollStarted = useRef(Date.now())
  const lastSignature = useRef('')
  const visible = useRef(true)
  const controller = useRef<AbortController | null>(null)
  const taskController = useRef<AbortController | null>(null)

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
    return () => { controller.current?.abort(); taskController.current?.abort() }
  }, [load])

  const pollTaskDetails = useCallback(async () => {
    if (!visible.current) return
    const ids = new Set<number>([
      ...(data?.items ?? []).filter((job) => !TERMINAL.includes(job.status)).map((job) => job.id),
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
      if (TERMINAL.includes(job.status)) {
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
        const active = (data?.items ?? []).some((job) => !TERMINAL.includes(job.status)) || submitted.current.size > 0
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

  const getReport = async (job: ImportJob) => {
    if (!job.report_available || isExpired(job.expires_at) || reported.current.has(job.id)) return
    reported.current.add(job.id); setReportLoading(job.id)
    try { const result = await quizService.getImportReportUrl(job.id); window.open(result.url, '_blank', 'noopener,noreferrer') }
    catch (error) {
      reported.current.delete(job.id)
      if (isNotFoundError(error)) {
        setDetail(null)
        await load(filter)
        message.warning('导入任务或错误报告不存在，列表已刷新')
      } else message.error(errorText(error))
    }
    finally { reported.current.delete(job.id); setReportLoading(null) }
  }

  const columns: ColumnsType<ImportJob> = [
    { title: '任务 ID', dataIndex: 'id', width: 100 },
    { title: '来源', dataIndex: 'source_type', width: 80, render: (value: ImportSourceType) => value.toUpperCase() },
    { title: '大小', dataIndex: 'source_size_bytes', width: 110, render: (value: number) => `${(value / 1024 / 1024).toFixed(2)} MiB` },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: ImportStatus) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag> },
    { title: '进度', key: 'progress', width: 180, render: (_, job) => <Progress percent={rowProgress(job)} size="small" status={job.status === 'failed' ? 'exception' : undefined} /> },
    { title: '错误数', dataIndex: 'error_count', width: 80 },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: formatDate },
    { title: '过期时间', dataIndex: 'expires_at', width: 170, render: formatDate },
    { title: '操作', key: 'actions', width: 170, render: (_, job) => <Space size={0}><Button type="link" size="small" onClick={() => setDetail(job)}>详情</Button>{job.report_available && !isExpired(job.expires_at) && <Button type="link" size="small" loading={reportLoading === job.id} onClick={() => getReport(job)}>错误报告</Button>}</Space> },
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
            <Button icon={<DownloadOutlined />} onClick={() => source === 'csv' ? downloadText('quiz-import-template.csv', csvTemplate(), 'text/csv;charset=utf-8') : downloadText('quiz-import-template.json', JSON.stringify({ questions: [{ category_path: ['网络', '基础'], question_type: 'single_choice', question_text: '示例题', options: { A: '选项 A', B: '选项 B', C: '选项 C' }, correct_answer: 'A', explanation: '解析' }] }, null, 2), 'application/json;charset=utf-8')}>下载模板</Button>
          </Space>
          <Alert type="info" showIcon message="UTF-8 文件，最大 10 MiB，最多 5,000 行；导入只创建草稿，分类必须预先存在。CSV 表头固定为 category_path、question_type、question_text、options、correct_answer、explanation。" />
        </Space>
      </Card>}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select allowClear placeholder="状态" value={filter.status} onChange={(value) => setFilter((current) => ({ ...current, status: value, page: 1 }))} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} style={{ width: 140 }} />
        <Select allowClear placeholder="来源" value={filter.source_type} onChange={(value) => setFilter((current) => ({ ...current, source_type: value, page: 1 }))} options={[{ value: 'csv', label: 'CSV' }, { value: 'json', label: 'JSON' }]} style={{ width: 120 }} />
        <Button icon={<ReloadOutlined />} onClick={() => load(filter)}>刷新</Button>
      </Space>
      <Table<ImportJob> rowKey="id" scroll={{ x: 1250 }} columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={{ current: data?.page ?? 1, pageSize: data?.page_size ?? 20, total: data?.total ?? 0, showSizeChanger: true, onChange: (page, pageSize) => setFilter((current) => ({ ...current, page, page_size: pageSize })) }} />
      <Drawer title={`导入任务 #${detail?.id ?? ''}`} open={Boolean(detail)} onClose={() => setDetail(null)} width={460}>
        {detail && <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="状态"><Tag color={statusColors[detail.status]}>{statusLabels[detail.status]}</Tag></Descriptions.Item>
          <Descriptions.Item label="来源">{detail.source_type.toUpperCase()}</Descriptions.Item>
          <Descriptions.Item label="总行数">{detail.total_rows}</Descriptions.Item>
          <Descriptions.Item label="已校验">{detail.validated_rows}</Descriptions.Item>
          <Descriptions.Item label="已创建草稿">{detail.created_count}</Descriptions.Item>
          <Descriptions.Item label="错误数">{detail.error_count}</Descriptions.Item>
          <Descriptions.Item label="错误摘要">{detail.error_message || '-'}</Descriptions.Item>
          <Descriptions.Item label="心跳">{formatDate(detail.heartbeat_at)}</Descriptions.Item>
          <Descriptions.Item label="开始时间">{formatDate(detail.started_at)}</Descriptions.Item>
          <Descriptions.Item label="完成时间">{formatDate(detail.finished_at)}</Descriptions.Item>
          <Descriptions.Item label="过期时间">{formatDate(detail.expires_at)}</Descriptions.Item>
        </Descriptions>}
      </Drawer>
    </PageContainer>
  )
}
