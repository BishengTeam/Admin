import { useState } from 'react'
import { Button, Form, InputNumber, Select, Space, Table, Tag, message } from 'antd'
import { EyeOutlined, StopOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { ConfirmButton } from '@/components/ConfirmButton'
import { StatusTag } from '@/components/StatusTag'
import { ORDER_STATUS_MAP } from '@/core/constants'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { contentService } from '@/services/content'
import { formatDate, formatPrice } from '@/utils/format'
import { canRevokeCourseEnrollment } from '@/utils/course'
import type { CourseEnrollment, CourseEnrollmentFilter, CourseEnrollmentStatus } from '@/types/content'

const ENROLLMENT_STATUS_MAP: Record<CourseEnrollmentStatus, { text: string; color: string }> = {
  pending_payment: { text: '待支付', color: 'orange' },
  enrolled: { text: '学习中', color: 'green' },
  completed: { text: '已完成', color: 'blue' },
  refunded: { text: '已退款', color: 'red' },
  cancelled: { text: '已取消', color: 'default' },
  expired: { text: '已过期', color: 'default' },
}

const STATUS_OPTIONS = Object.entries(ENROLLMENT_STATUS_MAP).map(([value, item]) => ({
  value,
  label: item.text,
}))

export default function CourseEnrollments() {
  const [filters, setFilters] = useState<CourseEnrollmentFilter>({})
  const [form] = Form.useForm<CourseEnrollmentFilter>()
  const canRevoke = usePermission('course:write')
  const navigate = useNavigate()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => contentService.listCourseEnrollments({ ...filters, ...page }),
    [filters],
  )

  const handleSearch = (values: CourseEnrollmentFilter) => {
    setFilters({
      course_id: values.course_id || undefined,
      user_id: values.user_id || undefined,
      status: values.status || undefined,
    })
  }

  const handleReset = () => {
    form.resetFields()
    setFilters({})
  }

  const handleRevoke = async (record: CourseEnrollment) => {
    await contentService.revokeCourseEnrollment(record.id)
    message.success('学习权限已撤销')
    refresh()
  }

  const columns: ColumnsType<CourseEnrollment> = [
    { title: '报名ID', dataIndex: 'id', width: 80 },
    { title: '用户ID', dataIndex: 'user_id', width: 80 },
    {
      title: '课程',
      width: 180,
      ellipsis: true,
      render: (_, record) => `${record.course_title} (#${record.course_id})`,
    },
    {
      title: '订单',
      width: 100,
      render: (_, record) =>
        record.order_id ? (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate('/admin/orders', { state: { orderId: record.order_id } })}
          >
            #{record.order_id}
          </Button>
        ) : '-',
    },
    {
      title: '订单状态',
      dataIndex: 'order_status',
      width: 90,
      render: (status: string | null) => status ? <StatusTag status={status} map={ORDER_STATUS_MAP} /> : '-',
    },
    {
      title: '订单金额',
      dataIndex: 'order_price',
      width: 100,
      render: (price: number | null) => price == null ? '-' : formatPrice(price),
    },
    { title: '所选班次', dataIndex: 'batch_selected', width: 140, ellipsis: true, render: (value: string | null) => value || '-' },
    {
      title: '报名状态',
      dataIndex: 'status',
      width: 90,
      render: (status: CourseEnrollmentStatus) => {
        const item = ENROLLMENT_STATUS_MAP[status]
        return <Tag color={item?.color}>{item?.text ?? status}</Tag>
      },
    },
    {
      title: '学习权限',
      dataIndex: 'learning_access',
      width: 90,
      render: (access: boolean) => <Tag color={access ? 'green' : 'default'}>{access ? '可学习' : '无权限'}</Tag>,
    },
    {
      title: '开通时间',
      dataIndex: 'access_granted_at',
      width: 150,
      render: (value: string | null) => value ? formatDate(value) : '-',
    },
    {
      title: '撤销时间',
      dataIndex: 'access_revoked_at',
      width: 150,
      render: (value: string | null) => value ? formatDate(value) : '-',
    },
    { title: '创建时间', dataIndex: 'created_at', width: 150, render: (value: string) => formatDate(value) },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, record) =>
        canRevoke && canRevokeCourseEnrollment(record) ? (
          <ConfirmButton
            title="撤销学习权限"
            description="撤权后用户将立即无法访问课程内容。本操作不会退款，如需退款请前往订单管理处理。"
            danger
            type="link"
            size="small"
            icon={<StopOutlined />}
            onConfirm={() => handleRevoke(record)}
          >
            撤权
          </ConfirmButton>
        ) : null,
    },
  ]

  return (
    <div>
      <Form form={form} layout="inline" onFinish={handleSearch} style={{ marginBottom: 16 }}>
        <Form.Item name="course_id" label="课程ID">
          <InputNumber min={1} precision={0} placeholder="课程ID" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="user_id" label="用户ID">
          <InputNumber min={1} precision={0} placeholder="用户ID" style={{ width: 130 }} />
        </Form.Item>
        <Form.Item name="status" label="报名状态">
          <Select allowClear placeholder="全部状态" options={STATUS_OPTIONS} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1650 }}
      />
    </div>
  )
}
