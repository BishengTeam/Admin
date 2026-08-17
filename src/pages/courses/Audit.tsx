import { useState } from 'react'
import { Button, Descriptions, Drawer, Form, Input, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { usePagination } from '@/hooks/usePagination'
import { courseManagementService } from '@/services/courseManagement'
import { formatDate } from '@/utils/format'
import type { CourseAuditItem } from '@/types/course'

interface FilterValues {
  course_id?: number
  action?: string
  result?: 'succeeded' | 'failed'
}

export default function CourseAudit() {
  const [filters, setFilters] = useState<FilterValues>({})
  const [selected, setSelected] = useState<CourseAuditItem | null>(null)
  const [form] = Form.useForm<FilterValues>()
  const { data, loading, pagination } = usePagination(
    (page, signal) => courseManagementService.listAuditLogs({ ...filters, ...page }, signal),
    [JSON.stringify(filters)],
  )

  const columns: ColumnsType<CourseAuditItem> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '时间', dataIndex: 'created_at', width: 170, render: value => formatDate(value) },
    { title: '动作', dataIndex: 'action', width: 230 },
    { title: '对象', width: 180, render: (_, record) => `${record.object_type} #${record.object_id ?? '-'}` },
    {
      title: '结果',
      dataIndex: 'result',
      width: 90,
      render: value => <Tag color={value === 'succeeded' ? 'green' : 'red'}>{value === 'succeeded' ? '成功' : '失败'}</Tag>,
    },
    { title: '操作者', width: 130, render: (_, record) => `${record.actor_type} #${record.actor_id ?? '-'}` },
    { title: 'IP', dataIndex: 'ip_address', width: 130, render: value => value || '-' },
  ]

  return (
    <div>
      <Form<FilterValues> form={form} layout="inline" onFinish={setFilters} style={{ marginBottom: 16, rowGap: 12 }}>
        <Form.Item name="course_id" label="课程 ID">
          <Input type="number" min={1} style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="action" label="动作">
          <Input placeholder="course.published" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="result" label="结果">
          <Select
            allowClear
            options={[
              { value: 'succeeded', label: '成功' },
              { value: 'failed', label: '失败' },
            ]}
            style={{ width: 100 }}
          />
        </Form.Item>
        <Form.Item><Button type="primary" htmlType="submit">查询</Button></Form.Item>
        <Form.Item><Button onClick={() => { form.resetFields(); setFilters({}) }}>重置</Button></Form.Item>
      </Form>
      <Table<CourseAuditItem>
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        onRow={record => ({ onClick: () => setSelected(record), style: { cursor: 'pointer' } })}
        scroll={{ x: 1000 }}
      />
      <Drawer
        title={`课程审计 #${selected?.id ?? ''}`}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        width={620}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="动作">{selected.action}</Descriptions.Item>
            <Descriptions.Item label="对象">{selected.object_type} #{selected.object_id ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="操作者">{selected.actor_type} #{selected.actor_id ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="请求 ID">{selected.request_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="变更字段">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected.changed_fields, null, 2)}</pre>
            </Descriptions.Item>
            <Descriptions.Item label="摘要">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected.summary, null, 2)}</pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
