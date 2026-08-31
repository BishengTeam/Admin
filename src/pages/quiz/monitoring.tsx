import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, DatePicker, Descriptions, Drawer, Input, InputNumber, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import type { AuditFilter, AuditLog, QuizTaskMetric, QuizTaskProbe } from '@/types/quiz'

const { RangePicker } = DatePicker
const { Text } = Typography

const PROCESSOR_LABELS: Record<string, string> = {
  'quiz-import': '导入任务',
  'quiz-import-cleanup': '导入与 OSS 清理',
  'quiz-exam-timeout': '考试超时结算',
  'quiz-question-stats': '题目统计聚合',
}

function errorText(error: unknown) { return error instanceof Error ? error.message : '请求失败' }

function formatAuditDate(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }

function formatTaskDate(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}

function json(value: unknown) { return value == null ? '-' : JSON.stringify(value, null, 2) }

function probeStatus(probe?: QuizTaskProbe) {
  if (!probe) return <Tag>未获取</Tag>
  const ok = probe.http_status < 400 && probe.code === 0 && ['ok', 'ready'].includes(probe.status)
  return <Tag color={ok ? 'success' : 'error'}>{probe.status}（HTTP {probe.http_status}）</Tag>
}

function secondsSince(value: string | null) {
  return value ? Math.max(0, (Date.now() - new Date(value).getTime()) / 1000) : Number.POSITIVE_INFINITY
}

function TaskMonitorPanel() {
  const [probes, setProbes] = useState<QuizTaskProbe[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setLoading(true)
    setError(undefined)
    const results = await Promise.allSettled([
      quizService.getTaskProbe('health', next.signal),
      quizService.getTaskProbe('ready', next.signal),
    ])
    if (next.signal.aborted) return
    const successful = results
      .filter((result): result is PromiseFulfilledResult<QuizTaskProbe> => result.status === 'fulfilled')
      .map((result) => result.value)
    setProbes(successful)
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (failures.length) {
      setError(failures.map((result) => result.reason instanceof Error ? result.reason.message : '任务监控请求失败').join('；'))
    }
    if (!next.signal.aborted) setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    return () => controller.current?.abort()
  }, [load])

  const health = probes.find((probe) => probe.endpoint === 'health')
  const ready = probes.find((probe) => probe.endpoint === 'ready')
  const snapshot = health?.quiz_tasks ?? ready?.quiz_tasks
  const processors = useMemo(() => Object.values(snapshot?.processors ?? {}), [snapshot])
  const signals = snapshot?.signals
  const hasFailures = Boolean(signals?.total_failures) || processors.some((processor) => processor.last_error_type)
  const staleHeartbeat = Boolean(signals?.stale)
  const stuckProcessors = signals?.stuck_processors ?? []
  const statsLagging = Boolean(signals?.stats_lagging)

  const columns: ColumnsType<QuizTaskMetric> = [
    { title: '处理器', dataIndex: 'name', width: 170, render: (name: string) => PROCESSOR_LABELS[name] ?? name },
    { title: '队列深度', dataIndex: 'queue_depth', width: 90 },
    { title: '运行次数', dataIndex: 'runs', width: 90 },
    { title: '成功', dataIndex: 'successes', width: 80 },
    { title: '失败', dataIndex: 'failures', width: 80, render: (value: number) => value ? <Text type="danger">{value}</Text> : 0 },
    { title: '重试', dataIndex: 'retries', width: 80 },
    { title: '最近耗时', dataIndex: 'last_runtime_seconds', width: 110, render: (value: number | null) => value == null ? '-' : `${value.toFixed(3)} s` },
    { title: '最近心跳', dataIndex: 'last_heartbeat_at', width: 180, render: formatTaskDate },
    { title: '状态判断', key: 'derived_status', width: 110, render: (_, row) => row.queue_depth > 0 && secondsSince(row.last_heartbeat_at) > 120 ? <Tag color="error">疑似卡死</Tag> : row.name === 'quiz-question-stats' && row.queue_depth > 0 && secondsSince(row.last_finished_at) > 60 ? <Tag color="warning">聚合滞后</Tag> : <Tag color="success">正常</Tag> },
    { title: '最近异常', dataIndex: 'last_error_type', ellipsis: true, render: (value: string | null) => value ? <Text type="danger">{value}</Text> : '-' },
  ]

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
      </Space>
      <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="存活检查">{probeStatus(health)}</Descriptions.Item>
        <Descriptions.Item label="就绪检查">{probeStatus(ready)}</Descriptions.Item>
        <Descriptions.Item label="任务心跳">{formatTaskDate(snapshot?.heartbeat_at ?? null)}</Descriptions.Item>
        <Descriptions.Item label="指标来源">
          {snapshot?.source === 'redis' ? '独立 Worker（Redis 共享）' : snapshot?.source === 'process' ? 'Web 进程内' : snapshot?.source === 'disabled' ? '任务已停用' : '共享指标不可用'}
        </Descriptions.Item>
        <Descriptions.Item label="总队列积压">{signals?.total_queue_depth ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="考试超时积压">{signals?.exam_timeout_queue_depth ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="OSS 清理积压">{signals?.oss_cleanup_queue_depth ?? '-'}</Descriptions.Item>
      </Descriptions>
      {error && <Alert type="error" showIcon message="部分监控接口请求失败" description={error} style={{ marginBottom: 16 }} />}
      {hasFailures && <Alert type="warning" showIcon message="存在失败或异常处理器，请切换到“审计日志”并结合后端日志排查" style={{ marginBottom: 16 }} />}
      {staleHeartbeat && <Alert type="error" showIcon message="任务总心跳超过 120 秒未更新，独立 Worker 可能未运行" style={{ marginBottom: 16 }} />}
      {stuckProcessors.length > 0 && <Alert type="error" showIcon message="存在疑似卡死处理器" description={stuckProcessors.map((name) => PROCESSOR_LABELS[name] ?? name).join('、')} style={{ marginBottom: 16 }} />}
      {statsLagging && <Alert type="warning" showIcon message="题目统计队列有积压，最近完成时间已超过 1 分钟" style={{ marginBottom: 16 }} />}
      <Table<QuizTaskMetric>
        rowKey="name"
        columns={columns}
        dataSource={processors}
        loading={loading}
        pagination={false}
        scroll={{ x: 1050 }}
        locale={{ emptyText: loading ? '正在加载' : '暂无任务指标' }}
      />
      <Space direction="vertical" style={{ marginTop: 16 }} size={2}>
        <Text type="secondary">指标来自后端 `/health` 与 `/ready` 的 `details.quiz_tasks`。</Text>
        <Text type="secondary">就绪检查返回 503 时仍展示任务指标，不会误报为管理接口调用失败。</Text>
        <Text type="secondary">只有“独立 Worker（Redis 共享）”可作为进程隔离的指标来源；真实部署和故障恢复仍需环境验收。</Text>
      </Space>
    </div>
  )
}

function AuditLogPanel() {
  const [filters, setFilters] = useState<AuditFilter>({ page: 1, page_size: 20 })
  const [data, setData] = useState<{ items: AuditLog[]; total: number; page: number; page_size: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const controller = useRef<AbortController | null>(null)
  const sequence = useRef(0)

  const load = useCallback(async (params = filters) => {
    const id = ++sequence.current
    controller.current?.abort()
    const next = new AbortController(); controller.current = next
    setLoading(true)
    try {
      const result = await quizService.listAuditLogs(params, next.signal)
      if (!next.signal.aborted && id === sequence.current) setData(result)
    } catch (error) {
      if (!next.signal.aborted && id === sequence.current) message.error(errorText(error))
    } finally { if (!next.signal.aborted && id === sequence.current) setLoading(false) }
  }, [JSON.stringify(filters)])

  useEffect(() => { load(); return () => controller.current?.abort() }, [load])

  const update = (next: Partial<AuditFilter>) => setFilters((current) => ({ ...current, ...next, page: 1 }))
  const invalidRange = Boolean(filters.start_at && filters.end_at && new Date(filters.start_at).getTime() > new Date(filters.end_at).getTime())
  const columns: ColumnsType<AuditLog> = [
    { title: '时间', dataIndex: 'created_at', width: 175, render: formatAuditDate },
    { title: '操作者', key: 'actor', width: 120, render: (_, row) => row.actor_type === 'system' ? 'system' : `管理员 #${row.admin_id ?? '-'}` },
    { title: '动作', dataIndex: 'action', width: 160 },
    { title: '对象', key: 'object', width: 150, render: (_, row) => `${row.object_type}${row.object_id == null ? '' : ` #${row.object_id}`}` },
    { title: '结果', dataIndex: 'result', width: 90, render: (value: AuditLog['result']) => <Tag color={value === 'succeeded' ? 'success' : 'error'}>{value === 'succeeded' ? '成功' : '失败'}</Tag> },
    { title: '错误摘要', dataIndex: 'error_summary', ellipsis: true },
    { title: '详情', key: 'detail', width: 80, render: (_, row) => <Button type="link" size="small" onClick={() => setSelected(row)}>查看</Button> },
  ]

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <InputNumber min={1} placeholder="管理员 ID" value={filters.admin_id} onChange={(value) => update({ admin_id: value ?? undefined })} />
        <Input placeholder="动作" value={filters.action} onChange={(event) => update({ action: event.target.value || undefined })} />
        <Input placeholder="对象类型" value={filters.object_type} onChange={(event) => update({ object_type: event.target.value || undefined })} />
        <InputNumber min={1} placeholder="对象 ID" value={filters.object_id} onChange={(value) => update({ object_id: value ?? undefined })} />
        <Select allowClear placeholder="结果" value={filters.result} onChange={(value) => update({ result: value })} options={[{ value: 'succeeded', label: '成功' }, { value: 'failed', label: '失败' }]} style={{ width: 110 }} />
        <Input allowClear placeholder="请求 ID" value={filters.request_id} onChange={(event) => update({ request_id: event.target.value || undefined })} style={{ width: 220 }} />
        <RangePicker
          showTime
          allowClear
          onChange={(values) => update({
            start_at: values?.[0]?.toISOString(),
            end_at: values?.[1]?.toISOString(),
          })}
        />
        <Button icon={<ReloadOutlined />} disabled={invalidRange} onClick={() => load(filters)}>刷新</Button>
      </Space>
      {invalidRange && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>开始时间不能晚于结束时间</div>}
      <Table<AuditLog> rowKey="id" scroll={{ x: 1000 }} columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={{ current: data?.page ?? 1, pageSize: data?.page_size ?? 20, total: data?.total ?? 0, showSizeChanger: true, onChange: (page, pageSize) => setFilters((current) => ({ ...current, page, page_size: pageSize })) }} />
      <Drawer title={`审计详情 #${selected?.id ?? ''}`} open={Boolean(selected)} onClose={() => setSelected(null)} width={560}>
        {selected && <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="时间">{formatAuditDate(selected.created_at)}</Descriptions.Item>
          <Descriptions.Item label="操作者">{selected.actor_type === 'system' ? 'system' : `管理员 #${selected.admin_id ?? '-'}`}</Descriptions.Item>
          <Descriptions.Item label="操作动作">{selected.action}</Descriptions.Item>
          <Descriptions.Item label="对象类型">{selected.object_type}</Descriptions.Item>
          <Descriptions.Item label="对象 ID">{selected.object_id ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="结果">{selected.result === 'succeeded' ? '成功' : '失败'}</Descriptions.Item>
          <Descriptions.Item label="权限">{selected.permission || '-'}</Descriptions.Item>
          <Descriptions.Item label="request_id">{selected.request_id || '-'}</Descriptions.Item>
          <Descriptions.Item label="IP">{selected.ip_address || '-'}</Descriptions.Item>
          <Descriptions.Item label="目标 ID">{selected.target_ids?.join(', ') || '-'}</Descriptions.Item>
          <Descriptions.Item label="变更字段"><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{json(selected.changed_fields)}</pre></Descriptions.Item>
          <Descriptions.Item label="错误摘要">{selected.error_summary || '-'}</Descriptions.Item>
        </Descriptions>}
      </Drawer>
    </div>
  )
}

export default function QuizMonitoring() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'audit' ? 'audit' : 'tasks'

  return (
    <PageContainer title="题库监控与审计">
      <Tabs
        activeKey={tab}
        onChange={(key) => setSearchParams(key === 'tasks' ? {} : { tab: key }, { replace: true })}
        items={[
          { key: 'tasks', label: '任务监控', children: <TaskMonitorPanel /> },
          { key: 'audit', label: '审计日志', children: <AuditLogPanel /> },
        ]}
      />
    </PageContainer>
  )
}
