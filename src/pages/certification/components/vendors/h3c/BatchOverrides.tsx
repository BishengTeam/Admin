import { useState } from 'react'
import dayjs from 'dayjs'
import {
  Button,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { h3cService } from '@/services/h3c'
import { formatDate, formatPrice } from '@/utils/format'
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

const TYPE_LABELS: Record<H3cRegistrationType, string> = {
  coupon: '考券报名',
  student: '学生报名',
  full: '全额报名',
}

const BATCH_STATUS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  registration_closed: { text: '报名关闭', color: 'orange' },
  finalized: { text: '已结束', color: 'blue' },
  archived: { text: '已归档', color: 'default' },
  cancelled: { text: '已取消', color: 'red' },
}

export default function BatchOverrides(_props: { type: CertType; productCode: string | null }) {
  const [batchOpen, setBatchOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<H3cExamBatch | null>(null)
  const [form] = Form.useForm()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => h3cService.listBatches(page),
    [],
  )
  const { ensureReauthenticated, reauthDialog } = useReauthentication()

  const cancel = async (id: number) => {
    const token = await ensureReauthenticated()
    if (!token) throw new Error('请重新验证管理员密码')
    await h3cService.cancelBatch(id, token)
    message.success('批次已取消')
    refresh()
  }

  const createBatch = async () => {
    const values = await form.validateFields()
    await h3cService.createBatch({
      ...values,
      apply_start: values.apply_start?.toISOString(),
      apply_end: values.apply_end?.toISOString(),
      exam_date: values.exam_date?.toISOString(),
      coupon_price_cents: yuanToCents(values.coupon_price_cents),
      student_price_cents: yuanToCents(values.student_price_cents),
      full_price_cents: yuanToCents(values.full_price_cents),
    })
    message.success('H3C 考试批次已创建，请刷新批次列表后发布')
    setBatchOpen(false)
  }
  const updateBatch = async () => {
    if (!editingBatch) return
    const values = await form.validateFields()
    const { certification_code: _ignored, ...payload } = values
    await h3cService.updateBatch(editingBatch.id, {
      ...payload,
      apply_start: values.apply_start?.toISOString(),
      apply_end: values.apply_end?.toISOString(),
      exam_date: values.exam_date?.toISOString(),
      coupon_price_cents: yuanToCents(values.coupon_price_cents),
      student_price_cents: yuanToCents(values.student_price_cents),
      full_price_cents: yuanToCents(values.full_price_cents),
    })
    message.success('H3C 考试批次已更新')
    setBatchOpen(false)
  }

  const handleCreate = () => {
    setEditingBatch(null)
    form.resetFields()
    form.setFieldsValue({
      payment_timeout_minutes: 30,
      resubmission_window_hours: 72,
      max_resubmissions: 2,
      max_material_bytes: 10485760,
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
      coupon_price_cents: centsToYuan(batch.prices.find((p) => p.registration_type === 'coupon')?.price_cents),
      student_price_cents: centsToYuan(batch.prices.find((p) => p.registration_type === 'student')?.price_cents),
      full_price_cents: centsToYuan(batch.prices.find((p) => p.registration_type === 'full')?.price_cents),
      payment_timeout_minutes: batch.payment_timeout_minutes,
      resubmission_window_hours: batch.resubmission_window_hours,
      max_resubmissions: batch.max_resubmissions,
      max_material_bytes: batch.max_material_bytes,
    })
    setBatchOpen(true)
  }

  const columns: ColumnsType<H3cExamBatch> = [
    { title: '批次', dataIndex: 'name', ellipsis: true },
    { title: '考试代码', dataIndex: 'exam_code', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => {
        const item = BATCH_STATUS[value] ?? { text: value, color: 'default' }
        return <Tag color={item.color}>{item.text}</Tag>
      },
    },
    { title: '考试时间', dataIndex: 'exam_date', width: 165, render: (value: string) => formatDate(value) },
    { title: '名额', width: 90, render: (_, row) => `${row.occupied_count}/${row.capacity}` },
    {
      title: '价格',
      dataIndex: 'prices',
      width: 240,
      render: (prices: H3cExamBatch['prices']) => prices
        .map((price) => `${TYPE_LABELS[price.registration_type]} ${formatPrice(price.price_cents)}`)
        .join(' / '),
    },
    {
      title: '操作',
      width: 310,
      render: (_, row) => (
        <Space>
          {row.status === 'draft' && (
            <Button size='small' onClick={() => handleEdit(row)}>编辑</Button>
          )}
          {row.status === 'draft' && (
            <Button size='small' type='primary' onClick={() => h3cService.publishBatch(row.id).then(refresh)}>
              发布
            </Button>
          )}
          {row.status === 'published' && (
            <Button size='small' onClick={() => h3cService.closeBatchRegistration(row.id).then(refresh)}>
              关闭报名
            </Button>
          )}
          {(row.status === 'published' || row.status === 'registration_closed') && (
            <>
              <Button size='small' onClick={() => h3cService.finalizeBatch(row.id).then(refresh)}>
                结束
              </Button>
              <Popconfirm title='确认取消该考试批次？' onConfirm={() => cancel(row.id)}>
                <Button size='small' danger>取消</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
        <Button type='primary' icon={<PlusOutlined />} onClick={handleCreate}>新建批次</Button>
      </Space>
      <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />
      {reauthDialog}

      <Modal
        title={editingBatch ? '编辑 H3C 考试批次' : '新建 H3C 考试批次'}
        open={batchOpen}
        onOk={editingBatch ? updateBatch : createBatch}
        onCancel={() => setBatchOpen(false)}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout='vertical'>
          <Typography.Text type='secondary' style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>基本信息</Typography.Text>
          <Divider style={{ margin: '8px 0 20px' }} />

          <Form.Item name='certification_code' label='认证代码' rules={[{ required: true, message: '请输入认证代码' }]} tooltip='H3C 认证体系的唯一标识'>
            <Input disabled={Boolean(editingBatch)} placeholder='例如 H3CNE-2026' />
          </Form.Item>
          <Form.Item name='name' label='批次名称' rules={[{ required: true, message: '请输入批次名称' }]}>
            <Input placeholder='例如 2026 年 10 月成都考区' />
          </Form.Item>
          <Form.Item name='exam_code' label='考试代码' rules={[{ required: true, message: '请输入考试代码' }]}>
            <Input placeholder='H3C 官方考试科目代码' />
          </Form.Item>
          <Form.Item name='identity_tag' label='身份标签' rules={[{ required: true, message: '请输入身份标签' }]} tooltip='用于区分不同认证科目或等级'>
            <Input placeholder='例如 H3CNE-RS' />
          </Form.Item>

          <Typography.Text type='secondary' style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>时间与地点</Typography.Text>
          <Divider style={{ margin: '8px 0 20px' }} />

          <Form.Item name='apply_start' label='报名开始时间' rules={[{ required: true, message: '请选择报名开始时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} placeholder='选择报名开始时间' />
          </Form.Item>
          <Form.Item name='apply_end' label='报名截止时间' rules={[{ required: true, message: '请选择报名截止时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} placeholder='选择报名截止时间' />
          </Form.Item>
          <Form.Item name='exam_date' label='考试时间' rules={[{ required: true, message: '请选择考试时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} placeholder='选择考试时间' />
          </Form.Item>
          <Form.Item name='capacity' label='总名额' rules={[{ required: true, message: '请输入总名额' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder='可报名人数上限' />
          </Form.Item>
          <Form.Item name='exam_location' label='考试地点'>
            <Input placeholder='线下考试填写地址' />
          </Form.Item>

          <Typography.Text type='secondary' style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>报名价格（元）</Typography.Text>
          <Divider style={{ margin: '8px 0 20px' }} />

          <Form.Item name='coupon_price_cents' label='考券价' rules={[{ required: true, message: '请输入考券价格' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder='0.00' />
          </Form.Item>
          <Form.Item name='student_price_cents' label='学生价' rules={[{ required: true, message: '请输入学生价格' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder='0.00' />
          </Form.Item>
          <Form.Item name='full_price_cents' label='全额价' rules={[{ required: true, message: '请输入全额价格' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder='0.00' />
          </Form.Item>

          <Typography.Text type='secondary' style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>审核与补交</Typography.Text>
          <Divider style={{ margin: '8px 0 20px' }} />

          <Form.Item name='payment_timeout_minutes' label='支付保留（分钟）' rules={[{ required: true, message: '请输入支付超时时间' }]} tooltip='未在规定时间内完成支付的订单将自动关闭'>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name='resubmission_window_hours' label='补交窗口（小时）' rules={[{ required: true, message: '请输入补交窗口' }]} tooltip='审核驳回后，考生可在此时间内重新提交材料'>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name='max_resubmissions' label='最大补交次数' rules={[{ required: true, message: '请输入最大补交次数' }]}>
            <InputNumber min={0} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name='max_material_bytes' label='单图上限（MB）' rules={[{ required: true, message: '请输入单图大小上限' }]}
            tooltip='考生上传的每张证件照最大体积'
            normalize={(v) => (v != null ? v * 1048576 : undefined)}
            getValueFromEvent={(e) => {
              const raw = typeof e?.target?.value === 'number' ? e.target.value : e
              return raw != null ? Math.round(raw / 1048576) : undefined
            }}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} placeholder='10' />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
