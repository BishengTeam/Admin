import type { ReactNode } from 'react'
import { Descriptions, Drawer, Space, Spin } from 'antd'

export interface ReviewDetailItem {
  label: ReactNode
  content: ReactNode
  span?: number
}

interface ReviewDetailDrawerProps {
  registrationNo: string
  open: boolean
  onClose: () => void
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
  registrationNo,
  open,
  onClose,
  statusItems,
  informationItems,
  materialItems,
  latestReviewItems,
  materialLoading = false,
}: ReviewDetailDrawerProps) {
  return (
    <Drawer
      title={`报名详情 - ${registrationNo}`}
      open={open}
      onClose={onClose}
      width={720}
    >
      <Space direction='vertical' size={16} style={{ width: '100%' }}>
        <Descriptions title='状态' column={2} bordered size='small'>
          {renderItems(statusItems)}
        </Descriptions>

        <Descriptions title='报名信息' column={2} bordered size='small'>
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
          <Descriptions title='最新审核' column={2} bordered size='small'>
            {renderItems(latestReviewItems)}
          </Descriptions>
        ) : null}
      </Space>
    </Drawer>
  )
}
