import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space,
  Table, Tag, Tooltip, Upload, message,
} from 'antd'
import { DeleteOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import request from '@/core/request'
import { h3cService } from '@/services/h3c'
import { nispService } from '@/services/nisp'
import { rensheService } from '@/services/renshe'
import { sangforService } from '@/services/sangfor'
import type { CertType } from '../vendors/type-registry'

interface Attachment {
  id: number
  vendor: string
  plan_id: number | null
  schedule_id: number | null
  title: string
  file_url: string
  file_size: number | null
  sort_order: number
}

interface Option { value: number; label: string }

const VENDOR_LABELS: Record<string, string> = {
  h3c: 'H3C', nisp: 'NISP', renshe: '职业技能等级认证', sangfor: '深信服',
}

function scopeLabel(item: Attachment) {
  if (item.plan_id) return <Tag color='blue'>批次 #{item.plan_id}</Tag>
  if (item.schedule_id) return <Tag color='purple'>考场 #{item.schedule_id}</Tag>
  return <Tag>厂商级</Tag>
}

function formatSize(size: number | null) {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export default function CertAttachmentManager({ type = 'sangfor' }: { type?: CertType }) {
  const vendor = type as string
  const [rows, setRows] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState<Option[]>([])
  const [schedules, setSchedules] = useState<Option[]>([])
  const [form] = Form.useForm()
  const scope = Form.useWatch('scope', form) as string | undefined

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await request.get(`/admin/cert-attachments?vendor=${encodeURIComponent(vendor)}`)
      setRows(Array.isArray(payload) ? payload as Attachment[] : [])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '附件加载失败')
    } finally {
      setLoading(false)
    }
  }, [vendor])

  const loadOptions = useCallback(async () => {
    try {
      let planOptions: Option[] = []
      if (vendor === 'h3c') {
        const result = await h3cService.listBatches({ page: 1, page_size: 100 })
        planOptions = result.items.map(batch => ({
          value: batch.plan_id,
          label: `${batch.name}（Plan #${batch.plan_id}${batch.product_codes?.length ? ` · ${batch.product_codes.join('/')}` : ''}）`,
        }))
      } else if (vendor === 'nisp') {
        const result = await nispService.listBatches({ page: 1, page_size: 100 })
        planOptions = result.items.map(batch => ({
          value: batch.plan_id,
          label: `${batch.plan_name}（Plan #${batch.plan_id} · ${batch.level}级）`,
        }))
      } else if (vendor === 'renshe') {
        planOptions = (await rensheService.listBatches()).map(plan => ({
          value: plan.id,
          label: `${plan.name}（#${plan.id}）`,
        }))
      } else {
        const rows = await sangforService.batches()
        planOptions = rows.map(batch => ({
          value: batch.id,
          label: `${batch.name}（#${batch.id}）`,
        }))
      }
      setPlans([...new Map(planOptions.map(item => [item.value, item])).values()])
      const scheduleRows = ['h3c', 'sangfor'].includes(vendor)
        ? await request.get(
          `/admin/h3c/exam-schedules?vendor=${encodeURIComponent(vendor)}`,
        ).then(payload => Array.isArray(payload) ? payload as Array<{
          id: number; name: string; status: string
        }> : [])
        : []
      setSchedules(scheduleRows.map(item => ({
        value: item.id,
        label: `${item.name}（#${item.id} · ${item.status}）`,
      })))
    } catch {
      // 选项加载失败不阻断已存在附件列表的查看。
    }
  }, [vendor])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadOptions() }, [loadOptions])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ scope: 'vendor', sort_order: 0 })
    setOpen(true)
  }

  const submit = async () => {
    const values = await form.validateFields()
    if (!values.file?.url) {
      message.warning('请先上传文件')
      return
    }
    setSaving(true)
    try {
      await request.post('/admin/cert-attachments', {
        vendor,
        title: values.title?.trim() || values.file.filename,
        file_url: values.file.url,
        file_size: values.file.size ?? null,
        sort_order: values.sort_order ?? 0,
        plan_id: values.scope === 'plan' ? values.plan_id : null,
        schedule_id: values.scope === 'schedule' ? values.schedule_id : null,
      })
      message.success('附件已添加')
      setOpen(false)
      await load()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const columns = useMemo(() => [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '作用域', width: 130, render: (_: unknown, item: Attachment) => scopeLabel(item) },
    {
      title: '文件',
      render: (_: unknown, item: Attachment) => (
        <a href={item.file_url} target='_blank' rel='noreferrer'>{item.file_url.split('/').pop()}</a>
      ),
    },
    { title: '大小', width: 100, render: (_: unknown, item: Attachment) => formatSize(item.file_size) },
    { title: '排序', dataIndex: 'sort_order', width: 80 },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, item: Attachment) => (
        <Popconfirm
          title='删除该附件？'
          onConfirm={async () => {
            try {
              await request.delete(`/admin/cert-attachments/${item.id}`)
              message.success('已删除')
              await load()
            } catch (error) {
              message.error(error instanceof Error ? error.message : '删除失败')
            }
          }}
        >
          <Tooltip title='删除附件'>
            <Button size='small' type='text' danger aria-label={`删除附件 ${item.title}`} icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ], [load])

  return (
    <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button>
        <Button type='primary' onClick={openCreate}>新增附件</Button>
        <Tag color='blue'>{VENDOR_LABELS[vendor] ?? vendor}</Tag>
      </Space>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title='新增附件'
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void submit()}
        confirmLoading={saving}
        width={620}
        destroyOnHidden
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='scope' label='作用域' rules={[{ required: true }]}>
            <Select options={[
              { value: 'vendor', label: '厂商级（报名与预约都展示）' },
              { value: 'plan', label: '批次级（报名阶段）' },
              ...(['h3c', 'sangfor'].includes(vendor)
                ? [{ value: 'schedule', label: '考场级（预约阶段）' }]
                : []),
            ]} />
          </Form.Item>
          {scope === 'plan' && (
            <Form.Item name='plan_id' label='批次' rules={[{ required: true, message: '请选择批次' }]}>
              <Select showSearch optionFilterProp='label' options={plans} placeholder='搜索批次' />
            </Form.Item>
          )}
          {scope === 'schedule' && (
            <Form.Item name='schedule_id' label='考场计划' rules={[{ required: true, message: '请选择考场计划' }]}>
              <Select showSearch optionFilterProp='label' options={schedules} placeholder='搜索考场计划' />
            </Form.Item>
          )}
          <Form.Item
            name='file'
            label='文件'
            rules={[{ required: true, message: '请上传文件' }]}
            valuePropName='file'
          >
            <Upload
              maxCount={1}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const data = new FormData()
                  data.append('file', file as File)
                  const uploaded = await request.post(
                    `/admin/cert-attachments/upload?vendor=${encodeURIComponent(vendor)}`,
                    data,
                  ) as { url: string; filename: string; size: number }
                  form.setFieldValue('file', uploaded)
                  if (!form.getFieldValue('title')) {
                    form.setFieldValue('title', uploaded.filename)
                  }
                  onSuccess?.(uploaded)
                } catch (error) {
                  onError?.(error as Error)
                  message.error('上传失败')
                }
              }}
            >
              <Button icon={<UploadOutlined />}>选择文件（≤20MB）</Button>
            </Upload>
          </Form.Item>
          <Form.Item name='title' label='标题'>
            <Input maxLength={128} placeholder='默认使用文件名' />
          </Form.Item>
          <Form.Item name='sort_order' label='排序（越小越靠前）'>
            <InputNumber min={0} precision={0} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
