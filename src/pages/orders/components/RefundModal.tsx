import { Modal, Form, Input, Descriptions } from 'antd'
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

  if (!order) return null

  const handleSubmit = async () => {
    const { reason } = await form.validateFields()
    await orderService.refund(order.id, reason)
    onSuccess()
  }

  return (
    <Modal
      title="确认退款"
      open={!!order}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText="确认退款"
      cancelText="取消"
      okButtonProps={{ danger: true }}
    >
      <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="订单号">{order.order_no}</Descriptions.Item>
        <Descriptions.Item label="用户">{order.user_name}</Descriptions.Item>
        <Descriptions.Item label="金额">{formatPrice(order.amount)}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <StatusTag status={order.status} map={ORDER_STATUS_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="下单时间">{formatDate(order.created_at)}</Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical">
        <Form.Item name="reason" label="退款原因" rules={[requiredRule('退款原因')]}>
          <Input.TextArea rows={3} placeholder="请输入退款原因" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
