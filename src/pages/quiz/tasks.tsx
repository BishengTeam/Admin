import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Descriptions, Space, Table, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import type { QuizTaskMetric, QuizTaskProbe } from '@/types/quiz'

const { Text } = Typography

const PROCESSOR_LABELS: Record<string, string> = {
  'quiz-import': '导入任务',
  'quiz-import-cleanup': '导入与 OSS 清理',
  'quiz-exam-timeout': '考试超时结算',
  'quiz-question-stats': '题目统计聚合',
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}

function probeStatus(probe?: QuizTaskProbe) {
  if (!probe) return <Tag>未获取</Tag>
  const ok = probe.http_status < 400 && probe.code === 0 && ['ok', 'ready'].includes(probe.status)
  return <Tag color={ok ? 'success' : 'error'}>{probe.status}（HTTP {probe.http_status}）</Tag>
}

function secondsSince(value: string | null) {
  return value ? Math.max(0, (Date.now() - new Date(value).getTime()) / 1000) : Number.POSITIVE_INFINITY
}

export default function QuizTaskMonitor() {
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
    setLoading(false)
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
    { title: '最近心跳', dataIndex: 'last_heartbeat_at', width: 180, render: formatDate },
    { title: '状态判断', key: 'derived_status', width: 110, render: (_, row) => row.queue_depth > 0 && secondsSince(row.last_heartbeat_at) > 120 ? <Tag color="error">疑似卡死</Tag> : row.name === 'quiz-question-stats' && row.queue_depth > 0 && secondsSince(row.last_finished_at) > 60 ? <Tag color="warning">聚合滞后</Tag> : <Tag color="success">正常</Tag> },
    { title: '最近异常', dataIndex: 'last_error_type', ellipsis: true, render: (value: string | null) => value ? <Text type="danger">{value}</Text> : '-' },
  ]

  return (
    <PageContainer
      title="题库任务监控"
      extra={<Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>}
    >
      <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="存活检查">{probeStatus(health)}</Descriptions.Item>
        <Descriptions.Item label="就绪检查">{probeStatus(ready)}</Descriptions.Item>
        <Descriptions.Item label="任务心跳">{formatDate(snapshot?.heartbeat_at ?? null)}</Descriptions.Item>
        <Descriptions.Item label="指标来源">
          {snapshot?.source === 'redis' ? '独立 Worker（Redis 共享）' : snapshot?.source === 'process' ? 'Web 进程内' : snapshot?.source === 'disabled' ? '任务已停用' : '共享指标不可用'}
        </Descriptions.Item>
        <Descriptions.Item label="总队列积压">{signals?.total_queue_depth ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="考试超时积压">{signals?.exam_timeout_queue_depth ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="OSS 清理积压">{signals?.oss_cleanup_queue_depth ?? '-'}</Descriptions.Item>
      </Descriptions>
      {error && <Alert type="error" showIcon message="部分监控接口请求失败" description={error} style={{ marginBottom: 16 }} />}
      {hasFailures && <Alert type="warning" showIcon message="存在失败或异常处理器，请结合审计日志和后端日志排查" style={{ marginBottom: 16 }} />}
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
    </PageContainer>
  )
}
