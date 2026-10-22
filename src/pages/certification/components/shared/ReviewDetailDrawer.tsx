import RegistrationProcessingDrawer from './RegistrationProcessingDrawer'
import type { RegistrationPaymentSummary } from './RegistrationPayment'
import type { ReactNode } from 'react'
import { Descriptions, Space, Spin } from 'antd'

export interface ReviewDetailItem {
  label: ReactNode
  content: ReactNode
  span?: number
}

interface ReviewDetailDrawerProps {
  payment?: RegistrationPaymentSummary | null
  onRefresh: () => Promise<void>
  name?: string
  batch?: string
  registrationNo: string
  open: boolean
  onClose: () => void
  footer?: ReactNode
  statusItems: ReviewDetailItem[]
  informationItems: ReviewDetailItem[]
  materialItems: ReviewDetailItem[]
  latestReviewItems?: ReviewDetailItem[]
  materialLoading?: boolean
}

function renderItems(items: ReviewDetailItem[]) {
  return items.map((item, index) => (
    <Descriptions.Item
      key={`${String(item.label)}-${index}`}
      label={item.label}
      span={item.span}
    >
      {item.content}
    </Descriptions.Item>
  ))
}

export default function ReviewDetailDrawer({
  payment, onRefresh, name, batch,
  registrationNo,
  open,
  onClose,
  footer,
  statusItems,
  informationItems,
  materialItems,
  latestReviewItems,
  materialLoading = false,
}: ReviewDetailDrawerProps) {
  return (
    <RegistrationProcessingDrawer
      payment={payment} onRefresh={onRefresh} name={name} batch={batch} status={statusItems.find(item => item.label === '状态')?.content} registrationNo={registrationNo} loading={materialLoading}
      open={open}
      onClose={onClose}
      footer={footer}
    >
      <Space direction='vertical' size={16} style={{ width: '100%' }}>
        <Descriptions title='报考信息' column={{ xs: 1, sm: 2 }} bordered size='small'>
          {renderItems(statusItems.filter(item => item.label !== '状态'))}
        </Descriptions>

        <Descriptions title='报名信息' column={{ xs: 1, sm: 2 }} bordered size='small'>
          {renderItems(informationItems)}
        </Descriptions>

        <Descriptions title='报名材料' column={1} bordered size='small'>
          {materialLoading ? (
            <Descriptions.Item label='加载状态'>
              <Spin size='small' />
            </Descriptions.Item>
          ) : materialItems.length ? (
            renderItems(materialItems)
          ) : (
            <Descriptions.Item label='材料'>暂无材料</Descriptions.Item>
          )}
        </Descriptions>

        {latestReviewItems?.length ? (
          <Descriptions title='最新审核' column={{ xs: 1, sm: 2 }} bordered size='small'>
            {renderItems(latestReviewItems)}
          </Descriptions>
        ) : null}
      </Space>
    </RegistrationProcessingDrawer>
  )
}
