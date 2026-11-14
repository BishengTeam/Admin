/**
 * H3C 考场开放计划管理
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, DatePicker, Drawer, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, TimePicker, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import request from '@/core/request'

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
  seat_quotas: Array<{ subject_id: number; slot_id: number; total_seats: number }>
}

interface Holiday {
  id: number
  name: string
  holiday_date: string
  is_annual: boolean
}

type ListPayload<T> = T[] | { data?: T[]; items?: T[] } | undefined
type DateRangeValue = [dayjs.Dayjs | null, dayjs.Dayjs | null] | undefined

function normalizeList<T>(payload: ListPayload<T>): T[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function generateBookableFridays(
  range: DateRangeValue,
  holidays: Set<string>,
): dayjs.Dayjs[] {
  const start = range?.[0]
  const end = range?.[1]
  if (!start || !end || start.isAfter(end)) return []

  const dates: dayjs.Dayjs[] = []
  let current = start
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    if (current.day() === 5 && !holidays.has(current.format('YYYY-MM-DD'))) {
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
  list: () => request.get('/admin/h3c/exam-schedules'),
  holidays: () => request.get('/admin/holidays'),
  get: (id: number) => request.get(`/admin/h3c/exam-schedules/${id}`),
  create: (data: any) => request.post('/admin/h3c/exam-schedules', data),
  update: (id: number, data: any) => request.put(`/admin/h3c/exam-schedules/${id}`, data),
  publish: (id: number) => request.post(`/admin/h3c/exam-schedules/${id}/publish`),
  close: (id: number) => request.post(`/admin/h3c/exam-schedules/${id}/close`),
  addSubject: (id: number, productId: number) =>
    request.post(`/admin/h3c/exam-schedules/${id}/subjects?product_id=${productId}`),
  addSlot: (id: number, data: any) =>
    request.post(`/admin/h3c/exam-schedules/${id}/time-slots`, data),
  setQuotas: (id: number, data: any) =>
    request.put(`/admin/h3c/exam-schedules/${id}/seat-quotas`, data),
}

export default function ExamSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ScheduleDetail | null>(null)
  const [holidayDates, setHolidayDates] = useState<Set<string>>(() => new Set())
  const dateRange = Form.useWatch('date_range', form) as DateRangeValue
  const bookableDates = useMemo(
    () => generateBookableFridays(dateRange, holidayDates),
    [dateRange, holidayDates],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [schedulePayload, holidayPayload] = await Promise.all([api.list(), api.holidays()])
      setSchedules(normalizeList<Schedule>(schedulePayload as ListPayload<Schedule>))
      setHolidayDates(new Set(
        normalizeList<Holiday>(holidayPayload as ListPayload<Holiday>).map(h => h.holiday_date),
      ))
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    const values = await form.validateFields()
    setCreating(true)
    try {
      await api.create({
        name: values.name,
        open_date_start: values.date_range[0].format('YYYY-MM-DD'),
        open_date_end: values.date_range[1].format('YYYY-MM-DD'),
        pre_exam_notice: values.pre_exam_notice,
      })
      message.success('考场计划已创建')
      setCreateOpen(false)
      form.resetFields()
      load()
    } catch (e: any) {
      message.error(e?.response?.data?.message || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const openEditor = async (id: number) => {
    setEditorOpen(true)
    setEditingId(id)
    try {
      const res = await api.get(id)
      setDetail(res as unknown as ScheduleDetail)
    } catch {
      message.error('加载详情失败')
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
          <Popconfirm title="发布后不可编辑科目和时段，确定发布？" onConfirm={async () => {
            await api.publish(r.id); message.success('已发布'); load()
          }}>
            <Button size='small' type='link'>发布</Button>
          </Popconfirm>
        )}
        {r.status === 'published' && (
          <Popconfirm title="确定关闭该考场计划？" onConfirm={async () => {
            await api.close(r.id); message.success('已关闭'); load()
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
        <Button type='primary' icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建考场计划</Button>
      </Space>

      <Table rowKey='id' columns={columns} dataSource={schedules} loading={loading} pagination={false} />

      <Modal title='创建考场计划' open={createOpen} onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields() }} confirmLoading={creating}>
        <Form form={form} layout='vertical'>
          <Form.Item name='name' label='计划名称' rules={[{ required: true }]}>
            <Input placeholder='如：2026年11月H3C考场' maxLength={128} />
          </Form.Item>
          <Form.Item name='date_range' label='开放日期范围' rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          {dateRange?.[0] && dateRange?.[1] && (
            <Form.Item>
              <Text type='secondary'>
                该范围内可预约日期（仅周五，排除假期）：
                {bookableDates.length > 0
                  ? bookableDates.map(d => d.format('MM-DD')).join('、')
                  : '无可用日期'}
              </Text>
            </Form.Item>
          )}
          <Form.Item name='pre_exam_notice' label='考前注意事项'>
            <Input.TextArea rows={3} maxLength={5000} placeholder='请携带有效身份证件...' />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title={detail ? `考场计划：${detail.name}` : '编辑'}
        open={editorOpen} onClose={() => { setEditorOpen(false); setDetail(null) }}
        width={720} destroyOnClose>
        {detail && <ScheduleEditor detail={detail} onChanged={() => openEditor(editingId!)} />}
      </Drawer>
    </Card>
  )
}


function ScheduleEditor({ detail, onChanged }: { detail: ScheduleDetail; onChanged: () => void }) {
  const [addSlotOpen, setAddSlotOpen] = useState(false)
  const [slotForm] = Form.useForm()

  const canEdit = detail.status === 'draft'

  const handleAddSubject = async (productId: number) => {
    try {
      await api.addSubject(detail.id, productId)
      message.success('科目已添加')
      onChanged()
    } catch (e: any) {
      message.error(e?.response?.data?.message || '添加失败')
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
    } catch (e: any) {
      message.error(e?.response?.data?.message || '添加失败')
    }
  }

  return (
    <Space direction='vertical' style={{ width: '100%' }} size='large'>
      <Card title='科目管理' size='small'
        extra={canEdit && (
          <Select
            placeholder='添加 H3C 产品'
            style={{ width: 200 }}
            showSearch optionFilterProp='label'
            onSelect={(v) => handleAddSubject(v)}
            options={[
              { value: 1, label: 'H3CNE' },
              { value: 2, label: 'H3CSE-Routing & Switching' },
              { value: 3, label: 'H3CIE' },
            ]}
          />
        )}>
        {detail.subjects.length === 0 ? <Empty description='暂无科目' /> : (
          detail.subjects.map(s => (
            <Tag key={s.id}>{s.product_name}</Tag>
          ))
        )}
      </Card>

      <Card title='时段管理' size='small'
        extra={canEdit && <Button size='small' icon={<PlusOutlined />} onClick={() => setAddSlotOpen(true)}>添加时段</Button>}>
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
          <Form.Item name='label' label='时段标签' rules={[{ required: true }]}>
            <Input placeholder='如：09:30 场' maxLength={32} />
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
  const [quotas, setQuotas] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const map: Record<string, number> = {}
    for (const q of detail.seat_quotas) {
      map[`${q.subject_id}-${q.slot_id}`] = q.total_seats
    }
    setQuotas(map)
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
    } catch (e: any) {
      message.error(e?.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: 8, border: '1px solid #e8e8e8', textAlign: 'left' }}>科目</th>
            {detail.time_slots.map(t => (
              <th key={t.id} style={{ padding: 8, border: '1px solid #e8e8e8' }}>
                {t.label}<br /><Text type='secondary'>{t.start_time}</Text>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detail.subjects.map(s => (
            <tr key={s.id}>
              <td style={{ padding: 8, border: '1px solid #e8e8e8' }}>{s.product_name}</td>
              {detail.time_slots.map(t => (
                <td key={t.id} style={{ padding: 4, border: '1px solid #e8e8e8', textAlign: 'center' }}>
                  <InputNumber
                    min={0}
                    size='small'
                    style={{ width: 70 }}
                    value={quotas[`${s.id}-${t.id}`] ?? 0}
                    onChange={(v) => setQuotas(prev => ({ ...prev, [`${s.id}-${t.id}`]: v ?? 0 }))}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12 }}>
        <Text type='secondary'>0 = 不限机位。留空默认 0。配额对所有可预约日期共享。</Text>
        <Button type='primary' size='small' loading={saving} onClick={handleSave} style={{ marginLeft: 12 }}>
          保存配额
        </Button>
      </div>
    </>
  )
}
