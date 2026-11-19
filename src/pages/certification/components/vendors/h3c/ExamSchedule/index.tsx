/**
 * 考场开放计划管理（H3C / 深信服共用）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Card, Checkbox, DatePicker, Drawer, Empty, Form, Input, InputNumber,
  Modal, Popconfirm, Select, Space, Table, Tag, TimePicker, Tooltip, Typography, Upload, message,
} from 'antd'
import {
  DeleteOutlined, MinusCircleOutlined, PlusOutlined, ReloadOutlined, UploadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import request from '@/core/request'
import { certProductService } from '@/services/certProduct'
import type { CertProduct } from '@/types/certProduct'

const { Text } = Typography
const { RangePicker } = DatePicker

interface Schedule {
  id: number
  name: string
  vendor: string
  open_date_start: string
  open_date_end: string
  allowed_weekdays: number[]
  exam_location: string | null
  status: string
  published_at: string | null
}

interface ScheduleDetail {
  id: number
  name: string
  vendor?: string
  status: string
  open_date_start: string
  open_date_end: string
  allowed_weekdays: number[]
  exam_location?: string
  pre_exam_notice: string | null
  subjects: Array<{ id: number; product_id: number; product_name: string }>
  time_slots: Array<{ id: number; label: string; start_time: string }>
  seat_quotas: Array<{
    slot_id: number
    slot_start: string
    total_seats: number
    booked?: number
    remaining?: number
  }>
}

interface Holiday {
  id: number
  name: string
  holiday_date: string
  is_annual: boolean
}

interface TimeSlotValue {
  start_time: dayjs.Dayjs | null
  label?: string
}

interface CreateFormValues {
  vendor: string
  name: string
  date_range: [dayjs.Dayjs, dayjs.Dayjs]
  allowed_weekdays: number[]
  exam_location?: string
  pre_exam_notice?: string
  product_ids: number[]
  time_slots: TimeSlotValue[]
  default_quota: number
}

type ListPayload<T> = T[] | { data?: T[]; items?: T[] } | undefined
type DateRangeValue = [dayjs.Dayjs | null, dayjs.Dayjs | null] | undefined
type QuotaMatrix = Record<string, number>

const DEFAULT_SLOT_TIMES = ['09:30', '11:30', '14:30', '16:30']
const VENDOR_LABELS: Record<string, string> = { h3c: 'H3C', sangfor: '深信服' }
const WEEKDAY_OPTIONS = [
  { label: '周一', value: 0 },
  { label: '周二', value: 1 },
  { label: '周三', value: 2 },
  { label: '周四', value: 3 },
  { label: '周五', value: 4 },
  { label: '周六', value: 5 },
  { label: '周日', value: 6 },
]

function normalizeList<T>(payload: ListPayload<T>): T[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function readTotal(payload: unknown, fallback: number) {
  if (payload && typeof payload === 'object' && 'total' in payload) {
    const total = (payload as { total?: unknown }).total
    if (typeof total === 'number') return total
  }
  return fallback
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function formatMoney(cents?: number | null) {
  return cents == null ? '未配置' : `¥${(cents / 100).toFixed(2).replace(/\.00$/, '')}`
}

function productOptionLabel(product: CertProduct) {
  const name = product.chinese_name || product.name
  return `${name} · 考券 ${formatMoney(product.coupon_price_cents)} / 学生 ${formatMoney(product.student_price_cents)} / 全额 ${formatMoney(product.full_price_cents)}`
}

function generateBookableDates(
  range: DateRangeValue,
  holidays: Set<string>,
  weekdays: number[],
): dayjs.Dayjs[] {
  const start = range?.[0]
  const end = range?.[1]
  const enabled = new Set(weekdays)
  if (!start || !end || start.isAfter(end) || enabled.size === 0) return []

  const dates: dayjs.Dayjs[] = []
  let current = start
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    // Backend uses Python weekday(): 0=Monday ... 6=Sunday.
    // dayjs.day(): 0=Sunday ... 6=Saturday.
    const pythonWeekday = (current.day() + 6) % 7
    if (enabled.has(pythonWeekday) && !holidays.has(current.format('YYYY-MM-DD'))) {
      dates.push(current)
    }
    current = current.add(1, 'day')
  }
  return dates
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  published: { color: 'green', label: '已发布' },
  closed: { color: 'gray', label: '已关闭' },
}

const api = {
  list: (vendor: string | undefined, page: number, pageSize: number) => request.get(
    `/admin/h3c/exam-schedules?vendor=${encodeURIComponent(vendor ?? '')}&page=${page}&page_size=${pageSize}`,
  ),
  holidays: () => request.get('/admin/holidays'),
  get: (id: number) => request.get(`/admin/h3c/exam-schedules/${id}`),
  create: (data: unknown) => request.post('/admin/h3c/exam-schedules', data),
  update: (id: number, data: unknown) => request.put(`/admin/h3c/exam-schedules/${id}`, data),
  publish: (id: number) => request.post(`/admin/h3c/exam-schedules/${id}/publish`),
  close: (id: number) => request.post(`/admin/h3c/exam-schedules/${id}/close`),
  addSubject: (id: number, productId: number) =>
    request.post(`/admin/h3c/exam-schedules/${id}/subjects?product_id=${productId}`),
  addSlot: (id: number, data: unknown) =>
    request.post(`/admin/h3c/exam-schedules/${id}/time-slots`, data),
  setQuotas: (id: number, data: unknown) =>
    request.put(`/admin/h3c/exam-schedules/${id}/seat-quotas`, data),
  attachments: (vendor: string, scheduleId: number) =>
    request.get('/admin/cert-attachments', { params: { vendor, schedule_id: scheduleId } }),
  createAttachment: (data: unknown) => request.post('/admin/cert-attachments', data),
  deleteAttachment: (id: number) => request.delete(`/admin/cert-attachments/${id}`),
  upload: (file: File, vendor: string) => {
    const form = new FormData()
    form.append('file', file)
    return request.post(
      `/admin/cert-attachments/upload?vendor=${encodeURIComponent(vendor)}`,
      form,
    )
  },
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function resolveFileUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url}`
}

export default function ExamSchedulePage({ type = 'h3c' }: { type?: string }) {
  const vendor = type === 'sangfor' ? 'sangfor' : 'h3c'
  const quotaEnabled = vendor !== 'sangfor'
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [products, setProducts] = useState<CertProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creatingAction, setCreatingAction] = useState<'draft' | 'publish' | null>(null)
  const [form] = Form.useForm()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ScheduleDetail | null>(null)
  const [holidayDates, setHolidayDates] = useState<Set<string>>(() => new Set())
  const [quotaMatrix, setQuotaMatrix] = useState<QuotaMatrix>({})
  const previousDefaultQuotaRef = useRef(5)
  const editorRequestRef = useRef(0)

  const dateRange = Form.useWatch('date_range', form) as DateRangeValue
  const allowedWeekdays = Form.useWatch('allowed_weekdays', form) as number[] | undefined
  const watchedSlots = Form.useWatch('time_slots', form) as TimeSlotValue[] | undefined
  const defaultQuota = Form.useWatch('default_quota', form) as number | undefined

  const slotConfigs = useMemo(() => (
    (watchedSlots ?? [])
      .filter(slot => slot?.start_time)
      .map(slot => ({
        start: slot.start_time as dayjs.Dayjs,
        time: (slot.start_time as dayjs.Dayjs).format('HH:mm'),
      }))
  ), [watchedSlots])
  const slotKey = useMemo(() => slotConfigs.map(slot => slot.time).join('|'), [slotConfigs])
  const normalizedDefaultQuota = defaultQuota ?? 5
  const bookableDates = useMemo(
    () => generateBookableDates(dateRange, holidayDates, allowedWeekdays ?? [4]),
    [dateRange, holidayDates, allowedWeekdays],
  )

  useEffect(() => {
    const previousDefaultQuota = previousDefaultQuotaRef.current
    setQuotaMatrix(prev => {
      const next: QuotaMatrix = {}
      for (const slot of slotConfigs) {
        next[slot.time] = slot.time in prev && prev[slot.time] !== previousDefaultQuota
          ? prev[slot.time]
          : normalizedDefaultQuota
      }
      return next
    })
    previousDefaultQuotaRef.current = normalizedDefaultQuota
  }, [slotConfigs, slotKey, normalizedDefaultQuota])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [schedulePayload, holidayPayload, productPage] = await Promise.all([
        api.list(vendor, page, pageSize),
        // 假期是 H3C 全局配置；深信服运营没有该权限，不能用它阻断页面加载。
        vendor === 'h3c' ? api.holidays() : Promise.resolve([]),
        certProductService.list({ type: vendor, page: 1, page_size: 100 }),
      ])
      const rows = normalizeList<Schedule>(schedulePayload as ListPayload<Schedule>)
      setSchedules(rows)
      setTotal(readTotal(schedulePayload, rows.length))
      setHolidayDates(new Set(
        normalizeList<Holiday>(holidayPayload as ListPayload<Holiday>).map(h => h.holiday_date),
      ))
      setProducts(productPage.items.filter(product => product.is_active))
    } catch (error) {
      message.error(getErrorMessage(error, '加载失败'))
    } finally {
      setLoading(false)
    }
  }, [vendor, page, pageSize])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [vendor])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({
      vendor,
      allowed_weekdays: [4],
      product_ids: [],
      default_quota: 5,
      time_slots: DEFAULT_SLOT_TIMES.map(time => ({
        start_time: dayjs(time, 'HH:mm'),
        label: undefined,
      })),
    })
    setQuotaMatrix({})
    setCreateOpen(true)
  }

  const closeCreate = () => {
    setCreateOpen(false)
    form.resetFields()
    setQuotaMatrix({})
  }

  const handleCreate = async (publish: boolean) => {
    let values: CreateFormValues
    try {
      values = await form.validateFields() as CreateFormValues
    } catch {
      return
    }

    const times = slotConfigs.map(slot => slot.time)
    if (new Set(times).size !== times.length) {
      message.warning('考试时段不能重复')
      return
    }

    setCreatingAction(publish ? 'publish' : 'draft')
    try {
      await api.create({
        vendor,
        name: values.name,
        open_date_start: values.date_range[0].format('YYYY-MM-DD'),
        open_date_end: values.date_range[1].format('YYYY-MM-DD'),
        allowed_weekdays: values.allowed_weekdays,
        exam_location: values.exam_location,
        pre_exam_notice: values.pre_exam_notice,
        product_ids: values.product_ids,
        time_slots: slotConfigs.map(slot => ({
          start_time: slot.time,
          label: watchedSlots?.find(item => item.start_time?.format('HH:mm') === slot.time)?.label,
        })),
        ...(quotaEnabled ? {
          default_quota: values.default_quota,
          shared_quotas: slotConfigs.map(slot => ({
            slot_start: slot.time,
            total_seats: quotaMatrix[slot.time] ?? values.default_quota,
          })),
        } : {}),
        publish,
      })
      message.success(publish ? '考场计划已创建并发布' : '考场计划草稿已创建')
      closeCreate()
      load()
    } catch (error) {
      message.error(getErrorMessage(error, '创建失败'))
    } finally {
      setCreatingAction(null)
    }
  }

  const openEditor = async (id: number) => {
    const requestId = ++editorRequestRef.current
    setEditorOpen(true)
    setEditingId(id)
    setDetail(null)
    try {
      const res = await api.get(id)
      // 快速切换计划时丢弃过期响应，避免附件/配额操作绑定到错误计划。
      if (requestId !== editorRequestRef.current) return
      setDetail(res as unknown as ScheduleDetail)
    } catch (error) {
      if (requestId !== editorRequestRef.current) return
      message.error(getErrorMessage(error, '加载详情失败'))
    }
  }

  const searchProducts = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return
    try {
      const result = await certProductService.list({
        type: vendor,
        keyword: keyword.trim(),
        page: 1,
        page_size: 50,
      })
      const merged = new Map<string, CertProduct>()
      for (const item of products) merged.set(item.code, item)
      for (const item of result.items) merged.set(item.code, item)
      setProducts([...merged.values()].filter(item => item.is_active))
    } catch {
      // 远程搜索失败时保留本地选项，不打断表单。
    }
  }, [products, vendor])

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '厂商', dataIndex: 'vendor', width: 90, render: (value: string) =>
      VENDOR_LABELS[value] ?? value },
    { title: '开放范围', width: 200, render: (_: unknown, r: Schedule) =>
      `${r.open_date_start} ~ ${r.open_date_end}` },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: string) =>
      <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.label ?? s}</Tag> },
    { title: '操作', width: 220, render: (_: unknown, r: Schedule) => (
      <Space size='small'>
        <Button size='small' type='link' onClick={() => openEditor(r.id)}>编辑</Button>
        {r.status === 'draft' && (
          <Popconfirm title='发布后不可增删科目和时段，确定发布？' onConfirm={async () => {
            try {
              await api.publish(r.id)
              message.success('已发布')
              load()
            } catch (error) {
              message.error(getErrorMessage(error, '发布失败'))
            }
          }}>
            <Button size='small' type='link'>发布</Button>
          </Popconfirm>
        )}
        {r.status === 'published' && (
          <Popconfirm title='确定关闭该考场计划？' onConfirm={async () => {
            try {
              await api.close(r.id)
              message.success('已关闭')
              load()
            } catch (error) {
              message.error(getErrorMessage(error, '关闭失败'))
            }
          }}>
            <Button size='small' type='link' danger>关闭</Button>
          </Popconfirm>
        )}
      </Space>
    )},
  ]

  return (
    <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>
          创建{VENDOR_LABELS[vendor]}考场计划
        </Button>
      </Space>

      <Table
        rowKey='id'
        columns={columns}
        dataSource={schedules}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage)
            setPageSize(nextSize)
          },
        }}
      />

      <Modal
        title={`${VENDOR_LABELS[vendor]} · 一体化创建考场计划`}
        open={createOpen}
        onCancel={closeCreate}
        width={1080}
        footer={[
          <Button key='cancel' onClick={closeCreate}>取消</Button>,
          <Button
            key='draft'
            onClick={() => handleCreate(false)}
            loading={creatingAction === 'draft'}
          >保存草稿</Button>,
          <Button
            key='publish'
            type='primary'
            onClick={() => handleCreate(true)}
            loading={creatingAction === 'publish'}
          >保存并发布</Button>,
        ]}
      >
        <Form form={form} layout='vertical'>
          <Card type='inner' title='① 基本信息' size='small'>
            <Form.Item name='vendor' hidden><Input /></Form.Item>
            <Form.Item name='name' label='计划名称' rules={[{ required: true, message: '请输入计划名称' }]}>
              <Input placeholder={`如：2026年12月${VENDOR_LABELS[vendor]}考场`} maxLength={128} />
            </Form.Item>
            <Form.Item
              name='date_range'
              label='开放日期范围'
              rules={[{
                validator: async (_, value: DateRangeValue) => {
                  if (!value?.[0] || !value?.[1]) throw new Error('请选择完整日期范围')
                },
              }]}
            >
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name='allowed_weekdays'
              label='可用星期'
              initialValue={[4]}
              rules={[{ required: true, message: '请至少选择一个可用星期' }]}
            >
              <Checkbox.Group options={WEEKDAY_OPTIONS} />
            </Form.Item>
            <Form.Item name='exam_location' label='考试地点'>
              <Input placeholder='如：成都市高新区天府软件园B区3楼' maxLength={256} />
            </Form.Item>
            <Form.Item>
              <Text type='secondary'>
                该范围内可预约日期（排除假期）：共 {bookableDates.length} 个
                {bookableDates.length > 0 && (
                  <>　{bookableDates.map(d => d.format('MM-DD')).join('、')}</>
                )}
                {dateRange?.[0] && dateRange?.[1] && bookableDates.length === 0 && '（当前无可预约日期）'}
              </Text>
            </Form.Item>
          </Card>

          <Card type='inner' title='② 考试时段（默认四场，可增删改）' size='small' style={{ marginTop: 16 }}>
            <Form.List
              name='time_slots'
              rules={[{
                validator: async (_, values: TimeSlotValue[] | undefined) => {
                  if (!values?.length) throw new Error('请至少添加一个考试时段')
                },
              }]}
            >
              {(fields, { add, remove }) => (
                <Space direction='vertical' style={{ width: '100%' }} size='small'>
                  {fields.map(field => (
                    <Space key={field.key} align='start' wrap>
                      <Form.Item
                        name={[field.name, 'start_time']}
                        rules={[{ required: true, message: '请选择时间' }]}
                      >
                        <TimePicker format='HH:mm' minuteStep={30} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'label']}
                      >
                        <Input placeholder='时段名称（默认 09:30 场）' maxLength={32} style={{ width: 220 }} />
                      </Form.Item>
                      <Button
                        type='text'
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                        disabled={fields.length <= 1}
                      />
                    </Space>
                  ))}
                  <Button
                    type='dashed'
                    icon={<PlusOutlined />}
                    onClick={() => add({ start_time: dayjs('18:30', 'HH:mm'), label: undefined })}
                  >添加时段</Button>
                </Space>
              )}
            </Form.List>
          </Card>

          <Card type='inner' title='③ 考试科目' size='small' style={{ marginTop: 16 }}>
            <Form.Item
              name='product_ids'
              rules={[{ required: true, message: '请至少选择一个考试科目' }]}
            >
              <Select
                mode='multiple'
                placeholder={`搜索并选择${VENDOR_LABELS[vendor]}考试科目（可多选）`}
                showSearch
                optionFilterProp='label'
                onSearch={value => { void searchProducts(value) }}
                options={products.map(product => ({
                  label: productOptionLabel(product),
                  value: product.id,
                }))}
              />
            </Form.Item>
          </Card>

          {quotaEnabled ? (
            <Card
              type='inner'
              title='④ 考位配额（所有科目共享）'
              size='small'
              style={{ marginTop: 16 }}
            >
              <Form.Item name='default_quota' label='默认每个时段机位' initialValue={5}>
                <InputNumber min={0} precision={0} />
              </Form.Item>
              {slotConfigs.length > 0 && (
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>时段</th>
                      <th style={tableHeaderStyle}>共享机位</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotConfigs.map(slot => (
                      <tr key={slot.time}>
                        <td style={tableCellStyle}>{slot.time}</td>
                        <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                          <InputNumber
                            min={0}
                            precision={0}
                            size='small'
                            style={{ width: 72 }}
                            value={quotaMatrix[slot.time] ?? normalizedDefaultQuota}
                            onChange={value => setQuotaMatrix(prev => ({
                              ...prev,
                              [slot.time]: value ?? 0,
                            }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ marginTop: 8 }}>
                <Text type='secondary'>
                  同一时段所有科目共享机位，先到先得。0 = 不限；配额对所有可预约日期共享。
                </Text>
              </div>
            </Card>
          ) : (
            <Card type='inner' title='④ 考位配额' size='small' style={{ marginTop: 16 }}>
              <Text type='secondary'>
                深信服考试不设机位配额，考生可选择任意已发布时段，无需配置余量。
              </Text>
            </Card>
          )}

          <Card type='inner' title='⑤ 考前注意事项' size='small' style={{ marginTop: 16 }}>
            <Form.Item name='pre_exam_notice'>
              <Input.TextArea rows={3} maxLength={5000} placeholder='请携带有效身份证件...' />
            </Form.Item>
          </Card>
        </Form>
      </Modal>

      <Drawer title={detail ? `${VENDOR_LABELS[detail.vendor ?? 'h3c'] ?? detail.vendor}考场计划：${detail.name}` : '编辑'}
        open={editorOpen} onClose={() => { setEditorOpen(false); setDetail(null) }}
        width='min(760px, 100vw)' destroyOnClose>
        {detail && (
          <ScheduleEditor
            detail={detail}
            products={products}
            onSearchProducts={searchProducts}
            onChanged={() => openEditor(editingId!)}
          />
        )}
      </Drawer>
    </Card>
  )
}

const tableHeaderStyle = {
  padding: 8,
  border: '1px solid #e8e8e8',
  textAlign: 'left',
} as const

const tableCellStyle = {
  padding: 8,
  border: '1px solid #e8e8e8',
} as const

function ScheduleEditor({
  detail,
  products,
  onSearchProducts,
  onChanged,
}: {
  detail: ScheduleDetail
  products: CertProduct[]
  onSearchProducts: (keyword: string) => Promise<void>
  onChanged: () => void
}) {
  const [addSlotOpen, setAddSlotOpen] = useState(false)
  const [slotForm] = Form.useForm()
  const canEditStructure = detail.status === 'draft'
  const detailVendor = detail.vendor ?? 'h3c'
  const quotaEnabled = detailVendor !== 'sangfor'

  const handleAddSubject = async (productId: number) => {
    try {
      await api.addSubject(detail.id, productId)
      message.success('科目已添加')
      onChanged()
    } catch (error) {
      message.error(getErrorMessage(error, '添加失败'))
    }
  }

  const handleAddSlot = async () => {
    const values = await slotForm.validateFields()
    try {
      await api.addSlot(detail.id, {
        label: values.label,
        start_time: values.start_time.format('HH:mm'),
      })
      message.success('时段已添加')
      setAddSlotOpen(false)
      slotForm.resetFields()
      onChanged()
    } catch (error) {
      message.error(getErrorMessage(error, '添加失败'))
    }
  }

  return (
    <Space direction='vertical' style={{ width: '100%' }} size='large'>
      <Card title='科目管理' size='small'
        extra={canEditStructure && (
          <Select
            placeholder={`添加${VENDOR_LABELS[detailVendor] ?? detailVendor}产品`}
            style={{ width: 260 }}
            showSearch optionFilterProp='label'
            onSearch={value => { void onSearchProducts(value) }}
            onSelect={value => handleAddSubject(value as number)}
            options={products.map(product => ({
              label: productOptionLabel(product),
              value: product.id,
            }))}
          />
        )}>
        {detail.subjects.length === 0 ? <Empty description='暂无科目' /> : (
          detail.subjects.map(s => <Tag key={s.id}>{s.product_name}</Tag>)
        )}
        {!canEditStructure && (
          <Text type='secondary' style={{ display: 'block', marginTop: 8 }}>
            已发布/已关闭计划不可增删科目；发布后仍可调整共享配额。
          </Text>
        )}
      </Card>

      <Card title='时段管理' size='small'
        extra={canEditStructure && (
          <Button size='small' icon={<PlusOutlined />} onClick={() => setAddSlotOpen(true)}>添加时段</Button>
        )}>
        {detail.time_slots.length === 0 ? <Empty description='暂无时段' /> : (
          detail.time_slots.map(t => (
            <Tag key={t.id} color='blue'>{t.label} ({t.start_time})</Tag>
          ))
        )}
      </Card>

      {quotaEnabled && detail.subjects.length > 0 && detail.time_slots.length > 0 && (
        <Card title='共享机位配额' size='small'>
          <SeatQuotaGrid detail={detail} onChanged={onChanged} />
        </Card>
      )}

      <Card title='配套附件' size='small'>
        <AttachmentManager vendor={detailVendor} scheduleId={detail.id} />
      </Card>

      <Modal title='添加时段' open={addSlotOpen} onOk={handleAddSlot}
        onCancel={() => { setAddSlotOpen(false); slotForm.resetFields() }}>
        <Form form={slotForm} layout='vertical'>
          <Form.Item name='label' label='时段标签'>
            <Input placeholder='默认使用开始时间命名' maxLength={32} />
          </Form.Item>
          <Form.Item name='start_time' label='开始时间' rules={[{ required: true }]}>
            <TimePicker format='HH:mm' minuteStep={30} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

function SeatQuotaGrid({ detail, onChanged }: { detail: ScheduleDetail; onChanged: () => void }) {
  const [quotas, setQuotas] = useState<QuotaMatrix>({})
  const [saving, setSaving] = useState(false)
  const canEdit = detail.status !== 'closed'

  useEffect(() => {
    const map: QuotaMatrix = {}
    for (const q of detail.seat_quotas) {
      map[String(q.slot_id)] = q.total_seats
    }
    setQuotas(map)
  }, [detail])

  const quotaMeta = useMemo(() => {
    const meta = new Map<string, { booked: number }>()
    for (const q of detail.seat_quotas) {
      meta.set(String(q.slot_id), { booked: q.booked ?? 0 })
    }
    return meta
  }, [detail])

  const handleSave = async () => {
    setSaving(true)
    try {
      const items = Object.entries(quotas).map(([slotId, totalSeats]) => ({
        slot_id: Number(slotId),
        total_seats: totalSeats,
      }))
      await api.setQuotas(detail.id, { shared_quotas: items })
      message.success('共享机位配额已保存')
      onChanged()
    } catch (error) {
      message.error(getErrorMessage(error, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={tableHeaderStyle}>时段</th>
            <th style={tableHeaderStyle}>共享机位</th>
          </tr>
        </thead>
        <tbody>
          {detail.time_slots.map(t => {
            const key = String(t.id)
            const value = quotas[key] ?? 0
            const booked = quotaMeta.get(key)?.booked ?? 0
            return (
              <tr key={t.id}>
                <td style={tableCellStyle}>{t.label} ({t.start_time})</td>
                <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                  <InputNumber
                    min={0}
                    size='small'
                    style={{ width: 70 }}
                    disabled={!canEdit}
                    value={value}
                    onChange={v => setQuotas(prev => ({ ...prev, [key]: v ?? 0 }))}
                  />
                  <div>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      已约 {booked} / {value === 0 ? '不限' : `余 ${Math.max(0, value - booked)}`}
                    </Text>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 12 }}>
        <Text type='secondary'>
          同一时段所有科目共享机位。0 = 不限；发布后可将限量调整为不低于该时段已约人数；关闭后不可修改。
        </Text>
        <Button
          type='primary'
          size='small'
          loading={saving}
          disabled={!canEdit}
          onClick={handleSave}
          style={{ marginLeft: 12 }}
        >保存配额</Button>
      </div>
    </>
  )
}

interface AttachmentItem {
  id: number
  title: string
  file_url: string
  file_size: number | null
}

function formatFileSize(bytes: number | null) {
  if (!bytes || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function AttachmentManager({ vendor, scheduleId }: { vendor: string; scheduleId: number }) {
  const [items, setItems] = useState<AttachmentItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await api.attachments(vendor, scheduleId)
      setItems(normalizeList<AttachmentItem>(payload as ListPayload<AttachmentItem>))
    } catch (error) {
      message.error(getErrorMessage(error, '附件加载失败'))
    } finally {
      setLoading(false)
    }
  }, [vendor, scheduleId])

  useEffect(() => { void load() }, [load])

  const handleUpload = async (file: File) => {
    try {
      const uploaded = await api.upload(file, vendor) as {
        url?: string
        filename?: string
        size?: number
      }
      if (!uploaded?.url) throw new Error('上传结果缺少文件地址')
      await api.createAttachment({
        vendor,
        schedule_id: scheduleId,
        title: uploaded.filename || file.name,
        file_url: uploaded.url,
        file_size: uploaded.size ?? file.size,
      })
      message.success('附件已上传')
      await load()
    } catch (error) {
      message.error(getErrorMessage(error, '附件上传失败'))
    }
  }

  return (
    <Space direction='vertical' style={{ width: '100%' }}>
      <Upload
        showUploadList={false}
        customRequest={({ file, onSuccess, onError }) => {
          handleUpload(file as File)
            .then(() => onSuccess?.({}))
            .catch(error => onError?.(error as Error))
        }}
      >
        <Button size='small' icon={<UploadOutlined />}>上传附件</Button>
      </Upload>
      {items.length === 0 ? (
        <Text type='secondary'>
          {loading ? '正在加载附件…' : '暂无附件。考试须知、考场指引等可上传给考生下载。'}
        </Text>
      ) : (
        <Space direction='vertical' style={{ width: '100%' }}>
          {items.map(item => (
            <Space key={item.id} wrap>
              <Typography.Link href={resolveFileUrl(item.file_url)} target='_blank' rel='noreferrer'>
                {item.title}
              </Typography.Link>
              <Text type='secondary'>{formatFileSize(item.file_size)}</Text>
              <Popconfirm
                title='确定删除该附件？'
                onConfirm={async () => {
                  try {
                    await api.deleteAttachment(item.id)
                    message.success('附件已删除')
                    await load()
                  } catch (error) {
                    message.error(getErrorMessage(error, '删除失败'))
                  }
                }}
              >
                <Tooltip title='删除附件'>
                  <Button
                    size='small'
                    type='text'
                    danger
                    aria-label={`删除附件 ${item.title}`}
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          ))}
        </Space>
      )}
    </Space>
  )
}
