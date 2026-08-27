import { useState } from 'react'
import {
  Button,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { h3cService } from '@/services/h3c'
import { formatDate } from '@/utils/format'
import type { CertType } from '../type-registry'
import type {
  H3cExportJob,
  H3cRegistrationStatus,
  H3cRegistrationType,
} from '@/types/h3c'

const TYPE_LABELS: Record<H3cRegistrationType, string> = {
  coupon: '考券报名',
  student: '学生报名',
  full: '全额报名',
}

const STATUS_LABELS: Record<H3cRegistrationStatus, { text: string; color: string }> = {
  pending_payment: { text: '待支付', color: 'orange' },
  pending_review: { text: '待审核', color: 'blue' },
  rejected_awaiting_resubmission: { text: '等待补交', color: 'red' },
  pending_refund_confirmation: { text: '待确认退款', color: 'volcano' },
  refund_processing: { text: '退款中', color: 'processing' },
  approved: { text: '审核通过', color: 'green' },
  refunded_closed: { text: '已退款关闭', color: 'default' },
  cancelled: { text: '已取消', color: 'default' },
}

export default function ExportTab(_props: { type: CertType }) {
  const { data, loading, pagination, refresh } = usePagination(
    (page) => h3cService.listExports(page),
    [],
  )
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<{
    batch_id: number
    registration_type: H3cRegistrationType
    artifact_type: 'embedded_xlsx' | 'images_zip'
    include_statuses: H3cRegistrationStatus[]
  }>()
  const { ensureReauthenticated, reauthDialog } = useReauthentication()

  const submit = async () => {
    const values = await form.validateFields()
    await h3cService.createExport(values)
    message.success('导出任务已创建')
    setOpen(false)
    refresh()
  }
  const download = async (id: number) => {
    const token = await ensureReauthenticated()
    if (!token) throw new Error('请重新验证管理员密码')
    const result = await h3cService.getExportUrl(id, token)
    window.open(result.url, '_blank', 'noopener,noreferrer')
  }
  const columns: ColumnsType<H3cExportJob> = [
    { title: '任务', dataIndex: 'id', width: 80 },
    { title: '批次', dataIndex: 'batch_id', width: 90 },
    { title: '类型', dataIndex: 'registration_type', width: 100, render: (value: H3cRegistrationType) => TYPE_LABELS[value] },
    { title: '产物', dataIndex: 'artifact_type', width: 110, render: (value: string) => (value === 'embedded_xlsx' ? '内嵌 Excel' : '图片 ZIP') },
    { title: '数量', dataIndex: 'registration_count', width: 80 },
    { title: '状态', dataIndex: 'status', width: 100 },
    { title: '完成时间', dataIndex: 'finished_at', width: 165, render: (value: string | null) => value ? formatDate(value) : '-' },
    {
      title: '操作',
      width: 100,
      render: (_, row) => row.status === 'succeeded' && row.storage_key ? (
        <Button size='small' onClick={() => download(row.id)}>下载</Button>
      ) : '-',
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
        <Button type='primary' icon={<PlusOutlined />} onClick={() => {
          form.resetFields()
          form.setFieldsValue({ artifact_type: 'embedded_xlsx', include_statuses: ['approved'] })
          setOpen(true)
        }}>新建导出</Button>
      </Space>
      <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />
      <Modal title='新建 H3C 导出' open={open} onOk={submit} onCancel={() => setOpen(false)}>
        <Form form={form} layout='vertical'>
          <Form.Item name='batch_id' label='批次 ID' rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name='registration_type' label='报名类型' rules={[{ required: true }]}>
            <Select options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name='artifact_type' label='产物类型' rules={[{ required: true }]}>
            <Select options={[
              { label: '图片内嵌 Excel', value: 'embedded_xlsx' },
              { label: '纯图片 ZIP', value: 'images_zip' },
            ]} />
          </Form.Item>
          <Form.Item name='include_statuses' label='导出状态' rules={[{ required: true }]}>
            <Select mode='multiple' options={Object.entries(STATUS_LABELS).map(([value, item]) => ({ value, label: item.text }))} />
          </Form.Item>
        </Form>
      </Modal>
      {reauthDialog}
    </>
  )
}
