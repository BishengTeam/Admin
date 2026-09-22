import { useEffect, useMemo, useState } from 'react'
import {
  Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Modal,
  Popconfirm, Row, Select, Space, Table, Tag, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { pointsMallService } from '@/services/pointsMall'
import type { PointsMallItem } from '@/services/pointsMall'
import { certProductService } from '@/services/certProduct'
import { courseManagementService } from '@/services/courseManagement'
import { quizService } from '@/services/quiz'
import type { CertProduct } from '@/types/certProduct'
import type { CourseItem } from '@/types/course'
import type { QuizLibrary } from '@/types/quiz'
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

interface ProductOption {
  value: string
  label: string
  group: string
}

function discountLabel(type: string, value: number): string {
  if (type === 'percent') return `${value / 10}折`
  return formatPrice(value)
}

export default function PointsMallPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PointsMallItem | null>(null)
  const [form] = Form.useForm()
  const [certProducts, setCertProducts] = useState<CertProduct[]>([])
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [quizLibraries, setQuizLibraries] = useState<QuizLibrary[]>([])
  const { data, loading, pagination, refresh } = usePagination(
    (page) => pointsMallService.list(page),
    [],
  )

  useEffect(() => {
    certProductService.list({ page: 1, page_size: 200 }).then(p => setCertProducts(p.items)).catch(() => setCertProducts([]))
    courseManagementService.listCourses({ page: 1, page_size: 200 } as never).then(p => setCourses(p.items)).catch(() => setCourses([]))
    quizService.listLibraries({ page: 1, page_size: 200 } as never).then(setQuizLibraries).catch(() => setQuizLibraries([]))
  }, [])

  const productOptions: ProductOption[] = useMemo(() => [
    ...certProducts.filter(p => p.is_active).map(p => ({
      value: p.code,
      label: `${p.chinese_name || p.name}（${p.code}）`,
      group: '认证产品',
    })),
    ...courses.map(c => ({
      value: c.title,
      label: `${c.title}`,
      group: '课程',
    })),
    ...quizLibraries.map(q => ({
      value: q.library_code,
      label: `${q.name}（${q.library_code}）`,
      group: '题库',
    })),
  ], [certProducts, courses, quizLibraries])

  const productGroupOptions = useMemo(() => {
    const groups = new Map<string, ProductOption[]>()
    for (const opt of productOptions) {
      if (!groups.has(opt.group)) groups.set(opt.group, [])
      groups.get(opt.group)!.push(opt)
    }
    return Array.from(groups.entries()).map(([label, options]) => ({ label, options }))
  }, [productOptions])

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
    { title: '所需积分', dataIndex: 'points_cost', width: 90 },
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

  const sectionTitle = (text: string) => (
    <Divider orientation='left' orientationMargin={0} style={{ margin: '8px 0 16px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
      {text}
    </Divider>
  )

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
        title={
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{editing ? '编辑券模板' : '新建券模板'}</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginTop: 2 }}>
              配置优惠券的折扣力度、适用范围和兑换规则
            </div>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout='vertical' style={{ marginTop: 16 }}>

          {sectionTitle('基本信息')}
          <Form.Item name='name' label='券名称' rules={[{ required: true, message: '必填' }]} style={{ marginBottom: 12 }}>
            <Input placeholder='如：认证报名 ¥50 减免券' maxLength={128} />
          </Form.Item>
          <Form.Item name='description' label='描述（用户可见）' style={{ marginBottom: 12 }}>
            <Input.TextArea rows={2} maxLength={256} placeholder='选填，展示在积分商城卡片上' />
          </Form.Item>

          {sectionTitle('折扣力度')}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='discount_type' label='折扣类型' rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                <Select
                  options={Object.entries(DISCOUNT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name='discount_value'
                label={discountType === 'percent' ? '折扣比例' : '减免金额'}
                rules={[{ required: true, message: '必填' }]}
                style={{ marginBottom: 12 }}
                extra={discountType === 'percent' ? '如输入 90 表示支付原价的 90%，即 9 折' : undefined}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={discountType === 'percent' ? 99 : undefined}
                  precision={discountType === 'percent' ? 0 : 2}
                  addonAfter={discountType === 'percent' ? '%' : '元'}
                  placeholder={discountType === 'percent' ? '90' : '50'}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name='min_order_amount_cents'
                label='最低订单金额'
                style={{ marginBottom: 12 }}
                extra='0 表示无门槛'
              >
                <InputNumber style={{ width: '100%' }} min={0} precision={2} addonAfter='元' placeholder='0' />
              </Form.Item>
            </Col>
          </Row>

          {sectionTitle('适用范围')}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='scope_type' label='范围类型' rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                <Select
                  options={Object.entries(SCOPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                  placeholder='选择适用范围'
                />
              </Form.Item>
            </Col>
            {scopeType === 'category' && (
              <Col span={8}>
                <Form.Item name='scope_value' label='商品分类' rules={[{ required: true, message: '请选择分类' }]} style={{ marginBottom: 12 }}>
                  <Select options={CATEGORY_OPTIONS} placeholder='选择分类' />
                </Form.Item>
              </Col>
            )}
            {scopeType === 'product' && (
              <Col span={16}>
                <Form.Item
                  name='scope_value'
                  label='选择产品'
                  rules={[{ required: true, message: '请选择产品' }]}
                  style={{ marginBottom: 12 }}
                  extra='搜索产品名称即可，无需手写编码'
                >
                  <Select
                    showSearch
                    optionFilterProp='label'
                    placeholder='搜索并选择产品'
                    options={productGroupOptions}
                    notFoundContent={productOptions.length === 0 ? '加载中...' : '未找到匹配产品'}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          {sectionTitle('兑换规则')}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name='points_cost'
                label='所需积分'
                rules={[{ required: true, message: '必填' }]}
                style={{ marginBottom: 12 }}
                extra='用户兑换此券需消耗的积分数'
              >
                <InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter='分' placeholder='100' />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='total_stock' label='总兑换量' style={{ marginBottom: 12 }} extra='0 表示不限量'>
                <InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder='0' />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='per_user_limit' label='每人限兑' style={{ marginBottom: 12 }} extra='0 表示不限制'>
                <InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder='1' />
              </Form.Item>
            </Col>
          </Row>

          {sectionTitle('有效期')}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='validity_type' label='有效期方式' style={{ marginBottom: 12 }}>
                <Select
                  options={[
                    { value: 'days', label: '兑换后 N 天过期' },
                    { value: 'fixed_date', label: '固定截止日期' },
                  ]}
                />
              </Form.Item>
            </Col>
            {validityType === 'days' && (
              <Col span={8}>
                <Form.Item name='validity_days' label='有效天数' rules={[{ required: true, message: '必填' }]} style={{ marginBottom: 12 }}>
                  <InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter='天' placeholder='30' />
                </Form.Item>
              </Col>
            )}
            {validityType === 'fixed_date' && (
              <Col span={8}>
                <Form.Item name='valid_until' label='截止时间' rules={[{ required: true, message: '必填' }]} style={{ marginBottom: 12 }}>
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            )}
          </Row>

        </Form>
      </Modal>
    </>
  )
}
