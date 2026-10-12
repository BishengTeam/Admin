import { useEffect, useMemo, useState } from 'react'
import {
  Button, Card, Col, DatePicker, Divider, Form, Input, InputNumber, Modal,
  Popconfirm, Row, Select, Space, Table, Tabs, Tag, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { pointsMallService } from '@/services/pointsMall'
import type { PointsMallItem, VirtualOrder, VirtualProduct } from '@/services/pointsMall'
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
  const [virtualModalOpen, setVirtualModalOpen] = useState(false)
  const [editingVirtualProduct, setEditingVirtualProduct] = useState<VirtualProduct | null>(null)
  const [virtualForm] = Form.useForm()
  const [refundOrder, setRefundOrder] = useState<VirtualOrder | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundCode, setRefundCode] = useState('admin_refund')
  const [refundSubmitting, setRefundSubmitting] = useState(false)
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const { data, loading, pagination, refresh } = usePagination(
    (page) => pointsMallService.list(page),
    [],
  )
  const virtualProductPagination = usePagination(
    (page) => pointsMallService.listVirtualProducts(page),
    [],
  )
  const virtualOrderPagination = usePagination(
    (page) => pointsMallService.listVirtualOrders(page),
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

  const virtualType = Form.useWatch('product_type', virtualForm)
  const virtualContentOptions = useMemo(() => {
    if (virtualType === 'course') {
      return courses.map(course => ({ value: course.id, label: course.title }))
    }
    return quizLibraries.map(library => ({
      value: library.id,
      label: `${library.name}（${library.library_code}）`,
    }))
  }, [courses, quizLibraries, virtualType])

  const openVirtualCreate = () => {
    setEditingVirtualProduct(null)
    virtualForm.resetFields()
    virtualForm.setFieldsValue({
      product_type: 'course',
      status: 'draft',
    })
    setVirtualModalOpen(true)
  }

  const openVirtualEdit = (product: VirtualProduct) => {
    setEditingVirtualProduct(product)
    virtualForm.resetFields()
    virtualForm.setFieldsValue({
      product_type: product.product_type,
      content_id: product.course_id ?? product.library_id,
      name: product.name,
      description: product.description,
      points_price: product.points_price,
      stock_limit: product.stock_limit,
      entitlement_days: product.entitlement_days,
      available_from: product.available_from ? dayjs(product.available_from) : undefined,
      available_to: product.available_to ? dayjs(product.available_to) : undefined,
      status: product.status,
    })
    setVirtualModalOpen(true)
  }

  const submitVirtualProduct = async () => {
    let values
    try {
      values = await virtualForm.validateFields()
    } catch {
      return
    }
    const commonPayload = {
      name: values.name,
      description: values.description ?? null,
      points_price: values.points_price,
      stock_limit: values.stock_limit ?? null,
      entitlement_days: values.entitlement_days ?? null,
      available_from: values.available_from?.toISOString?.() ?? null,
      available_to: values.available_to?.toISOString?.() ?? null,
      status: values.status,
    }
    try {
      if (editingVirtualProduct) {
        await pointsMallService.updateVirtualProduct(
          editingVirtualProduct.id,
          commonPayload,
        )
        message.success('虚拟权益商品已更新')
      } else {
        await pointsMallService.createVirtualProduct({
          ...commonPayload,
          product_type: values.product_type,
          course_id: values.product_type === 'course' ? values.content_id : null,
          library_id: values.product_type === 'quiz_library' ? values.content_id : null,
        })
        message.success('虚拟权益商品已创建')
      }
      setVirtualModalOpen(false)
      virtualProductPagination.refresh()
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

  const virtualProductColumns: ColumnsType<VirtualProduct> = [
    { title: '商品名称', dataIndex: 'name', ellipsis: true },
    {
      title: '类型',
      dataIndex: 'product_type',
      width: 90,
      render: (value: VirtualProduct['product_type']) => (
        <Tag color={value === 'course' ? 'blue' : 'purple'}>
          {value === 'course' ? '课程' : '题库'}
        </Tag>
      ),
    },
    { title: '积分', dataIndex: 'points_price', width: 80 },
    {
      title: '库存',
      key: 'stock',
      width: 110,
      render: (_, row) => row.stock_limit === null
        ? '不限量'
        : `${row.total_redeemed}/${row.stock_limit}`,
    },
    {
      title: '权益期限',
      dataIndex: 'entitlement_days',
      width: 110,
      render: (value: number | null) => value ? `${value} 天` : '永久',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: VirtualProduct['status']) => {
        const config = {
          draft: { text: '草稿', color: 'default' },
          published: { text: '已上架', color: 'green' },
          offline: { text: '已停售', color: 'red' },
        }[value]
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    { title: '版本', dataIndex: 'version', width: 70 },
    {
      title: '操作',
      width: 100,
      render: (_, row) => (
        <Button size='small' onClick={() => openVirtualEdit(row)}>编辑</Button>
      ),
    },
  ]

  const virtualOrderColumns: ColumnsType<VirtualOrder> = [
    { title: '订单号', dataIndex: 'order_no', width: 190 },
    { title: '用户', dataIndex: 'user_id', width: 80 },
    { title: '商品', dataIndex: 'product_name', ellipsis: true },
    {
      title: '类型',
      dataIndex: 'product_type',
      width: 80,
      render: (value: VirtualOrder['product_type']) => value === 'course' ? '课程' : '题库',
    },
    { title: '消耗积分', dataIndex: 'points_cost', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: VirtualOrder['status']) => (
        <Tag color={value === 'completed' ? 'green' : 'orange'}>
          {value === 'completed' ? '已完成' : '已退还'}
        </Tag>
      ),
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      width: 165,
      render: (value: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      width: 100,
      render: (_, row) => row.status === 'completed' ? (
        <Button size='small' danger onClick={() => {
          setRefundOrder(row)
          setRefundCode('admin_refund')
          setRefundReason('')
        }}>
          异常退还
        </Button>
      ) : '-',
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

  const submitRefund = async () => {
    if (!refundOrder || !refundCode.trim() || !refundReason.trim()) {
      message.warning('请填写退还原因代码和详细说明')
      return
    }
    setRefundSubmitting(true)
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      await pointsMallService.refundVirtualOrder(refundOrder.id, {
        reason_code: refundCode.trim(),
        reason_detail: refundReason.trim(),
      }, token)
      message.success('兑换订单已退还')
      setRefundOrder(null)
      virtualOrderPagination.refresh()
      virtualProductPagination.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '退还失败')
    } finally {
      setRefundSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <Tabs
          defaultActiveKey='coupons'
          items={[
            {
              key: 'coupons',
              label: '优惠券商品',
              children: (
                <>
                  <Space style={{ marginBottom: 16 }}>
                    <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
                    <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>新建券模板</Button>
                  </Space>
                  <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />
                </>
              ),
            },
            {
              key: 'virtual',
              label: '虚拟权益商品',
              children: (
                <>
                  <Space style={{ marginBottom: 16 }}>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={virtualProductPagination.refresh}
                    >
                      刷新
                    </Button>
                    <Button type='primary' icon={<PlusOutlined />} onClick={openVirtualCreate}>
                      新建虚拟权益商品
                    </Button>
                  </Space>
                  <Table
                    rowKey='id'
                    columns={virtualProductColumns}
                    dataSource={virtualProductPagination.data?.items ?? []}
                    loading={virtualProductPagination.loading}
                    pagination={virtualProductPagination.pagination}
                  />
                </>
              ),
            },
            {
              key: 'orders',
              label: '兑换订单',
              children: (
                <>
                  <Space style={{ marginBottom: 16 }}>
                    <Button icon={<ReloadOutlined />} onClick={virtualOrderPagination.refresh}>刷新</Button>
                  </Space>
                  <Table
                    rowKey='id'
                    columns={virtualOrderColumns}
                    dataSource={virtualOrderPagination.data?.items ?? []}
                    loading={virtualOrderPagination.loading}
                    pagination={virtualOrderPagination.pagination}
                  />
                </>
              ),
            },
          ]}
        />
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
      <Modal
        title={
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              {editingVirtualProduct ? '编辑虚拟权益商品' : '新建虚拟权益商品'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#6b7280', marginTop: 2 }}>
              课程和题库统一使用积分兑换，价格只在商品上维护
            </div>
          </div>
        }
        open={virtualModalOpen}
        onCancel={() => setVirtualModalOpen(false)}
        onOk={submitVirtualProduct}
        width={720}
        destroyOnClose
      >
        <Form form={virtualForm} layout='vertical' style={{ marginTop: 16 }}>
          {sectionTitle('关联内容')}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='product_type' label='权益类型' rules={[{ required: true }]}>
                <Select
                  disabled={Boolean(editingVirtualProduct)}
                  options={[
                    { value: 'course', label: '课程' },
                    { value: 'quiz_library', label: '题库' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name='content_id' label='关联内容' rules={[{ required: true, message: '请选择内容' }]}>
                <Select
                  showSearch
                  optionFilterProp='label'
                  disabled={Boolean(editingVirtualProduct)}
                  options={virtualContentOptions}
                  placeholder='选择课程或题库'
                />
              </Form.Item>
            </Col>
          </Row>

          {sectionTitle('商品信息')}
          <Form.Item name='name' label='商品名称' rules={[{ required: true, message: '必填' }]}>
            <Input maxLength={128} />
          </Form.Item>
          <Form.Item name='description' label='用户可见描述'>
            <Input.TextArea rows={2} maxLength={512} />
          </Form.Item>

          {sectionTitle('兑换规则')}
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name='points_price' label='所需积分' rules={[{ required: true, message: '必填' }]}>
                <InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter='分' />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name='stock_limit' label='库存' extra='清空表示不限量'>
                <InputNumber style={{ width: '100%' }} min={0} precision={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name='entitlement_days' label='权益天数' extra='清空表示永久有效'>
                <InputNumber style={{ width: '100%' }} min={1} precision={0} addonAfter='天' />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name='status' label='状态'>
                <Select
                  options={[
                    { value: 'draft', label: '草稿' },
                    { value: 'published', label: '上架' },
                    { value: 'offline', label: '停售' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='available_from' label='开售时间'>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='available_to' label='结束兑换时间'>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={`异常退还 ${refundOrder?.order_no ?? ''}`}
        open={!!refundOrder}
        confirmLoading={refundSubmitting}
        okText='二次认证并退还'
        okButtonProps={{ danger: true }}
        onCancel={() => setRefundOrder(null)}
        onOk={submitRefund}
      >
        <Space direction='vertical' style={{ width: '100%' }}>
          <Typography.Text type='secondary'>
            将撤销该订单产生的课程或题库权益，并按原实扣积分退回。学习记录不会被删除。
          </Typography.Text>
          <Input
            value={refundCode}
            onChange={(event) => setRefundCode(event.target.value)}
            placeholder="原因代码，如 admin_refund"
            maxLength={64}
          />
          <Input.TextArea
            rows={4}
            value={refundReason}
            onChange={(event) => setRefundReason(event.target.value)}
            placeholder='请填写用户可见的详细退还原因'
            maxLength={500}
            showCount
          />
        </Space>
      </Modal>
      {reauthDialog}
    </>
  )
}
