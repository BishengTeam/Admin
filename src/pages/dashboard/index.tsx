import { Row, Col, Card, Statistic, Spin, Result, Button, Badge, Space, Typography, Progress } from 'antd'
import {
  UserOutlined, ShoppingCartOutlined, CalendarOutlined, CheckCircleOutlined,
  RiseOutlined, PercentageOutlined, BookOutlined, QuestionCircleOutlined,
  SafetyCertificateOutlined, TrophyOutlined, TeamOutlined, ReadOutlined,
  ClockCircleOutlined, FileDoneOutlined, AlertOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { PageContainer } from '@/components/PageContainer'
import { useDashboardData } from '@/hooks/useDashboardData'
import type { DashboardData, TrendPoint, PieDataItem } from '@/types/dashboard'

const { Text } = Typography

function StatCard({ title, value, icon, color, suffix, isAmount }: {
  title: string; value: number; icon: React.ReactNode; color: string; suffix?: string; isAmount?: boolean
}) {
  return (
    <Card hoverable size='small'>
      <Statistic
        title={<span style={{ fontSize: 13, color: '#666' }}><span style={{ color, marginRight: 6 }}>{icon}</span>{title}</span>}
        value={isAmount ? value / 100 : value}
        precision={isAmount ? 2 : 0}
        prefix={isAmount ? '¥' : undefined}
        suffix={suffix}
        valueStyle={{ fontSize: 24, color }}
      />
    </Card>
  )
}

function TrendChart({ title, data, color, isRevenue }: {
  title: string; data?: TrendPoint[]; color: string; isRevenue?: boolean
}) {
  const option = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0]
        return `${p.name}<br/>${title}: ${isRevenue ? `¥${(p.value / 100).toFixed(2)}` : p.value}`
      },
    },
    grid: { top: 10, right: 10, bottom: 24, left: isRevenue ? 70 : 40 },
    xAxis: {
      type: 'category' as const,
      data: (data || []).map(d => d.date.slice(5)),
      axisLabel: { fontSize: 10, color: '#999' },
      axisLine: { lineStyle: { color: '#e8e8e8' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        fontSize: 10, color: '#999',
        formatter: (v: number) => isRevenue ? (v / 100 >= 1000 ? `${(v / 100000).toFixed(0)}k` : `${(v / 100).toFixed(0)}`) : (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`),
      },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [{
      type: 'line' as const,
      data: (data || []).map(d => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 2, color },
      itemStyle: { color },
      areaStyle: {
        color: {
          type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `${color}40` },
            { offset: 1, color: `${color}05` },
          ],
        },
      },
    }],
  }

  return (
    <Card size='small' title={<Text strong style={{ fontSize: 14 }}>{title}</Text>}>
      <ReactECharts option={option} style={{ height: 220 }} notMerge />
    </Card>
  )
}

function PieChart({ title, data }: { title: string; data?: PieDataItem[] }) {
  const colors = ['#1677ff', '#722ed1', '#52c41a', '#fa8c16', '#eb2f96', '#13c2c2']
  const option = {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c}单 ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    color: colors,
    series: [{
      type: 'pie' as const,
      radius: ['40%', '65%'],
      center: ['50%', '42%'],
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: (data || []).filter(d => d.value > 0),
    }],
  }

  return (
    <Card size='small' title={<Text strong style={{ fontSize: 14 }}>{title}</Text>}>
      <ReactECharts option={option} style={{ height: 220 }} notMerge />
    </Card>
  )
}

function CertStatusCard({ title, pending, approved, color }: {
  title: string; pending: number; approved: number; color: string
}) {
  const total = pending + approved
  const rate = total > 0 ? Math.round(approved / total * 100) : 0
  return (
    <Card size='small'>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 14, color }}>{title}</Text>
        {pending > 0 && <Badge count={pending} style={{ backgroundColor: '#fa8c16' }} />}
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Progress
            percent={rate}
            strokeColor={color}
            format={() => `${approved}/${total}`}
            size='small'
          />
          <Text type='secondary' style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            通过率 {rate}%
          </Text>
        </div>
      </div>
    </Card>
  )
}

function BarChart({ title, data, color }: { title: string; data?: TrendPoint[]; color: string }) {
  const option = {
    tooltip: { trigger: 'axis' as const },
    grid: { top: 10, right: 10, bottom: 24, left: 40 },
    xAxis: {
      type: 'category' as const,
      data: (data || []).map(d => d.date.slice(5)),
      axisLabel: { fontSize: 10, color: '#999' },
      axisLine: { lineStyle: { color: '#e8e8e8' } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { fontSize: 10, color: '#999' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [{
      type: 'bar' as const,
      data: (data || []).map(d => d.value),
      itemStyle: {
        color: {
          type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color },
            { offset: 1, color: `${color}60` },
          ],
        },
        borderRadius: [3, 3, 0, 0],
      },
      barMaxWidth: 16,
    }],
  }

  return (
    <Card size='small' title={<Text strong style={{ fontSize: 14 }}>{title}</Text>}>
      <ReactECharts option={option} style={{ height: 200 }} notMerge />
    </Card>
  )
}

export default function Dashboard() {
  const { data, loading, error, refresh } = useDashboardData()

  if (error) {
    return (
      <PageContainer title='数据看板'>
        <Result status='error' title='数据加载失败' subTitle={error}
          extra={<Button type='primary' onClick={() => refresh()}>重试</Button>} />
      </PageContainer>
    )
  }

  if (loading || !data) {
    return (
      <PageContainer title='数据看板'>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size='large' />
        </div>
      </PageContainer>
    )
  }

  const d: DashboardData = data

  return (
    <PageContainer title='数据看板'>
      {/* ── 核心指标 ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='注册用户' value={d.total_users} icon={<UserOutlined />} color='#1677ff' />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='订单总数' value={d.total_orders} icon={<ShoppingCartOutlined />} color='#722ed1' />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='已支付订单' value={d.paid_orders} icon={<CheckCircleOutlined />} color='#13c2c2' />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='近30日营收' value={d.recent_revenue_30d_fen} icon={<RiseOutlined />} color='#fa8c16' isAmount />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='付费转化率' value={d.conversion_rate} icon={<PercentageOutlined />} color='#52c41a' suffix='%' />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='今日答题' value={d.quiz_attempts_today ?? 0} icon={<QuestionCircleOutlined />} color='#eb2f96' />
        </Col>
      </Row>

      {/* ── 趋势图表 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <TrendChart title='近30日营收趋势（元）' data={d.revenue_trend} color='#fa8c16' isRevenue />
        </Col>
        <Col xs={24} md={12}>
          <TrendChart title='近30日新增用户' data={d.user_trend} color='#1677ff' />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <BarChart title='近30日答题活跃度' data={d.quiz_trend} color='#722ed1' />
        </Col>
        <Col xs={24} md={12}>
          <PieChart title='已支付订单类型分布' data={d.order_type_distribution} />
        </Col>
      </Row>

      {/* ── 认证审核状态 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <CertStatusCard title='H3C 认证' pending={d.h3c_pending_review ?? 0} approved={d.h3c_approved ?? 0} color='#1677ff' />
        </Col>
        <Col xs={24} md={6}>
          <CertStatusCard title='NISP 认证' pending={d.nisp_pending_review ?? 0} approved={d.nisp_approved ?? 0} color='#52c41a' />
        </Col>
        <Col xs={24} md={6}>
          <Card size='small'>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: '#722ed1' }}>📚 课程模块</Text>
            </div>
            <Statistic title='已上线课程' value={d.courses_total ?? 0} valueStyle={{ fontSize: 22, color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size='small'>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: '#fa8c16' }}>🏆 竞赛模块</Text>
            </div>
            <Space size='large'>
              <Statistic title='进行中' value={d.competitions_active ?? 0} valueStyle={{ fontSize: 22, color: '#fa8c16' }} />
              <Statistic title='总报名' value={d.competition_registrations ?? 0} valueStyle={{ fontSize: 22, color: '#eb2f96' }} />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ── 题库概览 ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card size='small'>
            <Statistic title='已发布题库' value={d.quiz_libraries_total ?? 0} valueStyle={{ fontSize: 22, color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size='small'>
            <Statistic title='已发布题目' value={d.quiz_questions_total ?? 0} valueStyle={{ fontSize: 22, color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size='small'>
            <Statistic title='近30日答题总量' value={d.quiz_attempts_30d ?? 0} valueStyle={{ fontSize: 22, color: '#eb2f96' }} />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}
