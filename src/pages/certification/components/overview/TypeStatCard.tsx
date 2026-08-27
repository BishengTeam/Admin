import { useNavigate } from 'react-router-dom'
import { Card, Col, Row, Statistic } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import type { CertProductStats } from '@/types/certProduct'
import { CERT_TYPE_META, type CertType } from '../vendors/type-registry'

interface TypeStatCardProps {
  stats: CertProductStats
  onEnter: () => void
}

export default function TypeStatCard({ stats, onEnter }: TypeStatCardProps) {
  const meta = CERT_TYPE_META[stats.type as CertType]
  return (
    <Col xs={24} lg={12} xl={8} key={stats.type}>
      <Card hoverable onClick={onEnter} style={{ cursor: 'pointer' }}>
        <Card.Meta
          avatar={
            <div style={{
              fontSize: 24, backgroundColor: `${meta?.color}10`, width: 48, height: 48,
              lineHeight: '48px', textAlign: 'center', borderRadius: 10,
              color: meta?.color, fontWeight: 700,
            }}>
              {meta?.icon ?? stats.type[0].toUpperCase()}
            </div>
          }
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{meta?.label ?? stats.type_label}</span>
              <RightOutlined style={{ fontSize: 12, color: '#999' }} />
            </span>
          }
          description={
            <Row gutter={16}>
              <Col span={8}><Statistic title='产品' value={stats.product_count} valueStyle={{ fontSize: 20 }} /></Col>
              <Col span={8}><Statistic title='进行中批次' value={stats.active_batch_count} valueStyle={{ fontSize: 20 }} /></Col>
              <Col span={8}><Statistic title='总报名' value={stats.total_enrolled} valueStyle={{ fontSize: 20 }} /></Col>
            </Row>
          }
        />
      </Card>
    </Col>
  )
}
