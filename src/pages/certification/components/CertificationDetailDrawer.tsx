import { Descriptions, Drawer, Tabs, Tag, Typography } from 'antd'
import type { TabsProps } from 'antd'
import { formatDate, formatPrice } from '@/utils/format'
import type { Certification } from '@/types/certification'
import PlanManagement from './PlanManagement'

const { Paragraph, Text } = Typography

interface CertificationDetailDrawerProps {
  open: boolean
  certification: Certification | null
  activeKey: string
  onTabChange: (key: string) => void
  onClose: () => void
}

function renderStatus(isActive: boolean) {
  return isActive ? <Tag color="green">已上架</Tag> : <Tag color="default">已下架</Tag>
}

export default function CertificationDetailDrawer({
  open,
  certification,
  activeKey,
  onTabChange,
  onClose,
}: CertificationDetailDrawerProps) {
  const items: TabsProps['items'] = certification
    ? [
        {
          key: 'basic',
          label: '基本信息',
          children: (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="认证代码">{certification.code}</Descriptions.Item>
              <Descriptions.Item label="厂商">{certification.vendor}</Descriptions.Item>
              <Descriptions.Item label="普通价格">{formatPrice(certification.normal_price)}</Descriptions.Item>
              <Descriptions.Item label="学生价格">{formatPrice(certification.student_price)}</Descriptions.Item>
              <Descriptions.Item label="上架状态">{renderStatus(certification.is_active)}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(certification.created_at)}</Descriptions.Item>
              <Descriptions.Item label="更新时间" span={2}>{formatDate(certification.updated_at)}</Descriptions.Item>
            </Descriptions>
          ),
        },
        {
          key: 'plans',
          label: '批次管理',
          children: <PlanManagement certification={certification} />,
        },
        {
          key: 'prices',
          label: '价格配置',
          children: (
            <div>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="普通价格">{formatPrice(certification.normal_price)}</Descriptions.Item>
                <Descriptions.Item label="学生价格">{formatPrice(certification.student_price)}</Descriptions.Item>
              </Descriptions>
              <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
                <Text type="secondary">当前价格随认证基础信息维护，批次只负责报名开放时间、考试时间和名额。</Text>
              </Paragraph>
            </div>
          ),
        },
      ]
    : []

  return (
    <Drawer
      title={certification ? `认证详情：${certification.code}` : '认证详情'}
      open={open}
      onClose={onClose}
      width={960}
      destroyOnClose
    >
      {certification && <Tabs activeKey={activeKey} onChange={onTabChange} items={items} />}
    </Drawer>
  )
}
