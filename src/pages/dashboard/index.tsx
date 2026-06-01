import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Spin, Result, Button } from 'antd'
import {
  UserOutlined,
  ShoppingCartOutlined, CheckCircleOutlined, DollarOutlined,
  RiseOutlined, CalendarOutlined, PercentageOutlined,
} from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { dashboardService } from '@/services/dashboard'
import type { DashboardData } from '@/types/dashboard'
const statCards = [
  { key: 'total_users' as const, title: '注册用户数', icon: <UserOutlined />, color: '#1677ff' },
  { key: 'total_orders' as const, title: '订单总数', icon: <ShoppingCartOutlined />, color: '#722ed1' },
  { key: 'recent_orders_30d' as const, title: '近30日订单', icon: <CalendarOutlined />, color: '#eb2f96' },
  { key: 'paid_orders' as const, title: '已支付订单', icon: <CheckCircleOutlined />, color: '#13c2c2' },
  { key: 'recent_revenue_30d_fen' as const, title: '近30日营收', icon: <RiseOutlined />, color: '#fa8c16' },
  { key: 'conversion_rate' as const, title: '付费转化率', icon: <PercentageOutlined />, color: '#52c41a', suffix: '%' },
]

const EMPTY_DATA: DashboardData = {
  total_users: 0,
  total_orders: 0,
  recent_orders_30d: 0,
  paid_orders: 0,
  revenue_fen: 0,
  recent_revenue_30d_fen: 0,
  conversion_rate: 0,
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    dashboardService
      .getData()
      .then((raw) => {
        setData({ ...EMPTY_DATA, ...raw })
      })
      .catch((err) => {
        setError(err?.message || '加载失败')
      })
  }, [retryKey])

  if (error) {
    return (
      <PageContainer title="数据看板">
        <Result
          status="error"
          title="数据加载失败"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => { setError(null); setData(null); setRetryKey((k) => k + 1); }}>
              重试
            </Button>
          }
        />
      </PageContainer>
    )
  }

  if (!data) {
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
        {statCards.map((card) => (
          <Col xs={12} sm={8} md={4} key={card.key}>
            <Card hoverable size="small">
              <Statistic
                title={
                  <span style={{ fontSize: 13, color: '#666' }}>
                    <span style={{ color: card.color, marginRight: 6 }}>{card.icon}</span>
                    {card.title}
                  </span>
                }
                value={card.key === 'recent_revenue_30d_fen' ? data[card.key] / 100 : data[card.key] as number}
                precision={card.key === 'recent_revenue_30d_fen' ? 2 : 0}
                prefix={card.key === 'recent_revenue_30d_fen' ? '¥' : undefined}
                suffix={'suffix' in card ? card.suffix : undefined}
                valueStyle={{ fontSize: 24, color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  )
}
