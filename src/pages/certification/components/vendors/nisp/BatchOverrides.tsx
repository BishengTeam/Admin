import { useState } from 'react'
import {
  Button, DatePicker, Form, Input, InputNumber, Modal,
  Popconfirm, Select, Space, Table, Tag, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { nispService } from '@/services/nisp'
import type { NispBatch } from '@/services/nisp'
import { formatPrice, formatDate } from '@/utils/format'

const LEVEL_LABELS: Record<string, string> = {
  '1': 'NISP一级',
  '2': 'NISP二级',
}

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  registration_closed: { text: '报名关闭', color: 'orange' },
  finalized: { text: '已结束', color: 'blue' },
  archived: { text: '已归档', color: 'default' },
  cancelled: { text: '已取消', color: 'red' },
}

export default function NispBatchOverrides() {
  const [batchOpen, setBatchOpen] = useState(false)
  const [form] = Form.useForm()
  const { data, loading, pagination, refresh } = usePagination(
    (page) => nispService.listBatches(page),
    [],
  )

  const createBatch = async () => {
    let values
    try {
      values = await form.validateFields()
    } catch { return }
    try {
      await nispService.createBatch({
        ...values,
        training_start: values.training_start?.toISOString(),
        training_end: values.training_end?.toISOString(),
        level1_price_cents: Math.round(values.level1_price * 100),
        level2_price_cents: Math.round(values.level2_price * 100),
      })
      message.success('NISP 批次已创建')
      setBatchOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建失败')
    }
  }

  const columns: ColumnsType<NispBatch> = [
    { title: '批次名称', dataIndex: 'plan_name', ellipsis: true },
    {
      title: '级别',
      dataIndex: 'level',
      width: 100,
      render: (v: string) => (
        <Tag color={v === '1' ? 'blue' : 'purple'}>{LEVEL_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'plan_status',
      width: 100,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v] ?? { text: v, color: 'default' }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    { title: '报名时间', width: 200, render: (_, row) => `${row.apply_start ? formatDate(row.apply_start) : '-'} ~ ${row.apply_end ? formatDate(row.apply_end) : '-'}` },
    { title: '考试时间', dataIndex: 'exam_date', width: 120, render: (v: string) => v ? formatDate(v) : '-' },
    { title: '名额', width: 90, render: (_, row) => `${row.occupied_count}/${row.capacity}` },
    {
      title: '价格',
      width: 160,
      render: (_, row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#666' }}>一级</span>
            <span style={{ fontWeight: 500 }}>{formatPrice(row.level1_price_cents)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#666' }}>二级</span>
            <span style={{ fontWeight: 500 }}>{formatPrice(row.level2_price_cents)}</span>
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      width: 220,
      render: (_, row) => (
        <Space size={4}>
          {row.plan_status === 'draft' && (
            <Button size='small' type='primary' onClick={() => nispService.publishBatch(row.id).then(() => { message.success('已发布'); refresh() })}>
              发布
            </Button>
          )}
          {row.plan_status === 'published' && (
            <Popconfirm title="确定关闭报名？" onConfirm={() => nispService.closeRegistration(row.id).then(() => { message.success('已关闭'); refresh() })}>
              <Button size='small'>关闭报名</Button>
            </Popconfirm>
          )}
          <Button
            size='small'
            onClick={() => window.open(nispService.getExportUrl(row.id, row.level), '_blank')}
          >
            导出
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
        <Button type='primary' icon={<PlusOutlined />} onClick={() => { form.resetFields(); setBatchOpen(true) }}>
          新建批次
        </Button>
      </Space>
      <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />

      <Modal
        title="新建 NISP 考试批次"
        open={batchOpen}
        onCancel={() => setBatchOpen(false)}
        onOk={createBatch}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='plan_id' label='关联 Plan ID' rules={[{ required: true, message: '必填' }]} extra="需要先在批次管理中创建 Plan">
            <InputNumber style={{ width: '100%' }} min={1} precision={0} />
          </Form.Item>
          <Form.Item name='level' label='考试级别' rules={[{ required: true }]} initialValue='1'>
            <Select options={[{ value: '1', label: 'NISP一级' }, { value: '2', label: 'NISP二级' }]} />
          </Form.Item>
          <Form.Item name='training_org' label="培训机构">
            <Input placeholder="如：四川智天远教育科技有限公司" maxLength={128} />
          </Form.Item>
          <Form.Item name='training_address' label="培训地点">
            <Input placeholder="选填" maxLength={256} />
          </Form.Item>
          <Form.Item name='level1_price' label="NISP一级价格（元）" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name='level2_price' label="NISP二级价格（元）" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
