import { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePermission } from '@/hooks/usePermission'
import { certProductService } from '@/services/certProduct'
import { sangforService, type SangforBatch } from '@/services/sangfor'
import type { CertProduct } from '@/types/certProduct'
import { formatDate, formatPrice } from '@/utils/format'

const STATUS: Record<string, string> = { draft: '草稿', published: '已发布', registration_closed: '报名已关闭', cancelled: '已取消', finalized: '已结束', archived: '已归档' }

export default function SangforBatchOverrides() {
  const navigate = useNavigate()
  const canWrite = usePermission('content:write')
  const [rows, setRows] = useState<SangforBatch[]>([])
  const [products, setProducts] = useState<CertProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SangforBatch | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [batches, page] = await Promise.all([sangforService.batches(), certProductService.list({ type: 'sangfor', page: 1, page_size: 100 })])
      setRows(batches); setProducts(page.items)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '批次加载失败，请重试') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const edit = (batch: SangforBatch | null) => {
    setEditing(batch); form.resetFields()
    form.setFieldsValue(batch ? { ...batch, fee: batch.price_cents / 100,
      apply_range: batch.apply_start && batch.apply_end ? [dayjs(batch.apply_start), dayjs(batch.apply_end)] : undefined,
      exam_date: batch.exam_date ? dayjs(batch.exam_date) : undefined } : { capacity: 0 })
    setOpen(true)
  }
  const submit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = { name: values.name.trim(), apply_start: values.apply_range?.[0].toISOString(), apply_end: values.apply_range?.[1].toISOString(),
        exam_date: values.exam_date?.toISOString(), price_cents: Math.round(values.fee * 100), capacity: values.capacity || 0,
        exam_location: values.exam_location || null, description: values.description || null }
      if (editing) await sangforService.updateBatch(editing.id, payload)
      else await sangforService.createBatch({ ...payload, product_code: values.product_code })
      message.success('批次草稿已保存'); setOpen(false); await load()
    } catch (reason) { if (!(reason as { errorFields?: unknown }).errorFields) message.error(reason instanceof Error ? reason.message : '保存失败') }
    finally { setSaving(false) }
  }
  const act = async (row: SangforBatch, action: 'publish' | 'close') => {
    try { await sangforService.batchAction(row.id, action); message.success(action === 'publish' ? '批次已发布' : '已关闭新报名'); await load() }
    catch (reason) { message.error(reason instanceof Error ? reason.message : '操作失败') }
  }
  return <>
    <Space style={{ marginBottom: 16 }}><Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button>
      {canWrite && <Button type='primary' icon={<PlusOutlined />} onClick={() => edit(null)}>新增批次</Button>}</Space>
    {error && <div role='alert' style={{ color: '#ff4d4f', marginBottom: 16 }}>{error}</div>}
    <Table rowKey='id' loading={loading} dataSource={rows} scroll={{ x: 1080 }} columns={[
      { title: '批次名称', dataIndex: 'name', width: 210 }, { title: '报考方向', dataIndex: 'exam_direction', width: 230 },
      { title: '状态', dataIndex: 'status', render: value => <Tag>{STATUS[value] || value}</Tag> },
      { title: '报名截止', dataIndex: 'apply_end', render: value => value ? formatDate(value) : '未设置' },
      { title: '考试时间', dataIndex: 'exam_date', render: value => value ? formatDate(value) : '未设置' },
      { title: '费用', dataIndex: 'price_cents', render: value => formatPrice(value) },
      { title: '人数', render: (_, row) => `${row.enrolled}/${row.capacity || '不限'}` },
      { title: '操作', fixed: 'right', width: 210, render: (_, row) => <Space size={0}>
        <Button type='link' onClick={() => navigate(`/admin/certification/sangfor/batches/${row.id}`)}>办理</Button>
        {canWrite && row.status === 'draft' && <><Button type='link' onClick={() => edit(row)}>编辑</Button><Button type='link' onClick={() => void act(row, 'publish')}>发布</Button></>}
        {canWrite && row.status === 'published' && <Button type='link' onClick={() => Modal.confirm({ title: '关闭新报名？', content: '已有报名仍可继续核账、审核和补正。', onOk: () => act(row, 'close') })}>关闭报名</Button>}
      </Space> },
    ]} />
    <Modal title={editing ? '编辑深信服批次' : '新增深信服批次'} open={open} onCancel={() => setOpen(false)} onOk={() => void submit()} confirmLoading={saving} width={640} okText='保存草稿' cancelText='取消'>
      <Form form={form} layout='vertical' preserve={false}>
        <Form.Item name='product_code' label='认证产品／报考方向' rules={[{ required: true, message: '请选择产品' }]}>
          <Select showSearch optionFilterProp='label' disabled={!!editing} options={products.filter(item => item.is_active).map(item => ({ value: item.code, label: `${item.code} · ${item.chinese_name}` }))} />
        </Form.Item>
        <Form.Item name='name' label='批次名称' rules={[{ required: true, whitespace: true, message: '请填写批次名称' }]}><Input maxLength={128} /></Form.Item>
        <Form.Item name='apply_range' label='报名时间' rules={[{ required: true, message: '请选择报名时间' }]}><DatePicker.RangePicker showTime style={{ width: '100%' }} /></Form.Item>
        <Form.Item name='exam_date' label='考试时间' rules={[{ required: true, message: '请选择考试时间' }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
        <Space align='start' style={{ width: '100%' }}><Form.Item name='fee' label='报名费（元）' rules={[{ required: true, message: '请填写费用' }]}><InputNumber min={0.01} max={100000} precision={2} /></Form.Item>
          <Form.Item name='capacity' label='名额（0为不限）'><InputNumber min={0} precision={0} /></Form.Item></Space>
        <Form.Item name='exam_location' label='考试地点'><Input maxLength={256} /></Form.Item>
        <Form.Item name='description' label='报名说明'><Input.TextArea maxLength={5000} rows={3} /></Form.Item>
      </Form>
    </Modal>
  </>
}
