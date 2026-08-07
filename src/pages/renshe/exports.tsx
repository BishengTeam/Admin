import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Descriptions,
  Drawer,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { DownloadOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, RetweetOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { certificationService } from '@/services/certification'
import { rensheService } from '@/services/renshe'
import type { CertificationPlan } from '@/types/certification'
import type { RensheCleanupRun, RensheExportJob, RensheExportVolume } from '@/types/renshe'
import { formatDate } from '@/utils/format'
import { formatBytes, isPlanExportLocked, RENSHE_PRODUCT_CODE } from '@/utils/renshe'

const { Text } = Typography

const EXPORT_STATUS_MAP: Record<string, { text: string; color: string }> = {
  queued: { text: '排队中', color: 'default' },
  running: { text: '处理中', color: 'processing' },
  succeeded: { text: '已完成', color: 'green' },
  failed: { text: '失败', color: 'red' },
}

function statusTag(status: string) {
  const config = EXPORT_STATUS_MAP[status]
  return <Tag color={config?.color}>{config?.text ?? status}</Tag>
}

function downloadSignedUrl(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export default function RensheExportsPage() {
  const [searchParams] = useSearchParams()
  const queryPlanId = Number(searchParams.get('plan_id')) || undefined
  const [plans, setPlans] = useState<CertificationPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(queryPlanId)
  const [jobs, setJobs] = useState<RensheExportJob[]>([])
  const [cleanupRuns, setCleanupRuns] = useState<RensheCleanupRun[]>([])
  const [loading, setLoading] = useState(false)
  const [detailJob, setDetailJob] = useState<RensheExportJob | null>(null)
  const canWrite = usePermission('user:write')

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId)
  const exportLocked = isPlanExportLocked(selectedPlan, cleanupRuns)

  useEffect(() => {
    certificationService.listPlans(RENSHE_PRODUCT_CODE).then((items) => {
      setPlans(items)
      if (!queryPlanId && items.length > 0) setSelectedPlanId(items[0].id)
    })
  }, [queryPlanId])

  const loadJobs = useCallback(async (quiet = false) => {
    if (!selectedPlanId) {
      setJobs([])
      setCleanupRuns([])
      return
    }
    if (!quiet) setLoading(true)
    try {
      const [jobItems, runs] = await Promise.all([
        rensheService.listExportJobs(selectedPlanId),
        rensheService.listCleanupRuns(selectedPlanId),
      ])
      setJobs(jobItems)
      setCleanupRuns(runs)
      setDetailJob((current) => current ? jobItems.find((job) => job.id === current.id) ?? current : current)
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [selectedPlanId])

  useEffect(() => {
    void loadJobs()
  }, [selectedPlanId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!jobs.some((job) => ['queued', 'running'].includes(job.status))) return
    const timer = window.setInterval(() => { void loadJobs(true) }, 5000)
    return () => window.clearInterval(timer)
  }, [jobs, loadJobs])

  const createExport = async () => {
    if (!selectedPlanId) return
    const job = await rensheService.createExportJob(selectedPlanId)
    message.success('导出任务已创建')
    setDetailJob(job)
    await loadJobs()
  }

  const retryExport = async (job: RensheExportJob) => {
    const updated = await rensheService.retryExportJob(job.id)
    message.success('导出任务已重新排队')
    setDetailJob(updated)
    await loadJobs()
  }

  const openDetail = async (job: RensheExportJob) => {
    setDetailJob(job)
    setDetailJob(await rensheService.getExportJob(job.id))
  }

  const downloadVolume = async (volume: RensheExportVolume) => {
    const result = await rensheService.getExportVolumeSignedUrl(volume.id)
    downloadSignedUrl(result.url)
  }

  const volumeColumns = useMemo<ColumnsType<RensheExportVolume>>(() => [
    { title: '分卷', dataIndex: 'volume_no', width: 75, render: (value: number) => `第 ${value} 卷` },
    { title: '状态', dataIndex: 'status', width: 90, render: statusTag },
    { title: '考生数', dataIndex: 'candidate_count', width: 90 },
    { title: '大小', dataIndex: 'size_bytes', width: 110, render: (value: number | null) => formatBytes(value) },
    { title: '完成时间', dataIndex: 'finished_at', width: 170, render: (value: string | null) => value ? formatDate(value) : '-' },
    { title: '失败原因', dataIndex: 'last_error', ellipsis: true, render: (value: string | null) => value || '-' },
    {
      title: '操作',
      width: 100,
      render: (_, volume) => canWrite && volume.download_available ? (
        <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => downloadVolume(volume)}>
          下载
        </Button>
      ) : null,
    },
  ], [canWrite])

  const columns = useMemo<ColumnsType<RensheExportJob>>(() => [
    { title: '任务', dataIndex: 'id', width: 85, render: (id: number) => `#${id}` },
    { title: '代次', dataIndex: 'generation_no', width: 70 },
    { title: '状态', dataIndex: 'status', width: 90, render: statusTag },
    {
      title: '进度',
      width: 210,
      render: (_, job) => {
        const percent = job.candidate_total > 0
          ? Math.round((job.candidate_processed / job.candidate_total) * 100)
          : job.status === 'succeeded' ? 100 : 0
        return (
          <Progress
            percent={percent}
            size="small"
            format={() => `${job.candidate_processed}/${job.candidate_total}`}
            status={job.status === 'failed' ? 'exception' : undefined}
          />
        )
      },
    },
    { title: '分卷数', dataIndex: 'volume_count', width: 85 },
    { title: '心跳时间', dataIndex: 'heartbeat_at', width: 170, render: (value: string | null) => value ? formatDate(value) : '-' },
    { title: '重试次数', dataIndex: 'retry_count', width: 90 },
    { title: '失败原因', dataIndex: 'last_error', ellipsis: true, render: (value: string | null) => value || '-' },
    {
      title: '操作',
      width: 160,
      fixed: 'right',
      render: (_, job) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(job)}>详情</Button>
          {canWrite && job.status === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<RetweetOutlined />}
              disabled={exportLocked}
              onClick={() => retryExport(job)}
            >
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ], [canWrite, exportLocked])

  return (
    <PageContainer
      title="人社批次导出中心"
      extra={
        <>
          {canWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!selectedPlanId || exportLocked}
              onClick={createExport}
            >
              新建导出
            </Button>
          )}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => loadJobs()}>刷新</Button>
        </>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Text strong>批次</Text>
        <Select
          value={selectedPlanId}
          onChange={(planId) => {
            setSelectedPlanId(planId)
            setDetailJob(null)
          }}
          showSearch
          optionFilterProp="label"
          style={{ width: 300 }}
          options={plans.map((plan) => ({ value: plan.id, label: `${plan.name} (#${plan.id})` }))}
        />
        {selectedPlan?.cleanup_due_at && (
          <Text type={exportLocked ? 'danger' : 'secondary'}>
            清理期限：{formatDate(selectedPlan.cleanup_due_at)}
          </Text>
        )}
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={jobs}
        loading={loading}
        pagination={false}
        scroll={{ x: 1150 }}
      />

      <Drawer
        title={detailJob ? `导出任务 #${detailJob.id}` : '导出任务'}
        open={Boolean(detailJob)}
        onClose={() => setDetailJob(null)}
        width="min(980px, 92vw)"
        extra={detailJob && canWrite && detailJob.status === 'failed' && (
          <Button icon={<RetweetOutlined />} disabled={exportLocked} onClick={() => retryExport(detailJob)}>重试任务</Button>
        )}
      >
        {detailJob && (
          <>
            <Descriptions bordered size="small" column={3} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="状态">{statusTag(detailJob.status)}</Descriptions.Item>
              <Descriptions.Item label="总考生数">{detailJob.candidate_total}</Descriptions.Item>
              <Descriptions.Item label="已处理数">{detailJob.candidate_processed}</Descriptions.Item>
              <Descriptions.Item label="分卷数量">{detailJob.volume_count}</Descriptions.Item>
              <Descriptions.Item label="重试次数">{detailJob.retry_count}</Descriptions.Item>
              <Descriptions.Item label="心跳时间">{detailJob.heartbeat_at ? formatDate(detailJob.heartbeat_at) : '-'}</Descriptions.Item>
              <Descriptions.Item label="开始时间">{detailJob.started_at ? formatDate(detailJob.started_at) : '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{detailJob.finished_at ? formatDate(detailJob.finished_at) : '-'}</Descriptions.Item>
              <Descriptions.Item label="失败原因">{detailJob.last_error || '-'}</Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="id"
              columns={volumeColumns}
              dataSource={detailJob.volumes}
              pagination={false}
              size="small"
              scroll={{ x: 850 }}
            />
          </>
        )}
      </Drawer>
    </PageContainer>
  )
}
