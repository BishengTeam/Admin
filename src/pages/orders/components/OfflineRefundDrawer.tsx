import { useState } from 'react'
import { Button, Drawer, Space } from 'antd'
import OfflinePaymentSection from './OfflinePaymentSection'

/** Reuse the order ledger and its existing approval, refund and exception actions. */
export default function OfflineRefundDrawer({ orderId, onClose, onChanged }: {
  orderId: number | null
  onClose: () => void
  onChanged?: () => void | Promise<void>
}) {
  const [actionsHost, setActionsHost] = useState<HTMLDivElement | null>(null)
  return <Drawer title='退款办理' open={orderId !== null} onClose={onClose} width='min(820px, 94vw)' destroyOnClose
    footer={<Space style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <Button onClick={onClose}>关闭</Button><div ref={setActionsHost} />
    </Space>}>
    {orderId !== null && <OfflinePaymentSection key={orderId} orderId={orderId} mode='order' actionContainer={actionsHost} onChanged={onChanged} />}
  </Drawer>
}
