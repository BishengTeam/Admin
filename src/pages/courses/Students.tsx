import { useState } from 'react'
import { Button, Form, InputNumber, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { usePagination } from '@/hooks/usePagination'
import { courseManagementService } from '@/services/courseManagement'
import { formatDate, formatPrice } from '@/utils/format'
import type { CourseEnrollment } from '@/types/course'

interface FilterValues {
  course_id?: number
  user_id?: number
  status?: string
}

const STATUS_OPTIONS = [
  { value: 'pending_payment', label: '待支付' },
  { value: 'enrolled', label: '已开通' },
  { value: 'completed', label: '已完成' },
  { value: 'refunded', label: '已退款' },
  { value: 'cancelled', label: '已取消' },
  { value: 'expired', label: '已过期' },
]

export default function CourseStudents({ courseId }: { courseId?: number }) {
  const [filters, setFilters] = useState<FilterValues>({ course_id: courseId })
  const [form] = Form.useForm<FilterValues>()
  const { data, loading, pagination, refresh } = usePagination(
    (page, signal) => courseManagementService.listEnrollments({ ...filters, ...page }, signal),
    [JSON.stringify(filters)],
  )

  const columns: ColumnsType<CourseEnrollment> = [
    { title: '报名 ID', dataIndex: 'id', width: 90 },
    { title: '用户 ID', dataIndex: 'user_id', width: 90 },
    {
      title: '课程',
      dataIndex: 'course_title',
      width: 200,
      ellipsis: true,
      render: (value, record) => `${value} (#${record.course_id})`,
    },
    { title: '订单 ID', dataIndex: 'order_id', width: 100, render: value => value ?? '-' },
    {
      title: '订单金额',
      dataIndex: 'order_price',
      width: 100,
      render: value => value == null ? '-' : formatPrice(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: status => {
        const map: Record<string, { text: string; color: string }> = {
          pending_payment: { text: '待支付', color: 'warning' },
          enrolled: { text: '已开通', color: 'success' },
          completed: { text: '已完成', color: 'success' },
          refunded: { text: '已退款', color: 'red' },
          cancelled: { text: '已取消', color: 'default' },
          expired: { text: '已过期', color: 'default' },
        }
        const item = map[status]
        return <Tag color={item?.color}>{item?.text ?? status}</Tag>
      },
    },
    {
      title: '学习权限',
      dataIndex: 'learning_access',
      width: 100,
      render: value => <Tag color={value ? 'green' : 'default'}>{value ? '可学习' : '无权限'}</Tag>,
    },
    {
      title: '有效题库权益',
      dataIndex: 'active_entitlement_count',
      width: 120,
      render: (value: number) => value || '-',
    },
    {
      title: '权益来源',
      dataIndex: 'entitlement_sources',
      width: 180,
      render: (values: string[]) => values.length
        ? values.map(value => <Tag key={value}>{value === 'course_order' ? '付费订单' : '免费报名'}</Tag>)
        : '-',
    },
    { title: '开通时间', dataIndex: 'access_granted_at', width: 170, render: value => value ? formatDate(value) : '-' },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: value => formatDate(value) },
  ]

  return (
    <div>
      <Form<FilterValues>
        form={form}
        layout="inline"
        initialValues={filters}
        onFinish={values => setFilters({
          course_id: values.course_id ?? courseId,
          user_id: values.user_id,
          status: values.status,
        })}
        style={{ marginBottom: 16, rowGap: 12 }}
      >
        <Form.Item name="course_id" label="课程 ID">
          <InputNumber min={1} precision={0} placeholder="课程 ID" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="user_id" label="用户 ID">
          <InputNumber min={1} precision={0} placeholder="用户 ID" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select allowClear options={STATUS_OPTIONS} placeholder="全部" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">查询</Button>
        </Form.Item>
        <Form.Item>
          <Button onClick={() => { form.resetFields(); setFilters({ course_id: courseId }) }}>重置</Button>
        </Form.Item>
      </Form>
      <Table<CourseEnrollment>
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1200 }}
      />
      <Button onClick={refresh} style={{ marginTop: 12 }}>刷新</Button>
    </div>
  )
}
