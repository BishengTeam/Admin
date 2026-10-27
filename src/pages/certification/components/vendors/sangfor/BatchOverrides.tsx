import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Col, DatePicker, Divider, Drawer, Dropdown, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { DownOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import { usePermission } from '@/hooks/usePermission'
import { certProductService } from '@/services/certProduct'
import { sangforService, type SangforBatch } from '@/services/sangfor'
import type { CertProduct } from '@/types/certProduct'
import { formatDate, formatPrice } from '@/utils/format'
import { BATCH_LIST_CONTEXT_KEY, BATCH_STATUS, STATUS_OPTIONS, readBatchListContext } from './presentation'

interface BatchFormValues {
  product_code: string; name: string; apply_start?: Dayjs; apply_end?: Dayjs; exam_date?: Dayjs
  fee: number; capacity: number; exam_location?: string; description?: string
}
const date = (value: string | null) => value ? formatDate(value) : '-'

export default function SangforBatchOverrides() {
  const navigate = useNavigate()
  const canWrite = usePermission('content:write')
  const context = useMemo(readBatchListContext, [])
  const [rows, setRows] = useState<SangforBatch[]>([])
  const [products, setProducts] = useState<CertProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false), [productsError, setProductsError] = useState('')
  const [productsReady, setProductsReady] = useState(false)
  const [keyword, setKeyword] = useState(context.keyword || '')
  const [productFilter, setProductFilter] = useState(context.product)
  const [statusFilter, setStatusFilter] = useState(context.status)
  const [page, setPage] = useState(context.page || 1), [pageSize, setPageSize] = useState(context.pageSize || 20)
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [open, setOpen] = useState(false), [editing, setEditing] = useState<SangforBatch | null>(null)
  const [savingAction, setSavingAction] = useState<'draft' | 'publish' | 'edit' | null>(null)
  const operationLock = useRef(false), createdDraftId = useRef<number | null>(null), generation = useRef(0)
  const productGeneration = useRef(0)
  const [createdDraft, setCreatedDraft] = useState(false)
  const [form] = Form.useForm<BatchFormValues>()
  const loadProducts = useCallback(async (selectProduct = false) => {
    const seq = ++productGeneration.current
    setProductsLoading(true); setProductsError(''); setProductsReady(false)
    try {
      const result = await certProductService.list({ type: 'sangfor', page: 1, page_size: 100 })
      if (seq !== productGeneration.current) return
      setProducts(result.items); setProductsReady(true)
      if (selectProduct) {
        const active = result.items.filter(item => item.is_active)
        const selected = form.getFieldValue('product_code')
        if (!active.some(item => item.code === selected)) form.setFieldsValue({ product_code: active.length === 1 ? active[0].code : undefined })
      }
    } catch {
      if (seq === productGeneration.current) setProductsError('产品加载失败，请重试')
    } finally { if (seq === productGeneration.current) setProductsLoading(false) }
  }, [form])
  const load = useCallback(async () => {
    const seq = ++generation.current
    setLoading(true); setError('')
    try {
      const batches = await sangforService.batches()
      if (seq === generation.current) setRows(batches)
    } catch (reason) { if (seq === generation.current) setError(reason instanceof Error ? reason.message : '批次加载失败，请重试') }
    finally { if (seq === generation.current) setLoading(false) }
  }, [])
  useEffect(() => { void load(); void loadProducts(); return () => { generation.current++; productGeneration.current++ } }, [load, loadProducts])
  const filtered = useMemo(() => rows.filter(row => (!keyword || row.name.toLowerCase().includes(keyword.trim().toLowerCase()))
    && (!productFilter || row.product_code === productFilter) && (!statusFilter || row.status === statusFilter)), [rows, keyword, productFilter, statusFilter])
  useEffect(() => { if (page > 1 && (page - 1) * pageSize >= filtered.length) setPage(Math.max(1, Math.ceil(filtered.length / pageSize))) }, [filtered.length, page, pageSize])
  const openWorkbench = (row: SangforBatch, state?: string) => {
    window.sessionStorage.setItem(BATCH_LIST_CONTEXT_KEY, JSON.stringify({ keyword, product: productFilter, status: statusFilter, page, pageSize }))
    navigate(`/admin/certification/sangfor/batches/${row.id}${state ? `?status=${state}` : ''}`, { state: { breadcrumbTitle: row.name } })
  }
  const edit = (batch: SangforBatch | null) => {
    setEditing(batch); createdDraftId.current = null; setCreatedDraft(false); form.resetFields()
    form.setFieldsValue(batch ? { product_code: batch.product_code, name: batch.name, fee: batch.price_cents / 100, capacity: batch.capacity,
      apply_start: batch.apply_start ? dayjs(batch.apply_start) : undefined, apply_end: batch.apply_end ? dayjs(batch.apply_end) : undefined,
      exam_date: batch.exam_date ? dayjs(batch.exam_date) : undefined, exam_location: batch.exam_location || '', description: batch.description || '' }
      : { capacity: 0, product_code: undefined })
    setOpen(true)
    void loadProducts(!batch)
  }
  const submit = async (action: 'draft' | 'publish' | 'edit') => {
    if (operationLock.current || (!editing && (productsLoading || !productsReady))) return
    operationLock.current = true; setSavingAction(action)
    try {
      const values = await form.validateFields()
      if (action === 'publish' && !values.exam_date) {
        form.setFields([{ name: 'exam_date', errors: ['发布前请选择考试时间'] }]); form.scrollToField('exam_date'); return
      }
      if (action === 'publish' && values.apply_end && !values.apply_end.isAfter(dayjs())) {
        form.setFields([{ name: 'apply_end', errors: ['报名截止时间必须晚于当前时间'] }]); form.scrollToField('apply_end'); return
      }
      const payload = { name: values.name.trim(), apply_start: values.apply_start?.toISOString() || null, apply_end: values.apply_end?.toISOString() || null,
        exam_date: values.exam_date?.toISOString() || null, price_cents: Math.round(values.fee * 100), capacity: values.capacity,
        exam_location: values.exam_location?.trim() || null, description: values.description?.trim() || null }
      let id = editing?.id || createdDraftId.current
      if (id) await sangforService.updateBatch(id, payload)
      else {
        const result = await sangforService.createBatch({ ...payload, product_code: values.product_code })
        id = result.id; createdDraftId.current = id; setCreatedDraft(true)
      }
      if (action === 'publish') await sangforService.batchAction(id, 'publish')
      message.success(action === 'publish' ? '批次已发布' : action === 'edit' ? '批次已更新' : '批次草稿已保存')
      setOpen(false); await load()
    } catch (reason) {
      if (!(reason as { errorFields?: unknown }).errorFields) { message.error(reason instanceof Error ? reason.message : '保存失败，请重试'); await load() }
    } finally { operationLock.current = false; setSavingAction(null) }
  }
  const act = async (row: SangforBatch, action: 'publish' | 'close') => {
    try { await sangforService.batchAction(row.id, action); message.success(action === 'publish' ? '批次已发布' : '已关闭新报名'); await load() }
    catch (reason) { message.error(reason instanceof Error ? reason.message : '操作失败') }
  }
  const confirmClose = (row: SangforBatch) => Modal.confirm({ title: '关闭报名？', content: '关闭后不再接受新报名，已有报名仍可继续核账、审核和补正。', okText: '关闭报名', cancelText: '再想想', onOk: () => act(row, 'close') })
  const columns: ColumnsType<SangforBatch> = [
    { title: '批次名称', dataIndex: 'name', width: 220, ellipsis: true, render: (value, row) => <Button type='link' size='small' onClick={() => openWorkbench(row)}>{value}</Button> },
    { title: '认证产品', dataIndex: 'product_name', width: 210, ellipsis: true, render: (value, row) => <Typography.Text ellipsis={{ tooltip: row.exam_direction }} style={{ maxWidth: 190 }}>{value}</Typography.Text> },
    { title: '状态', dataIndex: 'status', width: 100, render: value => <StatusTag status={value} map={BATCH_STATUS} /> },
    { title: '报名时间', width: 210, render: (_, row) => `${date(row.apply_start)} ~ ${date(row.apply_end)}` },
    { title: '考试时间', dataIndex: 'exam_date', width: 140, render: date },
    { title: '报名费', dataIndex: 'price_cents', width: 100, render: value => formatPrice(value) },
    { title: '名额', width: 95, render: (_, row) => `${row.enrolled}/${row.capacity || '不限'}` },
    { title: '报名办理', width: 175, render: (_, row) => <Space size={4} wrap>{[['pending_review', '待初审'], ['returned', '待补正'], ['approved', '初审通过']].map(([state, label]) =>
      <Button key={state} type='link' size='small' style={{ padding: 0, height: 22 }} onClick={() => openWorkbench(row, state)}>{label} {row.registration_counts ? row.registration_counts[state] || 0 : '-'}</Button>)}</Space> },
    { title: '操作', fixed: 'right', width: canWrite ? 180 : 100, render: (_, row) => <Space size={4}>
      <Button size='small' type='primary' ghost onClick={() => openWorkbench(row)}>管理报名</Button>
      {canWrite && ['draft', 'published'].includes(row.status) && <Dropdown trigger={['click']} menu={{ items: row.status === 'draft'
        ? [{ key: 'edit', label: '编辑批次' }, { key: 'publish', label: '发布批次' }] : [{ key: 'close', label: '关闭报名' }],
        onClick: ({ key }) => { if (key === 'edit') edit(row); if (key === 'publish') void act(row, 'publish'); if (key === 'close') void confirmClose(row) } }}>
        <Button size='small'>更多 <DownOutlined /></Button>
      </Dropdown>}
    </Space> },
  ]
  const productOptions = [...new Map([...products.map(item => [item.code, item.chinese_name] as const), ...rows.map(item => [item.product_code, item.product_name] as const)]).entries()].map(([value, label]) => ({ value, label }))
  const selectableProducts = products.filter(item => item.is_active || item.code === editing?.product_code).map(item => ({ value: item.code, label: `${item.code} · ${item.chinese_name}` }))
  if (editing && !selectableProducts.some(item => item.value === editing.product_code)) selectableProducts.push({ value: editing.product_code, label: `${editing.product_code} · ${editing.product_name}` })
  const productBlocked = !editing && (productsLoading || !productsReady)
  return <>
    <Space style={{ marginBottom: 16 }} wrap>
      <Input.Search allowClear placeholder='搜索批次名称' style={{ width: 220 }} defaultValue={keyword} onSearch={value => { setKeyword(value.trim()); setPage(1) }} />
      <Select allowClear showSearch optionFilterProp='label' placeholder='报考方向' style={{ width: 230 }} value={productFilter} options={productOptions} onChange={value => { setProductFilter(value); setPage(1) }} />
      <Select allowClear placeholder='状态' style={{ width: 130 }} value={statusFilter} options={STATUS_OPTIONS} onChange={value => { setStatusFilter(value); setPage(1) }} />
      <Button icon={<ReloadOutlined />} onClick={() => { void load(); void loadProducts(open && !editing && !createdDraft) }}>刷新</Button>
      {canWrite && <Button type='primary' icon={<PlusOutlined />} onClick={() => edit(null)}>新建批次</Button>}
    </Space>
    {error && <Alert type='error' showIcon message={error} action={<Button size='small' onClick={() => void load()}>重试</Button>} style={{ marginBottom: 16 }} />}
    <Table rowKey='id' loading={loading} dataSource={filtered} columns={columns} scroll={{ x: 1450 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='当前筛选条件下暂无考试批次' /> }}
      pagination={{ current: page, pageSize, showSizeChanger: true, showTotal: total => `共 ${total} 条`, onChange: (value, size) => { setPage(value); setPageSize(size) } }} />
    <Drawer title={editing ? `编辑深信服批次 · ${editing.name}` : '新建深信服考试批次'} open={open} onClose={() => !savingAction && setOpen(false)} width='min(820px, 94vw)' destroyOnClose
      footer={<Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button disabled={!!savingAction} onClick={() => setOpen(false)}>取消</Button>
        {!editing && <Button disabled={productBlocked || (!!savingAction && savingAction !== 'draft')} loading={savingAction === 'draft'} onClick={() => void submit('draft')}>保存草稿</Button>}
        <Button type='primary' disabled={productBlocked || (!!savingAction && savingAction === 'draft')} loading={savingAction === 'publish' || savingAction === 'edit'} onClick={() => void submit(editing ? 'edit' : 'publish')}>{editing ? '保存修改' : '保存并发布'}</Button>
      </Space>}>
      <Form form={form} layout='vertical' requiredMark='optional' scrollToFirstError>
        <Divider orientation='left' orientationMargin={0}>① 报考方向</Divider>
        {productsError && <Alert type='error' showIcon message={productsError} action={<Button size='small' onClick={() => void loadProducts(!editing && !createdDraft)}>重新加载产品</Button>} style={{ marginBottom: 16 }} />}
        <Form.Item name='product_code' label='认证产品' rules={[{ required: true, message: '请选择已启用的认证产品' }]}>
          <Select showSearch optionFilterProp='label' loading={productsLoading} disabled={!!editing || createdDraft || productBlocked} placeholder='选择认证产品及报考方向' notFoundContent={productsLoading ? '正在加载产品' : productsError ? '产品加载失败，请重试' : '请先在产品设置中启用认证产品'}
            options={selectableProducts} />
        </Form.Item>
        <Divider orientation='left' orientationMargin={0}>② 基本信息</Divider>
        <Form.Item name='name' label='批次名称' rules={[{ required: true, whitespace: true, message: '请输入批次名称' }]}><Input maxLength={128} placeholder='请输入便于识别的考试批次名称' /></Form.Item>
        <Form.Item name='description' label='报名说明'><Input.TextArea maxLength={5000} rows={3} placeholder='选填；向考生展示的批次说明' /></Form.Item>
        <Divider orientation='left' orientationMargin={0}>③ 报名安排</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={12}><Form.Item name='apply_start' label='报名开始' rules={[{ required: true, message: '请选择报名开始时间' }]}><DatePicker showTime style={{ width: '100%' }} placeholder='报名开始时间' /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name='apply_end' label='报名截止' dependencies={['apply_start']} rules={[{ required: true, message: '请选择报名截止时间' }, { validator: (_, value: Dayjs | undefined) => !value || !form.getFieldValue('apply_start') || value.isAfter(form.getFieldValue('apply_start')) ? Promise.resolve() : Promise.reject(new Error('报名截止时间必须晚于开始时间')) }]}><DatePicker showTime style={{ width: '100%' }} placeholder='报名截止时间' /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name='capacity' label='招生名额' rules={[{ required: true, message: '请输入招生名额' }]}><InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder='0为不限名额' /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name='fee' label='本批次报名费（元）' rules={[{ required: true, message: '请输入报名费用' }]}><InputNumber min={0.01} max={100000} precision={2} prefix='¥' style={{ width: '100%' }} placeholder='0.00' /></Form.Item></Col>
        </Row>
        <Divider orientation='left' orientationMargin={0}>④ 考试安排</Divider>
        <Row gutter={16}>
          <Col xs={24} sm={12}><Form.Item name='exam_date' label='考试时间' dependencies={['apply_end']} extra='草稿可暂缺；保存并发布前必须填写' rules={[{ validator: (_, value: Dayjs | undefined) => !value || !form.getFieldValue('apply_end') || !value.isBefore(form.getFieldValue('apply_end')) ? Promise.resolve() : Promise.reject(new Error('考试时间不能早于报名截止时间')) }]}><DatePicker showTime style={{ width: '100%' }} placeholder='考试时间' /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name='exam_location' label='考试地点'><Input maxLength={256} placeholder='线下考试填写地址' /></Form.Item></Col>
        </Row>
      </Form>
    </Drawer>
  </>
}
