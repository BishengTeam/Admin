/**
 * H3C 考场开放计划管理
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Card, Checkbox, DatePicker, Drawer, Empty, Form, Input, InputNumber,
  Modal, Popconfirm, Select, Space, Table, Tag, TimePicker, Typography, message,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
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
  status: string
  published_at: string | null
}

interface ScheduleDetail {
  id: number
  name: string
  status: string
  open_date_start: string
  open_date_end: string
  allowed_weekdays: number[]
  pre_exam_notice: string | null
  subjects: Array<{ id: number; product_id: number; product_name: string }>
  time_slots: Array<{ id: number; label: string; start_time: string }>
  seat_quotas: Array<{
    subject_id: number
    slot_id: number
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
  name: string
  date_range: [dayjs.Dayjs, dayjs.Dayjs]
  allowed_weekdays: number[]
  pre_exam_notice?: string
  product_ids: number[]
  time_slots: TimeSlotValue[]
  default_quota: number
}

type ListPayload<T> = T[] | { data?: T[]; items?: T[] } | undefined
type DateRangeValue = [dayjs.Dayjs | null, dayjs.Dayjs | null] | undefined
type QuotaMatrix = Record<string, number>

const DEFAULT_SLOT_TIMES = ['09:30', '11:30', '14:30', '16:30']
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
    if (enabled.has(current.day()) && !holidays.has(current.format('YYYY-MM-DD'))) {
      dates.push(current)
    }
    current = current.add(1, 'day')
  }
  return dates
}

function quotaKey(productId: number, slotTime: string) {
  return `${productId}:${slotTime}`
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  published: { color: 'green', label: '已发布' },
  closed: { color: 'gray', label: '已关闭' },
}

const api = {
  list: () => request.get('/admin/h3c/exam-schedules'),
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
}

export default function ExamSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
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

  const dateRange = Form.useWatch('date_range', form) as DateRangeValue
  const allowedWeekdays = Form.useWatch('allowed_weekdays', form) as number[] | undefined
  const selectedProductIds = Form.useWatch('product_ids', form) as number[] | undefined
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
  const selectedProducts = useMemo(
    () => products.filter(product => selectedProductIds?.includes(product.id)),
    [products, selectedProductIds],
  )
  const normalizedDefaultQuota = defaultQuota ?? 5
  const bookableDates = useMemo(
    () => generateBookableDates(dateRange, holidayDates, allowedWeekdays ?? [4]),
    [dateRange, holidayDates, allowedWeekdays],
  )

  useEffect(() => {
    const previousDefaultQuota = previousDefaultQuotaRef.current
    setQuotaMatrix(prev => {
      const next: QuotaMatrix = {}
      for (const product of selectedProducts) {
        for (const slot of slotConfigs) {
          const key = quotaKey(product.id, slot.time)
          next[key] = key in prev && prev[key] !== previousDefaultQuota
            ? prev[key]
            : normalizedDefaultQuota
        }
      }
      return next
    })
    previousDefaultQuotaRef.current = normalizedDefaultQuota
  }, [selectedProducts, slotConfigs, slotKey, normalizedDefaultQuota])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [schedulePayload, holidayPayload, productPage] = await Promise.all([
        api.list(),
        api.holidays(),
        certProductService.list({ type: 'h3c', page: 1, page_size: 100 }),
      ])
      setSchedules(normalizeList<Schedule>(schedulePayload as ListPayload<Schedule>))
      setHolidayDates(new Set(
        normalizeList<Holiday>(holidayPayload as ListPayload<Holiday>).map(h => h.holiday_date),
      ))
      setProducts(productPage.items.filter(product => product.is_active))
    } catch (error) {
      message.error(getErrorMessage(error, '加载失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({
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

    const productsForPayload = products.filter(product => values.product_ids.includes(product.id))
    setCreatingAction(publish ? 'publish' : 'draft')
    try {
      await api.create({
        name: values.name,
        open_date_start: values.date_range[0].format('YYYY-MM-DD'),
        open_date_end: values.date_range[1].format('YYYY-MM-DD'),
        allowed_weekdays: values.allowed_weekdays,
        pre_exam_notice: values.pre_exam_notice,
        product_ids: values.product_ids,
        time_slots: slotConfigs.map(slot => ({
          start_time: slot.time,
          label: watchedSlots?.find(item => item.start_time?.format('HH:mm') === slot.time)?.label,
        })),
        default_quota: values.default_quota,
        seat_quotas: productsForPayload.flatMap(product => slotConfigs.map(slot => ({
          product_id: product.id,
          slot_start: slot.time,
          total_seats: quotaMatrix[quotaKey(product.id, slot.time)] ?? values.default_quota,
        }))),
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
    setEditorOpen(true)
    setEditingId(id)
    try {
      const res = await api.get(id)
      setDetail(res as unknown as ScheduleDetail)
    } catch (error) {
      message.error(getErrorMessage(error, '加载详情失败'))
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', ellipsis: true },
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
        <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>创建考场计划</Button>
      </Space>

      <Table rowKey='id' columns={columns} dataSource={schedules} loading={loading} pagination={false} />

      <Modal
        title='一体化创建考场计划'
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
            <Form.Item name='name' label='计划名称' rules={[{ required: true, message: '请输入计划名称' }]}>
              <Input placeholder='如：2026年12月H3C考场' maxLength={128} />
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
                placeholder='搜索并选择 H3C 考试科目（可多选）'
                showSearch
                optionFilterProp='label'
                options={products.map(product => ({
                  label: productOptionLabel(product),
                  value: product.id,
                }))}
              />
            </Form.Item>
          </Card>

          <Card type='inner' title='④ 考位配额' size='small' style={{ marginTop: 16 }}>
            <Form.Item name='default_quota' label='默认每格配额' initialValue={5}>
              <InputNumber min={0} precision={0} />
            </Form.Item>
            {selectedProducts.length > 0 && slotConfigs.length > 0 && (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>科目</th>
                    {slotConfigs.map(slot => (
                      <th key={slot.time} style={tableHeaderStyle}>{slot.time}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map(product => (
                    <tr key={product.id}>
                      <td style={tableCellStyle}>{product.chinese_name || product.name}</td>
                      {slotConfigs.map(slot => {
                        const key = quotaKey(product.id, slot.time)
                        return (
                          <td key={key} style={{ ...tableCellStyle, textAlign: 'center' }}>
                            <InputNumber
                              min={0}
                              precision={0}
                              size='small'
                              style={{ width: 72 }}
                              value={quotaMatrix[key] ?? normalizedDefaultQuota}
                              onChange={value => setQuotaMatrix(prev => ({
                                ...prev,
                                [key]: value ?? 0,
                              }))}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ marginTop: 8 }}>
              <Text type='secondary'>0 = 不限机位。配额对所有可预约日期共享。</Text>
            </div>
          </Card>

          <Card type='inner' title='⑤ 考前注意事项' size='small' style={{ marginTop: 16 }}>
            <Form.Item name='pre_exam_notice'>
              <Input.TextArea rows={3} maxLength={5000} placeholder='请携带有效身份证件...' />
            </Form.Item>
          </Card>
        </Form>
      </Modal>

      <Drawer title={detail ? `考场计划：${detail.name}` : '编辑'}
        open={editorOpen} onClose={() => { setEditorOpen(false); setDetail(null) }}
        width={760} destroyOnClose>
        {detail && (
          <ScheduleEditor
            detail={detail}
            products={products}
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
  onChanged,
}: {
  detail: ScheduleDetail
  products: CertProduct[]
  onChanged: () => void
}) {
  const [addSlotOpen, setAddSlotOpen] = useState(false)
  const [slotForm] = Form.useForm()
  const canEditStructure = detail.status === 'draft'

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
            placeholder='添加 H3C 产品'
            style={{ width: 260 }}
            showSearch optionFilterProp='label'
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
            已发布/已关闭计划不可增删科目；发布后仍可调整配额。
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

      {detail.subjects.length > 0 && detail.time_slots.length > 0 && (
        <Card title='机位配额' size='small'>
          <SeatQuotaGrid detail={detail} onChanged={onChanged} />
        </Card>
      )}

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
      map[`${q.subject_id}-${q.slot_id}`] = q.total_seats
    }
    setQuotas(map)
  }, [detail])

  const quotaMeta = useMemo(() => {
    const meta = new Map<string, { booked: number }>()
    for (const q of detail.seat_quotas) {
      meta.set(`${q.subject_id}-${q.slot_id}`, { booked: q.booked ?? 0 })
    }
    return meta
  }, [detail])

  const handleSave = async () => {
    setSaving(true)
    try {
      const items = Object.entries(quotas).map(([key, val]) => {
        const [subjectId, slotId] = key.split('-').map(Number)
        return { subject_id: subjectId, slot_id: slotId, total_seats: val }
      })
      await api.setQuotas(detail.id, { quotas: items })
      message.success('机位配额已保存')
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
            <th style={tableHeaderStyle}>科目</th>
            {detail.time_slots.map(t => (
              <th key={t.id} style={tableHeaderStyle}>
                {t.label}<br /><Text type='secondary'>{t.start_time}</Text>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detail.subjects.map(s => (
            <tr key={s.id}>
              <td style={tableCellStyle}>{s.product_name}</td>
              {detail.time_slots.map(t => {
                const key = `${s.id}-${t.id}`
                const value = quotas[key] ?? 0
                const booked = quotaMeta.get(key)?.booked ?? 0
                return (
                  <td key={t.id} style={{ ...tableCellStyle, textAlign: 'center' }}>
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
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12 }}>
        <Text type='secondary'>
          0 = 不限机位。发布后可将限量调整为不低于已约人数，或改为 0 不限；关闭后不可修改。
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
