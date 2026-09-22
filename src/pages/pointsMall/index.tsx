import { useState } from 'react'
import {
  Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal,
  Popconfirm, Row, Select, Space, Switch, Table, Tag, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { pointsMallService } from '@/services/pointsMall'
import type { PointsMallItem } from '@/services/pointsMall'
import { formatPrice } from '@/utils/format'
import dayjs from 'dayjs'

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  fixed: '固定金额',
  percent: '百分比折扣',
}

const SCOPE_LABELS: Record<string, string> = {
  global: '全部商品',
  category: '指定分类',
  product: '指定产品',
}

const CATEGORY_OPTIONS = [
  { value: 'certification', label: '认证报名' },
  { value: 'course', label: '课程' },
  { value: 'quiz', label: '题库' },
]

function discountLabel(type: string, value: number): string {
  if (type === 'percent') return `${value / 10}折`
  return formatPrice(value)
}

export default function PointsMallPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PointsMallItem | null>(null)
  const [form] = Form.useForm()
  const { data, loading, pagination, refresh } = usePagination(
    (page) => pointsMallService.list(page),
    [],
  )

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      discount_type: 'fixed',
      scope_type: 'global',
      validity_type: 'days',
      validity_days: 30,
      total_stock: 0,
      per_user_limit: 1,
      min_order_amount_cents: 0,
      sort_order: 0,
    })
    setModalOpen(true)
  }

  const openEdit = (item: PointsMallItem) => {
    setEditing(item)
    form.setFieldsValue({
      ...item,
      valid_until: item.valid_until ? dayjs(item.valid_until) : undefined,
    })
    setModalOpen(true)
  }

  const submit = async () => {
    let values
    try {
      values = await form.validateFields()
    } catch { return }
    const payload = {
      ...values,
      valid_until: values.valid_until?.toISOString?.() ?? values.valid_until ?? null,
      min_order_amount_cents: Math.round((values.min_order_amount_cents ?? 0) * 100),
    }
    try {
      if (editing) {
        await pointsMallService.update(editing.id, payload)
        message.success('更新成功')
      } else {
        await pointsMallService.create(payload)
        message.success('创建成功')
      }
      setModalOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const columns: ColumnsType<PointsMallItem> = [
    { title: '名称', dataIndex: 'name', ellipsis: true },
    {
      title: '折扣',
      width: 100,
      render: (_, row) => (
        <Tag color={row.discount_type === 'percent' ? 'blue' : 'green'}>
          {discountLabel(row.discount_type, row.discount_value)}
        </Tag>
      ),
    },
    {
      title: '适用范围',
      width: 120,
      render: (_, row) => {
        const label = row.scope_type === 'global'
          ? '全部'
          : row.scope_type === 'category'
            ? CATEGORY_OPTIONS.find(c => c.value === row.scope_value)?.label ?? row.scope_value
            : row.scope_value
        return <Typography.Text ellipsis={{ tooltip: label }}>{label}</Typography.Text>
      },
    },
    { title: '所需积分', dataIndex: 'points_cost', width: 90, sorter: true },
    {
      title: '库存',
      width: 100,
      render: (_, row) => {
        if (row.total_stock === 0) return '不限'
        return `${row.total_redeemed}/${row.total_stock}`
      },
    },
    { title: '每人限兑', dataIndex: 'per_user_limit', width: 90, render: (v: number) => v === 0 ? '不限' : `${v}次` },
    {
      title: '有效期',
      width: 140,
      render: (_, row) => {
        if (row.validity_type === 'days') return `${row.validity_days}天`
        return row.valid_until ? dayjs(row.valid_until).format('YYYY-MM-DD') : '-'
      },
    },
    {
      title: '状态',
      width: 70,
      render: (_, row) => <Tag color={row.is_active ? 'green' : 'default'}>{row.is_active ? '上架' : '下架'}</Tag>,
    },
    {
      title: '操作',
      width: 140,
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' onClick={() => openEdit(row)}>编辑</Button>
          {row.is_active ? (
            <Popconfirm title="确定下架？" onConfirm={async () => { await pointsMallService.deactivate(row.id); message.success('已下架'); refresh() }}>
              <Button size='small' danger>下架</Button>
            </Popconfirm>
          ) : (
            <Button size='small' onClick={async () => { await pointsMallService.update(row.id, { is_active: true }); message.success('已上架'); refresh() }}>上架</Button>
          )}
        </Space>
      ),
    },
  ]

  const discountType = Form.useWatch('discount_type', form)
  const scopeType = Form.useWatch('scope_type', form)
  const validityType = Form.useWatch('validity_type', form)

  return (
    <>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
          <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>新建券模板</Button>
        </Space>
        <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />
      </Card>

      <Modal
        title={editing ? '编辑券模板' : '新建券模板'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        width={680}
        destroyOnClose
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='name' label='名称' rules={[{ required: true, message: '必填' }]}>
            <Input placeholder='如：认证报名 ¥50 减免券' maxLength={128} />
          </Form.Item>
          <Form.Item name='description' label='描述'>
            <Input.TextArea rows={2} maxLength={256} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='discount_type' label='折扣类型' rules={[{ required: true }]}>
                <Select options={Object.entries(DISCOUNT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name='discount_value'
                label={discountType === 'percent' ? '折扣（如90=9折）' : '金额（元）'}
                rules={[{ required: true, message: '必填' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} precision={discountType === 'percent' ? 0 : 2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='min_order_amount_cents' label='最低订单金额（元）'>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='scope_type' label='适用范围' rules={[{ required: true }]}>
                <Select options={Object.entries(SCOPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              {scopeType === 'category' && (
                <Form.Item name='scope_value' label='分类' rules={[{ required: true, message: '选择分类' }]}>
                  <Select options={CATEGORY_OPTIONS} />
                </Form.Item>
              )}
              {scopeType === 'product' && (
                <Form.Item name='scope_value' label='产品编码' rules={[{ required: true, message: '输入产品编码' }]}>
                  <Input placeholder='如 H3CNE-RS+' />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='points_cost' label='所需积分' rules={[{ required: true, message: '必填' }]}>
                <InputNumber style={{ width: '100%' }} min={1} precision={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='total_stock' label='总量（0=不限）'>
                <InputNumber style={{ width: '100%' }} min={0} precision={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='per_user_limit' label='每人限兑（0=不限）'>
                <InputNumber style={{ width: '100%' }} min={0} precision={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='validity_type' label='有效期类型'>
                <Select options={[{ value: 'days', label: '兑换后N天' }, { value: 'fixed_date', label: '固定截止日期' }]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              {validityType === 'days' && (
                <Form.Item name='validity_days' label='有效天数' rules={[{ required: true, message: '必填' }]}>
                  <InputNumber style={{ width: '100%' }} min={1} precision={0} />
                </Form.Item>
              )}
              {validityType === 'fixed_date' && (
                <Form.Item name='valid_until' label='截止日期' rules={[{ required: true, message: '必填' }]}>
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
              )}
            </Col>
            <Col span={8}>
              <Form.Item name='sort_order' label='排序'>
                <InputNumber style={{ width: '100%' }} min={0} precision={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}
