import { useEffect, useState } from 'react'
import { Card, Col, Row, Spin, Typography } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { certProductService } from '@/services/certProduct'
import type { CertProductStats } from '@/types/certProduct'
import { CERT_TYPE_META, CERT_TYPES, type CertType } from './components/vendors/type-registry'
import TypeStatCard from './components/overview/TypeStatCard'

const { Text } = Typography

export default function CertificationOverview() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<CertProductStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    certProductService.getStats().then(setStats).finally(() => setLoading(false))
  }, [])

  return (
    <PageContainer title='认证管理'>
      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          {stats.length > 0
            ? stats.map((s) => (
                <TypeStatCard
                  key={s.type}
                  stats={s}
                  onEnter={() => navigate(s.type)}
                />
              ))
            : CERT_TYPES.map((t) => {
                const meta = CERT_TYPE_META[t]
                return (
                  <Col xs={24} lg={12} xl={8} key={t}>
                    <Card hoverable onClick={() => navigate(t)}>
                      <Card.Meta
                        avatar={
                          <div style={{
                            fontSize: 24, backgroundColor: `${meta.color}10`, width: 48, height: 48,
                            lineHeight: '48px', textAlign: 'center', borderRadius: 10,
                            color: meta.color, fontWeight: 700,
                          }}>{meta.icon}</div>
                        }
                        title={
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{meta.label}</span>
                            <RightOutlined style={{ fontSize: 12, color: '#999' }} />
                          </span>
                        }
                        description={<Text type='secondary'>暂无数据，点击进入管理</Text>}
                      />
                    </Card>
                  </Col>
                )
              })}
        </Row>
      </Spin>
    </PageContainer>
  )
}
