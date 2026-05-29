import { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Table, Spin } from 'antd'
import {
  UserOutlined, MessageOutlined, SwapOutlined,
  ShoppingCartOutlined, CheckCircleOutlined, DollarOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import { PageContainer } from '@/components/PageContainer'
import { dashboardService } from '@/services/dashboard'
import type { DashboardData, SchoolRegistration } from '@/types/dashboard'

const statCards = [
  { key: 'total_users', title: '注册用户数', icon: <UserOutlined />, color: '#1677ff' },
  { key: 'total_conversations', title: 'AI 对话次数', icon: <MessageOutlined />, color: '#52c41a' },
  { key: 'transfer_rate', title: '转人工率', icon: <SwapOutlined />, color: '#fa8c16', suffix: '%', decimal: 1 as const },
  { key: 'total_orders', title: '报名订单数', icon: <ShoppingCartOutlined />, color: '#722ed1' },
  { key: 'payment_success_rate', title: '支付成功率', icon: <CheckCircleOutlined />, color: '#13c2c2', suffix: '%', decimal: 1 as const },
  { key: 'total_revenue', title: '营收总额', icon: <DollarOutlined />, color: '#eb2f96', prefix: '¥' },
] as const

const schoolColumns: ColumnsType<SchoolRegistration> = [
  { title: '排名', dataIndex: 'rank', width: 60, align: 'center' },
  { title: '学校', dataIndex: 'school' },
  { title: '报名人数', dataIndex: 'count', width: 100, align: 'right' },
]

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    dashboardService.getData().then(setData)
  }, [])

  if (!data) {
    return (
      <PageContainer title="数据看板">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    )
  }

  const conversionOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['浏览', '加购', '下单', '支付'], bottom: 0 },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.conversion_trend.map((d) => d.date.slice(5)),
      axisLabel: { rotate: 45, fontSize: 10 },
    },
    yAxis: { type: 'value' },
    series: [
      { name: '浏览', type: 'line', data: data.conversion_trend.map((d) => d.browse), smooth: true },
      { name: '加购', type: 'line', data: data.conversion_trend.map((d) => d.cart), smooth: true },
      { name: '下单', type: 'line', data: data.conversion_trend.map((d) => d.order), smooth: true },
      { name: '支付', type: 'line', data: data.conversion_trend.map((d) => d.payment), smooth: true },
    ],
  }

  const qualityOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        data: data.quality_distribution.map((d) => ({
          value: d.value,
          name: d.name,
          itemStyle: { color: d.name === '满意' ? '#52c41a' : d.name === '一般' ? '#faad14' : '#ff4d4f' },
        })),
        label: { formatter: '{b}\n{d}%' },
      },
    ],
  }

  const revenueOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.revenue_trend.map((d) => d.date.slice(5)),
      axisLabel: { rotate: 45, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` },
    },
    series: [
      {
        type: 'bar',
        data: data.revenue_trend.map((d) => d.amount),
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
      },
    ],
  }

  return (
    <PageContainer title="数据看板">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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
                value={data.stats[card.key as keyof typeof data.stats] as number}
                precision={'decimal' in card ? card.decimal : 0}
                prefix={'prefix' in card ? card.prefix : undefined}
                suffix={'suffix' in card ? card.suffix : undefined}
                valueStyle={{ fontSize: 24, color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title="报名转化漏斗（近30日）" size="small">
            <ReactECharts option={conversionOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="AI 回答质量分布" size="small">
            <ReactECharts option={qualityOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="营收日趋势（近30日）" size="small">
            <ReactECharts option={revenueOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="竞赛报名分学校 TOP12" size="small" styles={{ body: { padding: '8px 16px' } }}>
            <Table
              rowKey="school"
              columns={schoolColumns}
              dataSource={data.school_registrations}
              pagination={false}
              size="small"
              scroll={{ y: 252 }}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}
