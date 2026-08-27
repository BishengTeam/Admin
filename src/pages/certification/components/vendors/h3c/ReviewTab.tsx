import { useState } from 'react'
import {
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { h3cService } from '@/services/h3c'
import { formatDate, formatPrice } from '@/utils/format'
import type { CertType } from '../type-registry'
import type {
  H3cRegistration,
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

function statusTag(status: H3cRegistrationStatus) {
  const item = STATUS_LABELS[status]
  return <Tag color={item.color}>{item.text}</Tag>
}

export default function ReviewTab(_props: { type: CertType }) {
  const [type, setType] = useState<H3cRegistrationType>()
  const [status, setStatus] = useState<H3cRegistrationStatus>()
  const [selected, setSelected] = useState<H3cRegistration | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [form] = Form.useForm<{
    decision: 'approved' | 'rejected'
    reason_code?: string
    reason_detail?: string
    rejected_material_types?: string[]
  }>()
  const { data, loading, pagination, refresh } = usePagination(
    (page) => h3cService.listRegistrations({ ...page, registration_type: type, status }),
    [type, status],
  )

  const submit = async () => {
    if (!selected) return
    const values = await form.validateFields()
    await h3cService.reviewRegistration(selected.id, values)
    message.success('审核结果已提交')
    setReviewOpen(false)
    setDetailOpen(false)
    refresh()
  }

  const columns: ColumnsType<H3cRegistration> = [
    { title: '报名号', dataIndex: 'registration_no', width: 175 },
    { title: '类型', dataIndex: 'registration_type', width: 100, render: (value: H3cRegistrationType) => TYPE_LABELS[value] },
    { title: '考生', width: 100, render: (_, row) => String(row.candidate_snapshot.candidate_name ?? '-') },
    { title: '状态', dataIndex: 'status', width: 125, render: statusTag },
    { title: '金额', dataIndex: 'price_cents', width: 100, render: (value: number) => formatPrice(value) },
    { title: '提交时间', dataIndex: 'created_at', width: 165, render: (value: string) => formatDate(value) },
    {
      title: '操作',
      width: 150,
      render: (_, row) => (
        <Space>
          <Button size='small' onClick={() => { setSelected(row); setDetailOpen(true) }}>详情</Button>
          {row.status === 'pending_review' && (
            <Button size='small' type='primary' onClick={() => {
              setSelected(row)
              form.resetFields()
              form.setFieldsValue({ decision: 'approved' })
              setReviewOpen(true)
            }}>审核</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder='报名类型'
          style={{ width: 140 }}
          value={type}
          onChange={setType}
          options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Select
          allowClear
          placeholder='状态'
          style={{ width: 160 }}
          value={status}
          onChange={setStatus}
          options={Object.entries(STATUS_LABELS).map(([value, item]) => ({ value, label: item.text }))}
        />
        <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
      </Space>
      <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />

      <Drawer title='H3C 报名详情' width={720} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {selected && (
          <Space direction='vertical' size={16} style={{ width: '100%' }}>
            <Descriptions bordered size='small' column={1}>
              {Object.entries(selected.candidate_snapshot).map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>{String(value ?? '-')}</Descriptions.Item>
              ))}
            </Descriptions>
            {selected.materials.map((material) => (
              <div key={material.id}>
                <div>{material.material_type} v{material.version_no}</div>
                {material.preview_url && (
                  <img src={material.preview_url} alt={material.material_type} style={{ maxWidth: '100%', maxHeight: 280 }} />
                )}
              </div>
            ))}
          </Space>
        )}
      </Drawer>

      <Modal title='H3C 审核' open={reviewOpen} onOk={submit} onCancel={() => setReviewOpen(false)}>
        <Form form={form} layout='vertical'>
          <Form.Item name='decision' label='审核结果' rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value='approved'>通过</Radio.Button>
              <Radio.Button value='rejected'>拒绝</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => getFieldValue('decision') === 'rejected' ? (
              <>
                <Form.Item name='reason_code' label='拒绝原因' rules={[{ required: true }]}>
                  <Select options={[
                    { label: '图片模糊', value: 'image_unclear' },
                    { label: '图片不完整', value: 'image_incomplete' },
                    { label: '材料类型不匹配', value: 'material_type_mismatch' },
                    { label: '在线验证码无效', value: 'verify_code_invalid' },
                    { label: '疑似伪造材料', value: 'suspected_forged_material' },
                  ]} />
                </Form.Item>
                <Form.Item name='rejected_material_types' label='被拒绝材料' rules={[{ required: true }]}>
                  <Checkbox.Group
                    options={(selected?.materials ?? [])
                      .filter((material) => material.is_current)
                      .map((material) => ({ label: material.material_type, value: material.material_type }))}
                  />
                </Form.Item>
                <Form.Item name='reason_detail' label='补充说明'>
                  <Input.TextArea rows={3} maxLength={1000} />
                </Form.Item>
              </>
            ) : null}
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
