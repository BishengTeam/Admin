import { useState } from 'react'
import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { usePagination } from '@/hooks/usePagination'
import { adminManagementService } from '@/services/adminManagement'
import { formatDate } from '@/utils/format'
import type { SecurityAuditFilters, SecurityAuditItem } from '@/types/admin'

const { RangePicker } = DatePicker
const { Text } = Typography

const sensitiveKeyPattern = /password|passwd|token|authorization|credential|secret|hash/i

/** 对后端已经脱敏的摘要再做一次展示层兜底，防止未来扩展字段误显凭据。 */
export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? '[已脱敏]' : sanitizeAuditValue(item),
    ]),
  )
}

function summaryText(summary: Record<string, unknown> | null): string {
  if (!summary) return '-'
  return JSON.stringify(sanitizeAuditValue(summary), null, 2)
}

function userAgentSummary(value: string | null): string {
  if (!value) return '-'
  return value.length > 80 ? `${value.slice(0, 77)}...` : value
}

interface AuditSearchValues extends Omit<SecurityAuditFilters, 'started_at' | 'ended_at'> {
  time_range?: [import('dayjs').Dayjs, import('dayjs').Dayjs]
}

export default function SecurityAuditPage() {
  const [filters, setFilters] = useState<SecurityAuditFilters>({})
  const [selected, setSelected] = useState<SecurityAuditItem | null>(null)
  const [form] = Form.useForm<AuditSearchValues>()

  const { data, loading, pagination, refresh } = usePagination(
    (page, signal) => adminManagementService.listSecurityAudit({ ...filters, ...page }, signal),
    [JSON.stringify(filters)],
  )

  const columns: ColumnsType<SecurityAuditItem> = [
    { title: '时间', dataIndex: 'created_at', width: 175, render: (value: string) => formatDate(value) },
    { title: '动作', dataIndex: 'action', width: 190, ellipsis: true },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: (value: SecurityAuditItem['result']) => (
        <Tag color={value === 'succeeded' ? 'success' : 'error'}>{value === 'succeeded' ? '成功' : '失败'}</Tag>
      ),
    },
    { title: '原因代码', dataIndex: 'reason_code', width: 150, ellipsis: true, render: (value: string | null) => value || '-' },
    { title: '操作者', dataIndex: 'actor_admin_id', width: 100, render: (value: number | null) => value == null ? '-' : `#${value}` },
    { title: '目标账号', dataIndex: 'target_admin_id', width: 100, render: (value: number | null) => value == null ? '-' : `#${value}` },
    { title: '尝试用户名', dataIndex: 'username', width: 150, ellipsis: true, render: (value: string | null) => value || '-' },
    { title: '来源 IP', dataIndex: 'source_ip', width: 145, render: (value: string | null) => value || '-' },
    { title: 'User-Agent 摘要', dataIndex: 'user_agent', width: 230, ellipsis: true, render: userAgentSummary },
    { title: '请求 ID', dataIndex: 'request_id', width: 240, ellipsis: true, render: (value: string | null) => value || '-' },
    {
      title: '详情',
      fixed: 'right',
      width: 80,
      render: (_, item) => <Button type="link" size="small" onClick={() => setSelected(item)}>查看</Button>,
    },
  ]

  const applyFilters = (values: AuditSearchValues) => {
    setFilters({
      actor_admin_id: values.actor_admin_id,
      target_admin_id: values.target_admin_id,
      action: values.action?.trim() || undefined,
      result: values.result,
      username: values.username?.trim() || undefined,
      request_id: values.request_id?.trim() || undefined,
      started_at: values.time_range?.[0]?.toISOString(),
      ended_at: values.time_range?.[1]?.toISOString(),
    })
  }

  return (
    <PageContainer title="管理员安全审计">
      <Text type="secondary">安全审计永久保留且仅供查询，不提供修改或删除能力。</Text>
      <Form<AuditSearchValues>
        form={form}
        layout="inline"
        onFinish={applyFilters}
        style={{ rowGap: 12, marginTop: 16, marginBottom: 16 }}
      >
        <Form.Item name="actor_admin_id" label="操作者">
          <InputNumber min={1} precision={0} placeholder="管理员 ID" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="target_admin_id" label="目标账号">
          <InputNumber min={1} precision={0} placeholder="管理员 ID" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="username" label="用户名">
          <Input allowClear placeholder="尝试登录用户名" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="action" label="动作">
          <Input allowClear placeholder="动作代码" style={{ width: 180 }} />
        </Form.Item>
        <Form.Item name="result" label="结果">
          <Select allowClear placeholder="全部" style={{ width: 100 }} options={[
            { value: 'succeeded', label: '成功' },
            { value: 'failed', label: '失败' },
          ]} />
        </Form.Item>
        <Form.Item name="request_id" label="请求 ID">
          <Input allowClear placeholder="完整请求 ID" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="time_range" label="时间">
          <RangePicker showTime allowClear />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={() => { form.resetFields(); setFilters({}) }}>重置</Button>
            <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table<SecurityAuditItem>
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1780 }}
      />

      <Drawer
        title={`安全审计详情 #${selected?.id ?? ''}`}
        open={Boolean(selected)}
        width={640}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="服务端时间">{formatDate(selected.created_at)}</Descriptions.Item>
            <Descriptions.Item label="动作代码">{selected.action}</Descriptions.Item>
            <Descriptions.Item label="执行结果">{selected.result === 'succeeded' ? '成功' : '失败'}</Descriptions.Item>
            <Descriptions.Item label="内部原因代码">{selected.reason_code || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作者管理员 ID">{selected.actor_admin_id ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="目标管理员 ID">{selected.target_admin_id ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="尝试用户名">{selected.username || '-'}</Descriptions.Item>
            <Descriptions.Item label="请求 ID">{selected.request_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="来源 IP">{selected.source_ip || '-'}</Descriptions.Item>
            <Descriptions.Item label="User-Agent">{selected.user_agent || '-'}</Descriptions.Item>
            <Descriptions.Item label="脱敏摘要">
              <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: 0 }}>{summaryText(selected.summary)}</pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  )
}
