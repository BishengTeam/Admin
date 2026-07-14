import { useState } from 'react'
import { Modal, Form, Input, Descriptions, message } from 'antd'
import { orderService } from '@/services/orders'
import { ORDER_STATUS_MAP } from '@/core/constants'
import { formatPrice, formatDate } from '@/utils/format'
import { StatusTag } from '@/components/StatusTag'
import { requiredRule } from '@/utils/validator'
import type { Order } from '@/types/order'

interface RefundModalProps {
  order: Order | null
  onSuccess: () => void
  onCancel: () => void
}

export default function RefundModal({ order, onSuccess, onCancel }: RefundModalProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  if (!order) return null

  const isReviewReject = order.status === 'paid'

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (isReviewReject) {
        const { comment } = await form.validateFields()
        await orderService.review(order.id, 'reject', comment)
        message.success('订单已驳回并退款')
      } else {
        await orderService.refund(order.id)
        message.success('退款成功')
      }
      form.resetFields()
      onSuccess()
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title={isReviewReject ? '驳回订单' : '订单退款'}
      open={!!order}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={isReviewReject ? '驳回并退款' : '确认退款'}
      cancelText="取消"
      okButtonProps={{ danger: true, loading: submitting }}
      destroyOnClose
    >
      <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="订单号">{order.out_trade_no}</Descriptions.Item>
        <Descriptions.Item label="用户">{order.candidate_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="金额">{formatPrice(order.price)}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <StatusTag status={order.status} map={ORDER_STATUS_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="下单时间">{formatDate(order.created_at)}</Descriptions.Item>
      </Descriptions>

      {isReviewReject && (
        <Form form={form} layout="vertical">
          <Form.Item name="comment" label="驳回原因" rules={[requiredRule('驳回原因')]}>
            <Input.TextArea rows={3} placeholder="请输入驳回原因" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}
