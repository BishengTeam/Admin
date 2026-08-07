import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Descriptions, Drawer, Input, InputNumber, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import { ApiError } from '@/core/request'
import type { AuditFilter, AuditLog } from '@/types/quiz'

function errorText(error: unknown) { return error instanceof Error ? error.message : '请求失败' }
function formatDate(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
function json(value: unknown) { return value == null ? '-' : JSON.stringify(value, null, 2) }

export default function QuizAuditLogs() {
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
  const columns: ColumnsType<AuditLog> = [
    { title: '时间', dataIndex: 'created_at', width: 175, render: formatDate },
    { title: '操作者', key: 'actor', width: 120, render: (_, row) => row.actor_type === 'system' ? 'system' : `管理员 #${row.admin_id ?? '-'}` },
    { title: '动作', dataIndex: 'action', width: 160 },
    { title: '对象', key: 'object', width: 150, render: (_, row) => `${row.object_type}${row.object_id == null ? '' : ` #${row.object_id}`}` },
    { title: '结果', dataIndex: 'result', width: 90, render: (value: AuditLog['result']) => <Tag color={value === 'succeeded' ? 'success' : 'error'}>{value === 'succeeded' ? '成功' : '失败'}</Tag> },
    { title: '错误摘要', dataIndex: 'error_summary', ellipsis: true },
    { title: '详情', key: 'detail', width: 80, render: (_, row) => <Button type="link" size="small" onClick={() => setSelected(row)}>查看</Button> },
  ]

  return (
    <PageContainer title="题库审计日志">
      <Space wrap style={{ marginBottom: 16 }}>
        <InputNumber min={1} placeholder="管理员 ID" value={filters.admin_id} onChange={(value) => update({ admin_id: value ?? undefined })} />
        <Input placeholder="动作" value={filters.action} onChange={(event) => update({ action: event.target.value || undefined })} />
        <Input placeholder="对象类型" value={filters.object_type} onChange={(event) => update({ object_type: event.target.value || undefined })} />
        <InputNumber min={1} placeholder="对象 ID" value={filters.object_id} onChange={(value) => update({ object_id: value ?? undefined })} />
        <Select allowClear placeholder="结果" value={filters.result} onChange={(value) => update({ result: value })} options={[{ value: 'succeeded', label: '成功' }, { value: 'failed', label: '失败' }]} style={{ width: 110 }} />
        <Button icon={<ReloadOutlined />} onClick={() => load(filters)}>刷新</Button>
      </Space>
      <Table<AuditLog> rowKey="id" scroll={{ x: 1000 }} columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={{ current: data?.page ?? 1, pageSize: data?.page_size ?? 20, total: data?.total ?? 0, showSizeChanger: true, onChange: (page, pageSize) => setFilters((current) => ({ ...current, page, page_size: pageSize })) }} />
      <Drawer title={`审计详情 #${selected?.id ?? ''}`} open={Boolean(selected)} onClose={() => setSelected(null)} width={560}>
        {selected && <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="时间">{formatDate(selected.created_at)}</Descriptions.Item>
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
    </PageContainer>
  )
}
