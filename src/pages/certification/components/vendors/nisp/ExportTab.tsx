import { useState } from 'react'
import {
  Button, Card, Modal, Select, Space, Table, Tag, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { http } from '@/core/request'
import { formatDate } from '@/utils/format'
import type { PageData } from '@/types/api'

const { Text } = Typography

interface NispExportJob {
  id: number
  batch_id: number
  level: '1' | '2'
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  registration_count: number
  storage_key: string | null
  artifact_bytes: number | null
  expires_at: string | null
  last_error: string | null
  created_at: string
}

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  queued: { text: '排队中', color: 'default' },
  running: { text: '处理中', color: 'processing' },
  succeeded: { text: '已完成', color: 'green' },
  failed: { text: '失败', color: 'red' },
}

interface NispBatch {
  id: number
  plan_name: string
  level: '1' | '2'
}

export default function NispExportTab() {
  const [open, setOpen] = useState(false)
  const [batchId, setBatchId] = useState<number>()
  const [level, setLevel] = useState<string>('1')
  const [creating, setCreating] = useState(false)

  const { data, loading, pagination, refresh } = usePagination<NispExportJob>(
    (page) => http.get<PageData<NispExportJob>>('/admin/nisp/export/jobs', { params: page }),
    [],
  )

  const { data: batchData, loading: batchLoading } = usePagination<NispBatch>(
    (page) => http.get<PageData<NispBatch>>('/admin/nisp/batches', { params: page }),
    [],
  )

  const createJob = async () => {
    if (!batchId) {
      message.warning('请选择批次')
      return
    }
    setCreating(true)
    try {
      await http.post('/admin/nisp/export', {
        batch_id: batchId,
        level,
        include_statuses: ['approved'],
      })
      message.success('导出任务已创建')
      setOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const download = async (job: NispExportJob) => {
    try {
      const result = await http.get<{ url: string }>(`/admin/nisp/export/jobs/${job.id}/signed-url`)
      window.open(result.url, '_blank')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '下载失败')
    }
  }

  const columns: ColumnsType<NispExportJob> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '批次', dataIndex: 'batch_id', width: 80 },
    {
      title: '级别',
      dataIndex: 'level',
      width: 80,
      render: (v: string) => (
        <Tag color={v === '1' ? 'blue' : 'purple'}>{v === '1' ? '一级' : '二级'}</Tag>
      ),
    },
    { title: '记录数', dataIndex: 'registration_count', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v] ?? { text: v, color: 'default' }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '文件大小',
      dataIndex: 'artifact_bytes',
      width: 90,
      render: (v: number | null) => v ? `${(v / 1024).toFixed(0)} KB` : '-',
    },
    { title: '过期时间', dataIndex: 'expires_at', width: 110, render: (v: string | null) => v ? formatDate(v) : '-' },
    { title: '创建时间', dataIndex: 'created_at', width: 110, render: (v: string) => formatDate(v) },
    {
      title: '操作',
      width: 100,
      render: (_, row) => (
        <Button
          size='small'
          icon={<DownloadOutlined />}
          disabled={row.status !== 'succeeded'}
          onClick={() => download(row)}
        >
          下载
        </Button>
      ),
    },
  ]

  return (
    <Card>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
        <Button type='primary' icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          新建导出
        </Button>
      </Space>
      <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />

      <Modal
        title="新建 NISP 导出任务"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={createJob}
        confirmLoading={creating}
        width={480}
        destroyOnClose
      >
        <Space direction='vertical' style={{ width: '100%' }} size='middle'>
          <div>
            <Text type='secondary' style={{ display: 'block', marginBottom: 8 }}>选择考试批次</Text>
            <Select
              placeholder="选择批次"
              style={{ width: '100%' }}
              value={batchId}
              onChange={setBatchId}
              loading={batchLoading}
              options={(batchData?.items ?? []).map((b) => ({
                value: b.id,
                label: `${b.plan_name}（${b.level === '1' ? '一级' : '二级'}）`,
              }))}
            />
          </div>
          <div>
            <Text type='secondary' style={{ display: 'block', marginBottom: 8 }}>导出级别</Text>
            <Select
              value={level}
              onChange={setLevel}
              style={{ width: '100%' }}
              options={[
                { value: '1', label: 'NISP一级（12列）' },
                { value: '2', label: 'NISP二级（20列）' },
              ]}
            />
          </div>
          <Text type='secondary' style={{ fontSize: 12 }}>
            仅导出状态为「审核通过」的报名记录。导出文件保存72小时。
          </Text>
        </Space>
      </Modal>
    </Card>
  )
}
