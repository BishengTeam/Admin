import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, DatePicker, Descriptions, Modal, Space, Tooltip, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { orderService } from '@/services/orders'
import { formatPrice } from '@/utils/format'
import type { ReconciliationData } from '@/types/order'

interface ReconciliationModalProps {
  open: boolean
  onClose: () => void
}

export default function ReconciliationModal({ open, onClose }: ReconciliationModalProps) {
  const [date, setDate] = useState<Dayjs>(dayjs())
  const [data, setData] = useState<ReconciliationData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (targetDate: Dayjs) => {
    setLoading(true)
    try {
      const result = await orderService.reconciliation(targetDate.format('YYYY-MM-DD'))
      setData(result)
    } catch (error) {
      setData(null)
      if (error instanceof Error) message.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setData(null)
      return
    }
    const today = dayjs()
    setDate(today)
    void load(today)
  }, [open, load])

  const handleDateChange = (value: Dayjs | null) => {
    if (!value) return
    setDate(value)
    void load(value)
  }

  return (
    <Modal
      title="每日对账"
      open={open}
      onCancel={onClose}
      destroyOnClose
      width={560}
      footer={<Button onClick={onClose}>关闭</Button>}
    >
      <Space style={{ marginBottom: 16 }}>
        <DatePicker value={date} allowClear={false} onChange={handleDateChange} />
        <Tooltip title="重新查询">
          <Button
            aria-label="重新查询对账"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void load(date)}
          />
        </Tooltip>
      </Space>

      {data ? (
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="对账日期">{data.date}</Descriptions.Item>
          <Descriptions.Item label="订单数">{data.order_count}</Descriptions.Item>
          <Descriptions.Item label="订单总额">{formatPrice(data.order_total)}</Descriptions.Item>
          <Descriptions.Item label="退款总额">{formatPrice(data.refund_total)}</Descriptions.Item>
          <Descriptions.Item label="净收入" span={2}>
            <strong>{formatPrice(data.net_income)}</strong>
          </Descriptions.Item>
        </Descriptions>
      ) : (
        <Alert
          type="info"
          showIcon
          message={loading ? '正在加载对账数据' : '暂无对账数据'}
        />
      )}
    </Modal>
  )
}
