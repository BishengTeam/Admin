import ProductAddModal from './ProductAddModal'
/**
 * 认证批次管理 v2：跨厂商批次列表 + 编辑器
 */
import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Card, Drawer, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, TimePicker, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePermission } from '@/hooks/usePermission'
import { certProductService } from '@/services/certProduct'
import { formatDate } from '@/utils/format'
import type { CertProduct } from '@/types/certProduct'
import { batchService, type Batch, type BatchListItem } from './service'

const { Text } = Typography

const STATUS_META: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  published: { color: 'green', label: '已发布' },
  registration_closed: { color: 'orange', label: '报名关闭' },
  finalized: { color: 'blue', label: '已终审' },
  archived: { color: 'gray', label: '已归档' },
  cancelled: { color: 'red', label: '已取消' },
}

const VENDOR_LABEL: Record<string, string> = {
  h3c: 'H3C',
  nisp: 'NISP',
  renshe: '人社',
  sangfor: '深信服',
}

interface BatchFormValues {
  name: string
  apply_start?: Dayjs | null
  apply_end?: Dayjs | null
  exam_date?: Dayjs | null
  exam_location?: string
  description?: string
  contact_name?: string
  contact_phone?: string
  sort_order?: number
}

export default function BatchManagement() {
  const canWrite = usePermission('certification:manage')
  const [batches, setBatches] = useState<BatchListItem[]>([])
  const [products, setProducts] = useState<CertProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // 编辑器状态
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [editorLoading, setEditorLoading] = useState(false)

  // 创建弹窗
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<BatchFormValues>()

  const loadBatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await batchService.list({ status: statusFilter, page, page_size: 50 })
      const data = res.data ?? res
      setBatches((data as any).items ?? [])
      setTotal((data as any).total ?? 0)
    } catch (e) {
      message.error('加载批次列表失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => { loadBatches() }, [loadBatches])

  useEffect(() => {
    // catalog 接口不含 is_active/chinese_name，改用完整产品列表
    certProductService.list({ page: 1, page_size: 100 })
      .then((page) => setProducts(page.items))
      .catch(() => {})
  }, [])

  const openEditor = async (id: number) => {
    setEditorOpen(true)
    setEditorLoading(true)
    try {
      const batch = await batchService.get(id)
      setEditingBatch(batch)
    } catch {
      message.error('加载批次详情失败')
      setEditorOpen(false)
    } finally {
      setEditorLoading(false)
    }
  }

  const handleCreate = async () => {
    const values = await form.validateFields()
    setCreating(true)
    try {
      const batch = await batchService.create({
        name: values.name,
        apply_start: values.apply_start?.toISOString() ?? null,
        apply_end: values.apply_end?.toISOString() ?? null,
        exam_date: values.exam_date?.toISOString() ?? null,
        exam_location: values.exam_location,
        description: values.description,
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
        sort_order: values.sort_order ?? 0,
      })
      message.success('批次已创建')
      setCreateOpen(false)
      form.resetFields()
      loadBatches()
      openEditor(batch.id)
    } catch {
      message.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleLifecycle = async (id: number, action: 'publish' | 'close-registration' | 'finalize' | 'cancel' | 'archive') => {
    try {
      await batchService[action === 'close-registration' ? 'closeRegistration' : action](id)
      message.success('操作成功')
      loadBatches()
      if (editingBatch?.id === id) openEditor(id)
    } catch {
      message.error('操作失败')
    }
  }

  const columns: ColumnsType<BatchListItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '批次名称', dataIndex: 'name', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={STATUS_META[s]?.color}>{STATUS_META[s]?.label ?? s}</Tag>,
    },
    { title: '产品数', dataIndex: 'product_count', width: 80, align: 'center' },
    { title: '报名数', dataIndex: 'total_enrolled', width: 80, align: 'center' },
    { title: '报名开始', dataIndex: 'apply_start', width: 140, render: (v) => v ? formatDate(v, 'MM-DD HH:mm') : '-' },
    { title: '报名截止', dataIndex: 'apply_end', width: 140, render: (v) => v ? formatDate(v, 'MM-DD HH:mm') : '-' },
    { title: '考试日期', dataIndex: 'exam_date', width: 100, render: (v) => v ? formatDate(v, 'MM-DD') : '-' },
    {
      title: '操作', width: 300, render: (_, record) => {
        const s = record.status
        return (
          <Space size='small' wrap>
            <Button size='small' type='link' onClick={() => openEditor(record.id)}>编辑</Button>
            {canWrite && s === 'draft' && (
              <ConfirmButton size='small' type='link' title='发布批次' description='发布后产品和时段将锁定，确定发布？' onConfirm={() => handleLifecycle(record.id, 'publish')}>发布</ConfirmButton>
            )}
            {canWrite && s === 'published' && (
              <ConfirmButton size='small' type='link' title='关闭报名' description='关闭后用户不能再报名' onConfirm={() => handleLifecycle(record.id, 'close-registration')}>关闭报名</ConfirmButton>
            )}
            {canWrite && s === 'registration_closed' && (
              <ConfirmButton size='small' type='link' title='终审' description='终审后进入归档流程' onConfirm={() => handleLifecycle(record.id, 'finalize')}>终审</ConfirmButton>
            )}
            {canWrite && (s === 'draft' || s === 'published' || s === 'registration_closed') && (
              <Popconfirm title='确定取消该批次？已有订单需另行处理。' onConfirm={() => handleLifecycle(record.id, 'cancel')}>
                <Button size='small' type='link' danger>取消</Button>
              </Popconfirm>
            )}
            {canWrite && (s === 'finalized' || s === 'cancelled') && (
              <Button size='small' type='link' onClick={() => handleLifecycle(record.id, 'archive')}>归档</Button>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <PageContainer title='认证批次管理'>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            allowClear placeholder='状态筛选'
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
          />
          <Button icon={<ReloadOutlined />} onClick={loadBatches}>刷新</Button>
          {canWrite && (
            <Button type='primary' icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建批次</Button>
          )}
        </Space>

        <Table
          rowKey='id'
          columns={columns}
          dataSource={batches}
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 50,
            onChange: setPage,
            showTotal: (t) => `共 ${t} 个批次`,
          }}
        />
      </Card>

      {/* 创建弹窗 */}
      <Modal
        title='创建认证批次'
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        confirmLoading={creating}
        width={560}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='name' label='批次名称' rules={[{ required: true, message: '请输入批次名称' }]}>
            <Input placeholder='如：2026年11月第一批' maxLength={128} />
          </Form.Item>
          <Form.Item name='apply_start' label='报名开始时间'>
            <Input placeholder='创建后可设置' disabled />
          </Form.Item>
          <Text type='secondary'>创建后进入编辑器添加产品、时段和时间窗口。</Text>
        </Form>
      </Modal>

      {/* 批次编辑器 */}
      <Drawer
        title={editingBatch ? `批次：${editingBatch.name}` : '批次编辑'}
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingBatch(null) }}
        width={960}
        destroyOnClose
      >
        {editorLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Text type='secondary'>加载中...</Text></div>
        ) : editingBatch ? (
          <BatchEditor batch={editingBatch} products={products} canWrite={canWrite && editingBatch.status === 'draft'} onChanged={() => openEditor(editingBatch.id)} />
        ) : (
          <Empty description='未选择批次' />
        )}
      </Drawer>
    </PageContainer>
  )
}

// ============================================================
// 批次编辑器（Drawer 内嵌）
// ============================================================

import { List, Tooltip } from 'antd'
import { DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons'

function BatchEditor({ batch, products, canWrite, onChanged }: {
  batch: Batch
  products: CertProduct[]
  canWrite: boolean
  onChanged: () => void
}) {
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [addSegmentOpen, setAddSegmentOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [productCapacity, setProductCapacity] = useState(0)
  const [segmentLabel, setSegmentLabel] = useState('')
  const [segmentStart, setSegmentStart] = useState<Dayjs | null>(null)
  const [segmentEnd, setSegmentEnd] = useState<Dayjs | null>(null)

  const availableProducts = products.filter(
    (p) => p.is_active && !batch.products.some((bp) => bp.product_id === p.id)
  )

  const handleAddProduct = async (payload: Record<string, unknown>) => {
    try {
      await batchService.addProduct(batch.id, payload as any)
      message.success('产品已添加')
      onChanged()
    } catch (e: any) {
      message.error(e?.response?.data?.message || '添加失败')
      throw e
    }
  }

  const handleAddSegment = async () => {
    if (!segmentLabel || !segmentStart || !segmentEnd) return
    try {
      await batchService.addTimeSegment(batch.id, {
        label: segmentLabel,
        start_time: segmentStart.format('HH:mm'),
        end_time: segmentEnd.format('HH:mm'),
        sort_order: batch.time_segments.length,
      })
      message.success('时段已添加')
      setAddSegmentOpen(false)
      setSegmentLabel('')
      setSegmentStart(null)
      setSegmentEnd(null)
      onChanged()
    } catch {
      message.error('添加失败')
    }
  }

  return (
    <Space direction='vertical' style={{ width: '100%' }} size='large'>
      {/* 基本信息 */}
      <Card title='基本信息' size='small'>
        <Space wrap>
          <Tag color={STATUS_META[batch.status]?.color}>{STATUS_META[batch.status]?.label}</Tag>
          <Text>报名：{batch.apply_start ? formatDate(batch.apply_start, 'MM-DD HH:mm') : '-'} ~ {batch.apply_end ? formatDate(batch.apply_end, 'MM-DD HH:mm') : '-'}</Text>
          <Text>考试：{batch.exam_date ? formatDate(batch.exam_date, 'YYYY-MM-DD') : '-'}</Text>
          {batch.exam_location && <Text>地点：{batch.exam_location}</Text>}
          {batch.contact_name && <Text>联系人：{batch.contact_name}</Text>}
        </Space>
      </Card>

      {/* 考试时段 */}
      <Card
        title='考试时段' size='small'
        extra={canWrite && <Button size='small' icon={<PlusOutlined />} onClick={() => setAddSegmentOpen(true)}>添加</Button>}
      >
        {batch.time_segments.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无时段' />
        ) : (
          <List
            size='small'
            dataSource={batch.time_segments}
            renderItem={(seg) => (
              <List.Item
                actions={canWrite ? [
                  <Popconfirm key='del' title='确定删除？' onConfirm={async () => {
                    await batchService.removeTimeSegment(batch.id, seg.id)
                    message.success('已删除')
                    onChanged()
                  }}>
                    <Button size='small' type='text' danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ] : undefined}
              >
                <Space>
                  <ClockCircleOutlined />
                  <Text strong>{seg.label}</Text>
                  <Text type='secondary'>{seg.start_time} ~ {seg.end_time}</Text>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 产品列表 */}
      <Card
        title='批次产品' size='small'
        extra={
          <Space>
            <Badge count={batch.products.length} />
            {canWrite && <Button size='small' icon={<PlusOutlined />} onClick={() => setAddProductOpen(true)}>添加产品</Button>}
          </Space>
        }
      >
        {batch.products.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无产品' />
        ) : (
          <Table
            rowKey='id'
            size='small'
            dataSource={batch.products}
            pagination={false}
            columns={[
              { title: '厂商', dataIndex: 'product_type', width: 80, render: (t) => <Tag>{VENDOR_LABEL[t] ?? t}</Tag> },
              { title: '产品', dataIndex: 'product_name' },
              { title: '编码', dataIndex: 'product_code', width: 120 },
              { title: '容量', dataIndex: 'capacity', width: 80, render: (c) => c === 0 ? '不限' : c },
              { title: '已报', dataIndex: 'enrolled', width: 70 },
              { title: '剩余', dataIndex: 'remaining', width: 70, render: (r) => r === null ? '不限' : r },
              ...(canWrite ? [{
                title: '操作', width: 70,
                render: (_: unknown, record: Batch['products'][0]) => (
                  <Popconfirm title='确定移除？' onConfirm={async () => {
                    await batchService.removeProduct(batch.id, record.id)
                    message.success('已移除')
                    onChanged()
                  }}>
                    <Button size='small' type='text' danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ),
              }] : []),
            ]}
          />
        )}
      </Card>

      {/* 添加产品弹窗 */}
      <ProductAddModal open={addProductOpen} onClose={() => setAddProductOpen(false)} onAdd={handleAddProduct} products={products} batchId={batch.id} />

      {/* 添加时段弹窗 */}
      <Modal title='添加考试时段' open={addSegmentOpen} onOk={handleAddSegment} onCancel={() => setAddSegmentOpen(false)}>
        <Space direction='vertical' style={{ width: '100%' }} size='middle'>
          <Input placeholder='时段标签（如：上午场）' value={segmentLabel} onChange={(e) => setSegmentLabel(e.target.value)} maxLength={32} />
          <Space>
            <TimePicker value={segmentStart} onChange={setSegmentStart} format='HH:mm' placeholder='开始' minuteStep={30} />
            <Text>~</Text>
            <TimePicker value={segmentEnd} onChange={setSegmentEnd} format='HH:mm' placeholder='结束' minuteStep={30} />
          </Space>
        </Space>
      </Modal>
    </Space>
  )
}
