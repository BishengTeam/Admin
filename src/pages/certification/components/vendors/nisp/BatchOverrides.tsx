import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import {
  Alert,
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
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import {
  DownOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { ConsultationGroupDialog } from '@/components/ConsultationGroupDialog'
import { certProductService } from '@/services/certProduct'
import { nispService } from '@/services/nisp'
import type { NispBatch } from '@/services/nisp'
import type { CertProduct } from '@/types/certProduct'
import { formatDate, formatPrice } from '@/utils/format'

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

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, item]) => ({
  value,
  label: item.text,
}))

interface BatchListContext {
  keyword?: string
  level?: '1' | '2'
  status?: string
  page?: number
  scrollY?: number
}

const BATCH_LIST_CONTEXT_KEY = 'nisp.batch-list.context'

function readBatchListContext(): BatchListContext {
  try {
    const raw = window.sessionStorage.getItem(BATCH_LIST_CONTEXT_KEY)
    return raw ? JSON.parse(raw) as BatchListContext : {}
  } catch {
    return {}
  }
}

function suggestedBatchName(level: '1' | '2'): string {
  return `NISP${level === '1' ? '一' : '二'}级 · ${dayjs().format('YYYY年M月')}考试批次`
}

function currentPriceCents(batch: NispBatch): number {
  return batch.level === '1' ? batch.level1_price_cents : batch.level2_price_cents
}

function formatDateOrNull(value?: string | null): string {
  return value ? formatDate(value) : '-'
}

export default function NispBatchOverrides() {
  const navigate = useNavigate()
  const [batchOpen, setBatchOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<NispBatch | null>(null)
  const [savingAction, setSavingAction] = useState<'draft' | 'publish' | 'edit' | null>(null)
  const [qrcodeBatch, setQrcodeBatch] = useState<NispBatch | null>(null)
  const [products, setProducts] = useState<CertProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [form] = Form.useForm()
  const returnContext = useMemo(readBatchListContext, [])
  const [keyword, setKeyword] = useState<string | undefined>(returnContext.keyword)
  const [levelFilter, setLevelFilter] = useState<'1' | '2' | undefined>(returnContext.level)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(returnContext.status)

  const watchLevel = Form.useWatch('level', form) as '1' | '2' | undefined
  const watchName = Form.useWatch('name', form) as string | undefined
  const watchApplyStart = Form.useWatch('apply_start', form)
  const watchApplyEnd = Form.useWatch('apply_end', form)
  const watchExamDate = Form.useWatch('exam_date', form)
  const watchExamLocation = Form.useWatch('exam_location', form)
  const watchCapacity = Form.useWatch('capacity', form)
  const watchPrice = Form.useWatch('price', form)

  useEffect(() => {
    certProductService
      .list({ type: 'nisp', page: 1, page_size: 100 })
      .then((page) => setProducts(page.items))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false))
  }, [])

  const { data, loading, pagination, refresh } = usePagination(
    (page) => nispService.listBatches({
      ...page,
      keyword,
      level: levelFilter,
      status: statusFilter,
    }),
    [keyword, levelFilter, statusFilter],
    { initialPage: returnContext.page },
  )

  useEffect(() => {
    window.sessionStorage.removeItem(BATCH_LIST_CONTEXT_KEY)
    if (typeof returnContext.scrollY === 'number') {
      const timer = window.setTimeout(() => window.scrollTo({ top: returnContext.scrollY }), 120)
      return () => window.clearTimeout(timer)
    }
  }, [returnContext])

  const selectedProductCode = watchLevel ? `NISP-${watchLevel}` : ''
  const selectedProduct = products.find(
    (item) => item.code === selectedProductCode && item.is_active,
  )

  const defaultTrainingOrg = (level: '1' | '2') => (
    (data?.items ?? []).find((item) => item.level === level && item.training_org)?.training_org
  )

  const openCreate = () => {
    const level = '1' as const
    setEditingBatch(null)
    form.resetFields()
    form.setFieldsValue({
      level,
      name: suggestedBatchName(level),
      training_org: defaultTrainingOrg(level),
      payment_timeout_minutes: 30,
      resubmission_window_hours: 72,
      max_resubmissions: 2,
    })
    setBatchOpen(true)
  }

  const handleLevelChange = (level: '1' | '2') => {
    const otherLevel = level === '1' ? '2' : '1'
    if (!watchName || watchName === suggestedBatchName(otherLevel)) {
      form.setFieldsValue({ name: suggestedBatchName(level) })
    }
    if (!form.getFieldValue('training_org')) {
      form.setFieldsValue({ training_org: defaultTrainingOrg(level) })
    }
  }

  const validatePublishFields = (
    values: {
      apply_start?: dayjs.Dayjs
      apply_end?: dayjs.Dayjs
      exam_date?: dayjs.Dayjs | null
    },
    publish: boolean,
  ): string | null => {
    if (values.apply_start && values.apply_end && values.apply_start.isAfter(values.apply_end)) {
      return '报名开始时间必须早于截止时间'
    }
    if (
      values.exam_date
      && values.apply_end
      && values.exam_date.isBefore(values.apply_end)
    ) {
      return '考试时间不能早于报名截止时间'
    }
    if (publish && !values.exam_date) return '保存并发布前必须填写考试时间'
    return null
  }

  const submitBatch = async (action: 'draft' | 'publish' | 'edit') => {
    let values: Record<string, unknown>
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    const schedule = {
      apply_start: values.apply_start as dayjs.Dayjs | undefined,
      apply_end: values.apply_end as dayjs.Dayjs | undefined,
      exam_date: values.exam_date as dayjs.Dayjs | null | undefined,
    }
    const scheduleError = validatePublishFields(schedule, action === 'publish')
    if (scheduleError) {
      message.warning(scheduleError)
      return
    }

    const payload = {
      name: String(values.name ?? '').trim(),
      training_org: values.training_org ? String(values.training_org).trim() : undefined,
      apply_start: schedule.apply_start?.toISOString() as string,
      apply_end: schedule.apply_end?.toISOString() as string,
      exam_date: schedule.exam_date?.toISOString() ?? null,
      exam_location: values.exam_location ? String(values.exam_location).trim() : undefined,
      capacity: Number(values.capacity),
      price_cents: Math.round(Number(values.price) * 100),
      payment_timeout_minutes: values.payment_timeout_minutes == null
        ? undefined
        : Number(values.payment_timeout_minutes),
      resubmission_window_hours: values.resubmission_window_hours == null
        ? undefined
        : Number(values.resubmission_window_hours),
      max_resubmissions: values.max_resubmissions == null
        ? undefined
        : Number(values.max_resubmissions),
    }

    setSavingAction(action)
    try {
      if (editingBatch) {
        await nispService.updateBatch(editingBatch.id, payload)
        message.success('NISP 批次已更新')
      } else {
        await nispService.createFullBatch({
          ...payload,
          level: (values.level as '1' | '2') || '1',
          publish: action === 'publish',
        })
        message.success(action === 'publish' ? 'NISP 批次已创建并发布' : 'NISP 批次草稿已保存')
      }
      setBatchOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSavingAction(null)
    }
  }

  const handleEdit = (batch: NispBatch) => {
    setEditingBatch(batch)
    form.resetFields()
    form.setFieldsValue({
      level: batch.level,
      name: batch.plan_name,
      training_org: batch.training_org,
      apply_start: batch.apply_start ? dayjs(batch.apply_start) : undefined,
      apply_end: batch.apply_end ? dayjs(batch.apply_end) : undefined,
      exam_date: batch.exam_date ? dayjs(batch.exam_date) : undefined,
      exam_location: batch.exam_location,
      capacity: batch.capacity,
      price: currentPriceCents(batch) / 100,
      payment_timeout_minutes: batch.payment_timeout_minutes,
      resubmission_window_hours: batch.resubmission_window_hours,
      max_resubmissions: batch.max_resubmissions,
    })
    setBatchOpen(true)
  }

  const publishBatch = async (batch: NispBatch) => {
    try {
      await nispService.publishBatch(batch.id)
      message.success('批次已发布')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发布失败')
    }
  }

  const closeRegistration = async (batch: NispBatch) => {
    try {
      await nispService.closeRegistration(batch.id)
      message.success('报名已关闭')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '关闭报名失败')
    }
  }

  const cancelBatch = (batch: NispBatch) => {
    Modal.confirm({
      title: '取消批次并关闭报名？',
      content: '未付款报名将关闭，已付款报名将进入待退款确认。',
      okText: '取消批次',
      okButtonProps: { danger: true },
      cancelText: '再想想',
      onOk: async () => {
        try {
          await nispService.cancelBatch(batch.id)
          message.success('批次已取消，已付款报名请在退款管理中确认退款')
          refresh()
        } catch (error) {
          message.error(error instanceof Error ? error.message : '取消失败')
        }
      },
    })
  }

  const openWorkbench = (
    row: NispBatch,
    status?: 'pending_review' | 'rejected_awaiting_resubmission' | 'approved',
  ) => {
    window.sessionStorage.setItem(BATCH_LIST_CONTEXT_KEY, JSON.stringify({
      keyword,
      level: levelFilter,
      status: statusFilter,
      page: pagination.current,
      scrollY: window.scrollY,
    }))
    navigate(`/admin/certification/nisp/batches/${row.id}${status ? `?status=${status}` : ''}`, {
      state: { breadcrumbTitle: row.plan_name },
    })
  }

  const columns: ColumnsType<NispBatch> = [
    {
      title: '批次名称',
      dataIndex: 'plan_name',
      width: 220,
      ellipsis: true,
      render: (value: string, row) => (
        <Button type='link' size='small' onClick={() => openWorkbench(row)}>
          {value}
        </Button>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      width: 100,
      render: (value: string) => (
        <Tag color={value === '1' ? 'blue' : 'purple'}>{LEVEL_LABELS[value] || value}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'plan_status',
      width: 100,
      render: (value: string) => {
        const cfg = STATUS_CONFIG[value] ?? { text: value, color: 'default' }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
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
      title: '报名费',
      width: 100,
      render: (_, row) => formatPrice(currentPriceCents(row)),
    },
    {
      title: '名额',
      width: 95,
      render: (_, row) => `${row.occupied_count}/${row.capacity}`,
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
      width: 260,
      fixed: 'right',
      render: (_, row) => {
        const menuItems = [
          row.plan_status === 'draft' && {
            key: 'edit',
            label: '编辑批次',
          },
          row.plan_status === 'draft' && {
            key: 'publish',
            label: '发布批次',
          },
          row.plan_status === 'published' && {
            key: 'close',
            label: '关闭报名',
          },
          ['published', 'registration_closed'].includes(row.plan_status) && {
            key: 'cancel',
            danger: true,
            label: '取消批次',
          },
        ].filter(Boolean) as Array<{ key: string; label: string; danger?: boolean }>

        return (
          <Space size={4}>
            <Button size='small' type='primary' ghost onClick={() => openWorkbench(row)}>
              管理报名
            </Button>
            <Button
              size='small'
              onClick={() => setQrcodeBatch(row)}
            >
              咨询群码
            </Button>
            {menuItems.length > 0 && <Dropdown
              trigger={['click']}
              menu={{
                items: menuItems,
                onClick: ({ key }) => {
                  if (key === 'edit') handleEdit(row)
                  if (key === 'publish') void publishBatch(row)
                  if (key === 'close') void closeRegistration(row)
                  if (key === 'cancel') cancelBatch(row)
                },
              }}
            >
              <Button size='small'>
                更多 <DownOutlined />
              </Button>
            </Dropdown>}
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
          placeholder='级别'
          style={{ width: 120 }}
          value={levelFilter}
          onChange={setLevelFilter}
          options={[
            { value: '1', label: 'NISP一级' },
            { value: '2', label: 'NISP二级' },
          ]}
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
        <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>
          新建批次
        </Button>
      </Space>

      <Table
        rowKey='id'
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1310 }}
      />

      <Drawer
        title={editingBatch ? `编辑 NISP 批次 · ${editingBatch.plan_name}` : '新建 NISP 考试批次'}
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        width='min(820px, 94vw)'
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
          <Divider orientation='left' orientationMargin={0}>
            ① 考试级别
          </Divider>
          <Form.Item name='level' label='级别' rules={[{ required: true, message: '请选择级别' }]}>
            <Radio.Group
              disabled={Boolean(editingBatch)}
              onChange={(event) => handleLevelChange(event.target.value as '1' | '2')}
              options={[
                { value: '1', label: 'NISP 一级' },
                { value: '2', label: 'NISP 二级' },
              ]}
              optionType='button'
              buttonStyle='solid'
            />
          </Form.Item>
          <Alert
            type={productsLoading ? 'info' : selectedProduct ? 'success' : 'warning'}
            showIcon
            message={
              productsLoading
                ? '正在检查对应级别认证产品...'
                : selectedProduct
                ? `自动关联认证产品：${selectedProduct.code} · ${selectedProduct.chinese_name}`
                : `未找到已上架的 ${selectedProductCode || 'NISP'} 认证产品，请先在认证产品中配置`
            }
          />

          <Divider orientation='left' orientationMargin={0}>
            ② 基本信息
          </Divider>
          <Form.Item
            name='name'
            label='批次名称'
            rules={[{ required: true, whitespace: true, message: '请输入批次名称' }]}
          >
            <Input maxLength={128} placeholder={suggestedBatchName(watchLevel ?? '1')} />
          </Form.Item>
          <Form.Item name='training_org' label='培训机构'>
            <Input maxLength={128} placeholder='选填；将写入考生报名快照' />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0}>
            ③ 报名安排
          </Divider>
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
              <Form.Item name='capacity' label='招生名额' rules={[{ required: true, message: '请输入' }]}>
                <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder='可报名人数上限' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='price'
                label={watchLevel === '2' ? '本批次二级报名费（元）' : '本批次一级报名费（元）'}
                rules={[{ required: true, message: '请输入' }]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix='¥' placeholder='0.00' />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0}>
            ④ 考试安排
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='exam_date'
                label='考试时间'
                extra='草稿可暂缺；保存并发布前必须填写'
              >
                <DatePicker showTime style={{ width: '100%' }} placeholder='考试时间' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='exam_location' label='考试地点'>
                <Input maxLength={256} placeholder='线下考试填写地址' />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation='left' orientationMargin={0}>
            ⑤ 报名要求预览
          </Divider>
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: '#f5f7fb',
              fontSize: 13,
              lineHeight: '24px',
            }}
          >
            <div>
              <Typography.Text strong>考生需填写：</Typography.Text>
              姓名、拼音、专业、学校、身份证号、手机号、邮箱、报考省份。
            </div>
            <div>
              <Typography.Text strong>必须提交材料：</Typography.Text>
              身份证双面、证件照
              {watchLevel === '2' && '、学籍报告、NISP二级申请表'}。
            </div>
            {watchLevel === '2' && (
              <div>
                <Typography.Text strong>二级额外信息：</Typography.Text>
                性别、年龄、学历、通信地址、邮编。
              </div>
            )}
            <div>
              <Typography.Text strong>导出资料：</Typography.Text>
              NISP {watchLevel === '2' ? '二级' : '一级'}模板、汇总表和考生独立附件包。
            </div>
          </div>

          <Divider orientation='left' orientationMargin={0}>
            高级规则
          </Divider>
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
          </Row>

          <Divider orientation='left' orientationMargin={0}>
            批次摘要
          </Divider>
          <Descriptions
            size='small'
            bordered
            column={1}
            items={[
              { key: 'level', label: '级别', children: LEVEL_LABELS[watchLevel ?? '1'] },
              {
                key: 'apply',
                label: '报名时间',
                children: `${formatDateOrNull(watchApplyStart?.toISOString())} ~ ${formatDateOrNull(watchApplyEnd?.toISOString())}`,
              },
              {
                key: 'price',
                label: '报名费',
                children: watchPrice == null ? '-' : formatPrice(Math.round(watchPrice * 100)),
              },
              { key: 'capacity', label: '招生名额', children: watchCapacity ?? '-' },
              {
                key: 'exam',
                label: '考试安排',
                children: `${formatDateOrNull(watchExamDate?.toISOString())}${watchExamLocation ? ` · ${watchExamLocation}` : ''}`,
              },
            ]}
          />

          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            保存草稿不会展示到小程序；保存并发布会由后端在同一事务中创建批次、关联对应级别认证产品并校验发布信息。
          </Typography.Text>
        </Form>
      </Drawer>

      <ConsultationGroupDialog
        open={Boolean(qrcodeBatch)}
        planId={qrcodeBatch?.plan_id ?? null}
        batchName={qrcodeBatch?.plan_name ?? ''}
        onClose={() => setQrcodeBatch(null)}
      />
    </>
  )
}
