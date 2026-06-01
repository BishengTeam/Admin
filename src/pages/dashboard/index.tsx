import { Row, Col, Card, Statistic, Spin, Result, Button } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DASHBOARD_STAT_CARDS } from '@/core/constants'

export default function Dashboard() {
  const { data, loading, error, refresh } = useDashboardData()

  if (error) {
    return (
      <PageContainer title="数据看板">
        <Result
          status="error"
          title="数据加载失败"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => refresh()}>
              重试
            </Button>
          }
        />
      </PageContainer>
    )
  }

  if (loading || !data) {
    return (
      <PageContainer title="数据看板">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="数据看板">
      <Row gutter={[16, 16]}>
        {DASHBOARD_STAT_CARDS.map((card) => (
          <Col xs={12} sm={8} md={4} key={card.key}>
            <Card hoverable size="small">
              <Statistic
                title={
                  <span style={{ fontSize: 13, color: '#666' }}>
                    <span style={{ color: card.color, marginRight: 6 }}>{card.icon}</span>
                    {card.title}
                  </span>
                }
                value={card.isAmount ? (data[card.key] as number) / 100 : (data[card.key] as number)}
                precision={card.isAmount ? 2 : 0}
                prefix={card.isAmount ? '¥' : undefined}
                suffix={card.suffix}
                valueStyle={{ fontSize: 24, color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  )
}
