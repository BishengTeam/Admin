import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { CopyOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { courseManagementService } from '@/services/courseManagement'
import { videoWebService, type VideoWebCodeItem } from '@/services/videoWebService'
import type { CourseItem } from '@/types/course'

const STATUS_META: Record<VideoWebCodeItem['status'], { text: string; color: string }> = {
  issued: { text: '待兑换', color: 'blue' },
  redeemed: { text: '已兑换', color: 'green' },
  revoked: { text: '已撤销', color: 'red' },
  refunded: { text: '已退款回收', color: 'orange' },
}

interface CreateForm {
  course_id: number
  quantity: number
  note?: string
}

function copyCode(code: string) {
  void navigator.clipboard?.writeText(code)
    .then(() => message.success('兑换码已复制'))
    .catch(() => message.error('复制失败，请手动复制'))
}

export default function VideoWebCodesPage() {
  const canWrite = usePermission('course:write')
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [filters, setFilters] = useState<{ course_id?: number; status?: VideoWebCodeItem['status'] }>({})
  const [searchForm] = Form.useForm()
  const [createOpen, setCreateOpen] = useState(false)
  const [createdCodes, setCreatedCodes] = useState<VideoWebCodeItem[]>([])
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<CreateForm>()

  const loadCourses = useCallback(async () => {
    const data = await courseManagementService.listCourses({ page: 1, page_size: 100, status: 'published' })
    setCourses(data.items)
  }, [])

  useEffect(() => { void loadCourses() }, [loadCourses])

  const { data, loading, pagination, refresh } = usePagination(
    (page, signal) => videoWebService.listCodes({ ...filters, ...page }, signal),
    [JSON.stringify(filters)],
  )

  const courseMap = useMemo(() => new Map(courses.map(item => [item.id, item.title])), [courses])
  const courseOptions = useMemo(
    () => courses.map(item => ({ value: item.id, label: item.title })),
    [courses],
  )

  const submitCreate = async () => {
    const values = await form.validateFields()
    setCreating(true)
    try {
      const codes = await videoWebService.createCodes(values)
      setCreatedCodes(codes)
      setCreateOpen(false)
      form.resetFields()
      message.success(`已生成 ${codes.length} 个兑换码`)
      refresh()
    } finally {
      setCreating(false)
    }
  }

  const columns: ColumnsType<VideoWebCodeItem> = useMemo(() => [
    { title: 'ID', dataIndex: 'id', width: 80 },
    {
      title: '兑换码',
      dataIndex: 'code',
      width: 260,
      render: value => (
        <Space>
          <Typography.Text copyable={{ text: value }}>{value}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '课程',
      dataIndex: 'course_id',
      ellipsis: true,
      render: value => courseMap.get(value) || `课程 #${value}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: VideoWebCodeItem['status']) => (
        <Tag color={STATUS_META[value]?.color}>{STATUS_META[value]?.text ?? value}</Tag>
      ),
    },
    { title: '订单', dataIndex: 'source_order_id', width: 90, render: value => value ?? '-' },
    { title: '兑换用户', dataIndex: 'redeemed_by', width: 100, render: value => value ?? '-' },
    { title: '生成时间', dataIndex: 'created_at', width: 180 },
    {
      title: '操作',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => copyCode(record.code)}>复制</Button>
          {canWrite && record.status === 'issued' && (
            <ConfirmButton
              title="撤销兑换码"
              description="撤销后该码不可再兑换，已兑换授权将同步回收。"
              danger
              type="link"
              size="small"
              onConfirm={async () => {
                await videoWebService.revokeCode(record.id, 'admin manual revoke')
                message.success('兑换码已撤销')
                refresh()
              }}
            >
              撤销
            </ConfirmButton>
          )}
          {canWrite && record.status !== 'refunded' && record.status !== 'revoked' && (
            <ConfirmButton
              title="退款回收"
              description="仅退款场景使用，回收后用户将失去课程观看授权。"
              danger
              type="link"
              size="small"
              onConfirm={async () => {
                await videoWebService.refundCode(record.id, 'order refunded')
                message.success('兑换码已退款回收')
                refresh()
              }}
            >
              退款回收
            </ConfirmButton>
          )}
        </Space>
      ),
    },
  ], [canWrite, courseMap, refresh])

  return (
    <PageContainer
      title="课程兑换码"
      extra={canWrite ? (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>生成兑换码</Button>
      ) : undefined}
    >
      {createdCodes.length > 0 && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="兑换码生成成功"
          description={(
            <Space direction="vertical" size={4}>
              {createdCodes.map(item => (
                <Typography.Text key={item.id} copyable={{ text: item.code }}>{item.code}</Typography.Text>
              ))}
            </Space>
          )}
          closable
          onClose={() => setCreatedCodes([])}
        />
      )}

      <Form
        form={searchForm}
        layout="inline"
        onFinish={values => setFilters({ course_id: values.course_id, status: values.status })}
        style={{ marginBottom: 16, rowGap: 12 }}
      >
        <Form.Item name="course_id">
          <Select allowClear showSearch optionFilterProp="label" placeholder="课程" options={courseOptions} style={{ width: 280 }} />
        </Form.Item>
        <Form.Item name="status">
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 130 }}
            options={Object.entries(STATUS_META).map(([value, item]) => ({ value, label: item.text }))}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
            <Button onClick={() => { searchForm.resetFields(); setFilters({}) }}>重置</Button>
            <Button icon={<ReloadOutlined />} onClick={() => refresh()}>刷新</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={pagination}
        scroll={{ x: 1160 }}
      />

      <Modal
        title="生成课程兑换码"
        open={createOpen}
        confirmLoading={creating}
        onOk={submitCreate}
        onCancel={() => setCreateOpen(false)}
        okText="生成"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ quantity: 1 }}>
          <Form.Item name="course_id" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
            <Select allowClear showSearch optionFilterProp="label" options={courseOptions} placeholder="请选择已发布课程" />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} max={500} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} maxLength={512} showCount placeholder="线下发放、渠道合作等备注" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
