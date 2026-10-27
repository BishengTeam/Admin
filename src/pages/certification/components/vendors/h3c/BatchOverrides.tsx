import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { ConsultationGroupDialog } from '@/components/ConsultationGroupDialog'
import { h3cService } from '@/services/h3c'
import { certProductService } from '@/services/certProduct'
import { formatDate, formatPrice } from '@/utils/format'
import type { CertProduct } from '@/types/certProduct'
import type { CertType } from '../type-registry'
import type {
  H3cExamBatch,
  H3cRegistrationType,
} from '@/types/h3c'

function centsToYuan(cents?: number | null): number | undefined {
  return cents != null ? Math.round(cents) / 100 : undefined
}

function yuanToCents(yuan?: number | null): number | undefined {
  return yuan != null ? Math.round(yuan * 100) : undefined
}

function formatDateOrNull(value?: string | null): string {
  return value ? formatDate(value) : '-'
}

const TYPE_LABELS: Record<H3cRegistrationType, string> = {
  coupon: '考券报名',
  student: '学生报名',
  full: '全额报名',
}

const REGISTRATION_REQUIREMENTS: Record<H3cRegistrationType, string> = {
  coupon: '考生需填写有效考券编号，并上传考券证明材料。',
  student: '考生选择核验方式：有学信网在线验证码时，填写验证码并上传身份证人像面；无验证码时，上传学院盖章的学籍证图片。',
  full: '考生仅填写基础报名信息，无需考券或学生证明材料。',
}

const BATCH_STATUS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  registration_closed: { text: '报名关闭', color: 'orange' },
  finalized: { text: '已结束', color: 'blue' },
  archived: { text: '已归档', color: 'default' },
  cancelled: { text: '已取消', color: 'red' },
}

const STATUS_OPTIONS = Object.entries(BATCH_STATUS).map(([value, item]) => ({
  value,
  label: item.text,
}))

interface BatchListContext {
  keyword?: string
  status?: string
  page?: number
  scrollY?: number
}

const BATCH_LIST_CONTEXT_KEY = 'h3c.batch-list.context'

function readBatchListContext(): BatchListContext {
  try {
    const raw = window.sessionStorage.getItem(BATCH_LIST_CONTEXT_KEY)
    return raw ? JSON.parse(raw) as BatchListContext : {}
  } catch {
    return {}
  }
}

function extractIdentityTag(product: CertProduct): string {
  const paren = product.chinese_name.match(/[（(]([^）)]+)[）)]/)?.[1]
  if (paren && /^[A-Za-z0-9+-]/.test(paren)) return paren
  const leading = product.chinese_name.match(/^([A-Za-z][A-Za-z0-9+.-]*)/)?.[1]
  return leading ?? product.name
}

function suggestedBatchName(product: CertProduct | undefined): string {
  const productName = product?.chinese_name || product?.code || 'H3C'
  return `${productName} · ${dayjs().format('YYYY年M月')}考试批次`
}

export default function BatchOverrides(_props: { type: CertType; productCode: string | null }) {
  const navigate = useNavigate()
  const [batchOpen, setBatchOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<H3cExamBatch | null>(null)
  const [savingAction, setSavingAction] = useState<'draft' | 'publish' | 'edit' | null>(null)
  const [consultationBatch, setConsultationBatch] = useState<H3cExamBatch | null>(null)
  const [products, setProducts] = useState<CertProduct[]>([])
  const returnContext = useMemo(readBatchListContext, [])
  const [keyword, setKeyword] = useState<string | undefined>(returnContext.keyword)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(returnContext.status)
  const [form] = Form.useForm()

  const watchProductCode = Form.useWatch('certification_code', form)
  const watchName = Form.useWatch('name', form)
  const watchApplyStart = Form.useWatch('apply_start', form)
  const watchApplyEnd = Form.useWatch('apply_end', form)
  const watchExamDate = Form.useWatch('exam_date', form)
  const watchExamLocation = Form.useWatch('exam_location', form)
  const watchCapacity = Form.useWatch('capacity', form)
  const watchCouponPrice = Form.useWatch('coupon_price_cents', form)
  const watchStudentPrice = Form.useWatch('student_price_cents', form)
  const watchFullPrice = Form.useWatch('full_price_cents', form)

  const selectedProduct = products.find((item) => item.code === watchProductCode)

  useEffect(() => {
    certProductService
      .list({ type: 'h3c', page: 1, page_size: 100 })
      .then((page) => setProducts(page.items.filter((item) => item.is_active)))
      .catch(() => setProducts([]))
  }, [])

  const { data, loading, pagination, refresh } = usePagination(
    (page) => h3cService.listBatches({
      ...page,
      ...(keyword ? { keyword } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [keyword, statusFilter],
    { initialPage: returnContext.page },
  )
  const { ensureReauthenticated, reauthDialog } = useReauthentication()

  useEffect(() => {
    window.sessionStorage.removeItem(BATCH_LIST_CONTEXT_KEY)
    if (typeof returnContext.scrollY === 'number') {
      const timer = window.setTimeout(() => window.scrollTo({ top: returnContext.scrollY }), 120)
      return () => window.clearTimeout(timer)
    }
  }, [returnContext])

  const openWorkbench = (
    row: H3cExamBatch,
    status?: 'pending_review' | 'rejected_awaiting_resubmission' | 'approved',
  ) => {
    window.sessionStorage.setItem(BATCH_LIST_CONTEXT_KEY, JSON.stringify({
      keyword,
      status: statusFilter,
      page: pagination.current,
      scrollY: window.scrollY,
    }))
    navigate(`/admin/certification/h3c/batches/${row.id}${status ? `?status=${status}` : ''}`, {
      state: { breadcrumbTitle: row.name },
    })
  }

  const validateSchedule = (
    applyStart?: dayjs.Dayjs,
    applyEnd?: dayjs.Dayjs,
    examDate?: dayjs.Dayjs,
  ): string | null => {
    if (applyStart && applyEnd && applyStart.isAfter(applyEnd)) {
      return '报名开始时间必须早于截止时间'
    }
    if (examDate && applyEnd && examDate.isBefore(applyEnd)) {
      return '考试时间不能早于报名截止时间'
    }
    return null
  }

  const buildPayload = (values: Record<string, unknown>) => ({
    name: String(values.name ?? '').trim(),
    apply_start: (values.apply_start as dayjs.Dayjs | undefined)?.toISOString(),
    apply_end: (values.apply_end as dayjs.Dayjs | undefined)?.toISOString(),
    exam_date: (values.exam_date as dayjs.Dayjs | undefined)?.toISOString(),
    exam_location: values.exam_location ? String(values.exam_location).trim() : undefined,
    capacity: Number(values.capacity),
    exam_code: String(values.exam_code ?? selectedProduct?.code ?? ''),
    identity_tag: String(
      values.identity_tag
      ?? (selectedProduct ? extractIdentityTag(selectedProduct) : ''),
    ),
    coupon_price_cents: yuanToCents(values.coupon_price_cents as number | undefined),
    student_price_cents: yuanToCents(values.student_price_cents as number | undefined),
    full_price_cents: yuanToCents(values.full_price_cents as number | undefined),
    payment_timeout_minutes: values.payment_timeout_minutes == null
      ? undefined
      : Number(values.payment_timeout_minutes),
    resubmission_window_hours: values.resubmission_window_hours == null
      ? undefined
      : Number(values.resubmission_window_hours),
    max_resubmissions: values.max_resubmissions == null
      ? undefined
      : Number(values.max_resubmissions),
    max_material_bytes: Math.round(
      Number(values.max_material_bytes_mb ?? editingBatch?.max_material_bytes ?? 10) * 1048576,
    ),
  })

  const submitBatch = async (action: 'draft' | 'publish' | 'edit') => {
    let values: Record<string, unknown>
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    const scheduleError = validateSchedule(
      values.apply_start as dayjs.Dayjs | undefined,
      values.apply_end as dayjs.Dayjs | undefined,
      values.exam_date as dayjs.Dayjs | undefined,
    )
    if (scheduleError) {
      message.warning(scheduleError)
      return
    }

    setSavingAction(action)
    try {
      if (editingBatch) {
        await h3cService.updateBatch(editingBatch.id, buildPayload(values))
        message.success('H3C 考试批次已更新')
        setBatchOpen(false)
        refresh()
        return
      }

      const created = await h3cService.createBatch({
        ...buildPayload(values),
        certification_code: String(values.certification_code ?? ''),
      })
      if (action === 'publish') {
        try {
          await h3cService.publishBatch(created.id)
          message.success('H3C 考试批次已创建并发布')
        } catch (error) {
          message.warning(
            `草稿已保存，发布失败：${error instanceof Error ? error.message : '请检查批次配置'}`,
          )
        }
      } else {
        message.success('H3C 考试批次草稿已保存')
      }
      setBatchOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setSavingAction(null)
    }
  }

  const handleProductSelect = (code: string) => {
    const product = products.find((item) => item.code === code)
    if (!product) return
    form.setFieldsValue({
      exam_code: product.code,
      identity_tag: extractIdentityTag(product),
    })
    if (!watchName || Object.values(products).some(
      (item) => watchName === suggestedBatchName(item),
    )) {
      form.setFieldsValue({ name: suggestedBatchName(product) })
    }
  }

  const handleCreate = () => {
    setEditingBatch(null)
    form.resetFields()
    form.setFieldsValue({
      payment_timeout_minutes: 30,
      resubmission_window_hours: 72,
      max_resubmissions: 2,
      max_material_bytes_mb: 10,
    })
    setBatchOpen(true)
  }

  const handleEdit = (batch: H3cExamBatch) => {
    setEditingBatch(batch)
    form.resetFields()
    form.setFieldsValue({
      certification_code: batch.certification_code,
      name: batch.name,
      capacity: batch.capacity,
      exam_location: batch.exam_location,
      exam_code: batch.exam_code,
      identity_tag: batch.identity_tag,
      apply_start: batch.apply_start ? dayjs(batch.apply_start) : undefined,
      apply_end: batch.apply_end ? dayjs(batch.apply_end) : undefined,
      exam_date: batch.exam_date ? dayjs(batch.exam_date) : undefined,
      coupon_price_cents: centsToYuan(
        batch.prices.find((price) => price.registration_type === 'coupon')?.price_cents,
      ),
      student_price_cents: centsToYuan(
        batch.prices.find((price) => price.registration_type === 'student')?.price_cents,
      ),
      full_price_cents: centsToYuan(
        batch.prices.find((price) => price.registration_type === 'full')?.price_cents,
      ),
      payment_timeout_minutes: batch.payment_timeout_minutes,
      resubmission_window_hours: batch.resubmission_window_hours,
      max_resubmissions: batch.max_resubmissions,
      max_material_bytes_mb: batch.max_material_bytes / 1048576,
    })
    setBatchOpen(true)
  }

  const runBatchAction = async (
    action: () => Promise<unknown>,
    successText: string,
    errorText: string,
  ) => {
    try {
      await action()
      message.success(successText)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : errorText)
    }
  }

  const cancel = async (id: number) => {
    const token = await ensureReauthenticated()
    if (!token) throw new Error('请重新验证管理员密码')
    await h3cService.cancelBatch(id, token)
    message.success('批次已取消')
    refresh()
  }

  const confirmAction = (
    title: string,
    content: string,
    onOk: () => Promise<void>,
  ) => {
    Modal.confirm({
      title,
      content,
      okText: title,
      cancelText: '再想想',
      onOk: async () => {
        try {
          await onOk()
        } catch (error) {
          message.error(error instanceof Error ? error.message : '操作失败')
        }
      },
    })
  }

  const columns: ColumnsType<H3cExamBatch> = [
    {
      title: '批次名称',
      dataIndex: 'name',
      width: 220,
      ellipsis: true,
      render: (value: string, row) => (
        <Button type='link' size='small' onClick={() => openWorkbench(row)}>
          {value}
        </Button>
      ),
    },
    {
      title: '认证产品',
      width: 170,
      ellipsis: true,
      render: (_, row) => {
        const label = products.find((item) => item.code === row.certification_code)
          ?.chinese_name ?? row.certification_code
        return (
          <Typography.Text ellipsis={{ tooltip: label }} style={{ maxWidth: 150 }}>
            {label}
          </Typography.Text>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => {
        const item = BATCH_STATUS[value] ?? { text: value, color: 'default' }
        return <Tag color={item.color}>{item.text}</Tag>
      },
    },
    {
      title: '报名时间',
      width: 210,
      render: (_, row) => `${formatDateOrNull(row.apply_start)} ~ ${formatDateOrNull(row.apply_end)}`,
    },
    {
      title: '考试时间',
      dataIndex: 'exam_date',
      width: 120,
      render: (value: string | null) => formatDateOrNull(value),
    },
    {
      title: '名额',
      width: 90,
      render: (_, row) => `${row.occupied_count}/${row.capacity}`,
    },
    {
      title: '报名费用',
      dataIndex: 'prices',
      width: 170,
      render: (prices: H3cExamBatch['prices']) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: '20px' }}>
          {prices.map((price) => (
            <div
              key={price.registration_type}
              style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}
            >
              <span style={{ color: '#666' }}>{TYPE_LABELS[price.registration_type]}</span>
              <span style={{ fontWeight: 500 }}>{formatPrice(price.price_cents)}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: '报名办理',
      key: 'registration-counts',
      width: 175,
      render: (_, row) => (
        <Space size={4} wrap>
          {([
            ['pending_review', '待初审'],
            ['rejected_awaiting_resubmission', '待补正'],
            ['approved', '初审通过'],
          ] as const).map(([status, label]) => (
            <Button
              key={status}
              size='small'
              type='link'
              style={{ padding: 0, height: 22 }}
              onClick={() => openWorkbench(row, status)}
            >
              {label} {row.registration_counts?.[status] ?? 0}
            </Button>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      width: 190,
      fixed: 'right',
      render: (_, row) => {
        const menuItems = [
          !['cancelled', 'archived'].includes(row.status) && {
            key: 'consultation',
            label: '咨询群配置',
          },
          row.status === 'draft' && { key: 'edit', label: '编辑批次' },
          row.status === 'draft' && { key: 'publish', label: '发布批次' },
          row.status === 'published' && { key: 'close', label: '关闭报名' },
          ['published', 'registration_closed'].includes(row.status) && {
            key: 'finalize',
            label: '结束批次',
          },
          ['published', 'registration_closed'].includes(row.status) && {
            key: 'cancel',
            danger: true,
            label: '取消批次',
          },
          ['finalized', 'cancelled'].includes(row.status) && {
            key: 'archive',
            label: '归档批次',
          },
        ].filter(Boolean) as Array<{ key: string; label: string; danger?: boolean }>

        return (
          <Space size={4}>
            <Button size='small' type='primary' ghost onClick={() => openWorkbench(row)}>
              管理报名
            </Button>
            <Dropdown
              trigger={['click']}
              menu={{
                items: menuItems,
                onClick: ({ key }) => {
                  if (key === 'consultation') setConsultationBatch(row)
                  if (key === 'edit') handleEdit(row)
                  if (key === 'publish') {
                    void runBatchAction(
                      () => h3cService.publishBatch(row.id),
                      '批次已发布',
                      '发布失败',
                    )
                  }
                  if (key === 'close') {
                    void runBatchAction(
                      () => h3cService.closeBatchRegistration(row.id),
                      '报名已关闭',
                      '关闭报名失败',
                    )
                  }
                  if (key === 'finalize') {
                    confirmAction('结束批次', '结束后批次不再继续办理报名。', async () => {
                      await h3cService.finalizeBatch(row.id)
                      message.success('批次已结束')
                      refresh()
                    })
                  }
                  if (key === 'cancel') {
                    confirmAction(
                      '取消批次',
                      '确认取消该 H3C 考试批次？',
                      async () => { await cancel(row.id) },
                    )
                  }
                  if (key === 'archive') {
                    confirmAction(
                      '归档批次',
                      '归档后用户端不再显示该批次。',
                      async () => {
                        await h3cService.archiveBatch(row.id)
                        message.success('批次已归档')
                        refresh()
                      },
                    )
                  }
                },
              }}
            >
              <Button size='small'>
                更多 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          allowClear
          placeholder='搜索批次名称'
          style={{ width: 220 }}
          defaultValue={keyword}
          onSearch={setKeyword}
        />
        <Select
          allowClear
          placeholder='状态'
          style={{ width: 130 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
        />
        <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
        <Button type='primary' icon={<PlusOutlined />} onClick={handleCreate}>新建批次</Button>
      </Space>

      <Table
        rowKey='id'
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1370 }}
      />
      {reauthDialog}

      <Drawer
        title={editingBatch ? `编辑 H3C 批次 · ${editingBatch.name}` : '新建 H3C 考试批次'}
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        width='min(860px, 94vw)'
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setBatchOpen(false)}>取消</Button>
            {!editingBatch && (
              <Button
                loading={savingAction === 'draft'}
                onClick={() => void submitBatch('draft')}
              >
                保存草稿
              </Button>
            )}
            <Button
              type='primary'
              loading={savingAction === 'publish' || savingAction === 'edit'}
              onClick={() => void submitBatch(editingBatch ? 'edit' : 'publish')}
            >
              {editingBatch ? '保存修改' : '保存并发布'}
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={form} layout='vertical' requiredMark='optional'>
          <Form.Item name='identity_tag' hidden>
            <Input />
          </Form.Item>
          <Form.Item name='max_material_bytes_mb' hidden>
            <InputNumber precision={0} />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0}>① 认证产品</Divider>
          <Form.Item
            name='certification_code'
            label='认证产品'
            rules={[{ required: true, message: '请选择认证产品' }]}
          >
            <Select
              placeholder='搜索并选择 H3C 认证产品'
              showSearch
              optionFilterProp='label'
              disabled={Boolean(editingBatch)}
              onChange={handleProductSelect}
              options={products.map((item) => ({
                label: `${item.code} · ${item.chinese_name}`,
                value: item.code,
              }))}
              notFoundContent={products.length === 0
                ? '暂无上架的 H3C 认证产品，请先在认证产品中配置'
                : undefined}
            />
          </Form.Item>
          {selectedProduct && <Typography.Paragraph>认证名称：{selectedProduct.chinese_name} · 考试代码：{selectedProduct.code}</Typography.Paragraph>}

          <Divider orientation='left' orientationMargin={0}>② 基本信息</Divider>
          <Form.Item
            name='name'
            label='批次名称'
            rules={[{ required: true, whitespace: true, message: '请输入批次名称' }]}
          >
            <Input maxLength={128} placeholder={suggestedBatchName(selectedProduct)} />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0}>③ 报名安排</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='apply_start' label='报名开始' rules={[{ required: true, message: '请选择' }]}>
                <DatePicker showTime style={{ width: '100%' }} placeholder='报名开始时间' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='apply_end' label='报名截止' rules={[{ required: true, message: '请选择' }]}>
                <DatePicker showTime style={{ width: '100%' }} placeholder='报名截止时间' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='capacity' label='总名额' rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder='可报名人数上限' />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0}>④ 考试安排</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='exam_date' label='考试时间' rules={[{ required: true, message: '请选择' }]}>
                <DatePicker showTime style={{ width: '100%' }} placeholder='考试时间' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='exam_location' label='考试地点'>
                <Input maxLength={256} placeholder='线下考试填写地址' />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0}>⑤ 报名类型与费用</Divider>
          <Typography.Paragraph type='secondary'>以下费用为本批次实际报名金额，发布后不可修改。</Typography.Paragraph>
          <Row gutter={16}>
            {(['coupon', 'student', 'full'] as const).map((type) => (
              <Col span={8} key={type}>
                <div
                  style={{
                    padding: 12,
                    height: '100%',
                    borderRadius: 8,
                    border: '1px solid #edf0f5',
                    background: '#fafbfc',
                  }}
                >
                  <Typography.Text strong>{TYPE_LABELS[type]}</Typography.Text>
                  <Form.Item
                    name={`${type}_price_cents`}
                    label='本批次费用（元）'
                    style={{ marginTop: 8, marginBottom: 8 }}
                    rules={[{ required: true, message: '必填' }]}
                  >
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix='¥' placeholder='0.00' />
                  </Form.Item>
                  <Typography.Paragraph type='secondary' style={{ fontSize: 12, marginBottom: 0 }}>
                    {REGISTRATION_REQUIREMENTS[type]}
                  </Typography.Paragraph>
                </div>
              </Col>
            ))}
          </Row>

          <Divider orientation='left' orientationMargin={0}>高级规则</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='payment_timeout_minutes' label='支付时限（分钟）'>
                <InputNumber min={1} max={1440} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='resubmission_window_hours' label='补正时限（小时）'>
                <InputNumber min={1} max={720} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='max_resubmissions' label='补正次数上限'>
                <InputNumber min={0} max={10} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='exam_code'
                label='考试信息例外调整'
                tooltip='默认使用认证产品代码，仅确有业务需要时修改'
                rules={[{ required: true, message: '请确认考试代码' }]}
              >
                <Input maxLength={64} placeholder='默认自动带出' />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0}>发布前摘要</Divider>
          <Descriptions
            size='small'
            bordered
            column={1}
            items={[
              {
                key: 'product',
                label: '认证产品',
                children: selectedProduct
                  ? `${selectedProduct.chinese_name} · ${selectedProduct.code}`
                  : '-',
              },
              { key: 'name', label: '批次名称', children: watchName ?? '-' },
              {
                key: 'apply',
                label: '报名时间',
                children: `${formatDateOrNull(watchApplyStart?.toISOString())} ~ ${formatDateOrNull(watchApplyEnd?.toISOString())}`,
              },
              {
                key: 'exam',
                label: '考试安排',
                children: `${formatDateOrNull(watchExamDate?.toISOString())}${watchExamLocation ? ` · ${watchExamLocation}` : ''}`,
              },
              { key: 'capacity', label: '总名额', children: watchCapacity ?? '-' },
              {
                key: 'prices',
                label: '三档费用',
                children: `考券 ${watchCouponPrice == null ? '-' : formatPrice(Math.round(watchCouponPrice * 100))} / 学生 ${watchStudentPrice == null ? '-' : formatPrice(Math.round(watchStudentPrice * 100))} / 全额 ${watchFullPrice == null ? '-' : formatPrice(Math.round(watchFullPrice * 100))}`,
              },
            ]}
          />

          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            三种报名类型属于同一批次的不同报名方式；费用均需配置，不能通过 0 元表示关闭该类型。
          </Typography.Text>
        </Form>
      </Drawer>

      <ConsultationGroupDialog
        open={Boolean(consultationBatch)}
        planId={consultationBatch?.plan_id ?? null}
        batchName={consultationBatch?.name ?? ''}
        onClose={() => setConsultationBatch(null)}
      />
   </>
  )
}
