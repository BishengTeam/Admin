import { Row, Col, Card, Statistic, Spin, Result, Button, Space, Typography } from 'antd'
import {
  UserOutlined, ShoppingCartOutlined, CheckCircleOutlined,
  RiseOutlined, PercentageOutlined, QuestionCircleOutlined,
  CommentOutlined, CustomerServiceOutlined, PayCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAuthStore } from '@/stores/authStore'
import { checkPermissionOneOf } from '@/core/permission'
import type { DashboardData, TrendPoint, PieDataItem } from '@/types/dashboard'

const { Text } = Typography

/** 可下钻卡片右上角的轻量提示 */
function DrillHint() {
  return <span style={{ float: 'right', color: '#bfbfbf', fontWeight: 400 }}>查看 ›</span>
}

function StatCard({ title, value, icon, color, suffix, isAmount, onClick }: {
  title: string; value: number | '—'; icon: React.ReactNode; color: string; suffix?: string; isAmount?: boolean;
  onClick?: () => void
}) {
  return (
    <Card hoverable={Boolean(onClick)} onClick={onClick} size='small' style={onClick ? { cursor: 'pointer' } : undefined}>
      <Statistic
        title={
          <span style={{ fontSize: 13, color: '#666' }}>
            <span style={{ color, marginRight: 6 }}>{icon}</span>{title}
            {onClick && <DrillHint />}
          </span>
        }
        value={isAmount && typeof value === 'number' ? value / 100 : value}
        precision={isAmount || suffix === '%' ? 2 : 0}
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

function CertStatusCard({ title, pending, approved, finalApproved, color, onClick }: {
  title: string; pending: number; approved: number; finalApproved?: number; color: string; onClick?: () => void
}) {
  return (
    <Card
      hoverable={Boolean(onClick)}
      onClick={onClick}
      size='small'
      style={onClick ? { cursor: 'pointer' } : undefined}
      title={<Text strong style={{ color }}>{title}{onClick && <DrillHint />}</Text>}
    >
      <Space direction='vertical' size={4}>
        <Text>待初审 {pending} 人</Text>
        <Text>初审通过 {approved} 人</Text>
        <Text>终审通过 {finalApproved === undefined ? '—' : finalApproved + ' 人'}</Text>
      </Space>
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
  const navigate = useNavigate()
  const permissions = useAuthStore((state) => state.permissions)

  /** 有权限才可下钻；无权限的卡片保持纯展示，避免跳到 403 */
  const go = (path: string, codes: string[]) =>
    checkPermissionOneOf(permissions, codes) ? () => navigate(path) : undefined

  const goUsers = go('/admin/users', ['user:list'])
  const goOrders = go('/admin/orders', ['order:list'])
  const goTickets = go('/admin/tickets', ['user:list'])
  const goQuizWorkbench = go('/admin/quiz/questions', ['quiz:list'])
  const goQuizStats = go('/admin/quiz/stats', ['quiz:list'])
  const goCourses = go('/admin/courses/list', ['course:read'])
  const goCompetitions = go('/admin/operations/competitions', ['competition:list'])

  if (error) {
    return (
      <PageContainer title='数据概览'>
        <Result status='error' title='数据加载失败' subTitle={error}
          extra={<Button type='primary' onClick={() => refresh()}>重试</Button>} />
      </PageContainer>
    )
  }

  if (loading || !data) {
    return (
      <PageContainer title='数据概览'>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size='large' />
        </div>
      </PageContainer>
    )
  }

  const d: DashboardData = data

  return (
    <PageContainer title='数据概览'>
      {/* ── 核心指标 ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='注册用户' value={d.total_users} icon={<UserOutlined />} color='#1677ff' onClick={goUsers} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='订单总数' value={d.total_orders} icon={<ShoppingCartOutlined />} color='#722ed1' onClick={goOrders} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='已支付及完成订单' value={d.paid_orders} icon={<CheckCircleOutlined />} color='#13c2c2' onClick={goOrders} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='近30日净收款' value={d.recent_revenue_30d_fen} icon={<RiseOutlined />} color='#fa8c16' isAmount onClick={goOrders} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='已支付及完成订单占比' value={d.conversion_rate} icon={<PercentageOutlined />} color='#52c41a' suffix='%' onClick={goOrders} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title='今日练习答题' value={d.quiz_attempts_today ?? 0} icon={<QuestionCircleOutlined />} color='#eb2f96' onClick={goQuizStats} />
        </Col>
      </Row>

      {/* ── AI 客服与订单 ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={6}>
          <StatCard title='AI 对话量（近30日）' value={d.ai_conversations_30d ?? 0} icon={<CommentOutlined />} color='#2f54eb' onClick={goUsers} />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard title='AI 对话量（累计）' value={d.ai_conversations_total ?? 0} icon={<CommentOutlined />} color='#2f54eb' onClick={goUsers} />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard title='待人工工单' value={d.tickets_waiting_manual ?? 0} icon={<CustomerServiceOutlined />} color='#fa541c' onClick={goTickets} />
        </Col>
        <Col xs={12} sm={8} md={6}>
          <StatCard title='已退款订单' value={d.refunded_orders ?? '—'} icon={<PayCircleOutlined />} color='#52c41a' onClick={goOrders} />
        </Col>
      </Row>

      {/* ── 趋势图表 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <TrendChart title='近30日净收款趋势（元）' data={d.revenue_trend} color='#fa8c16' isRevenue />
        </Col>
        <Col xs={24} md={12}>
          <TrendChart title='近30日新增用户' data={d.user_trend} color='#1677ff' />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <BarChart title='近30日练习答题量' data={d.quiz_trend} color='#722ed1' />
        </Col>
        <Col xs={24} md={12}>
          <PieChart title='已支付及完成订单类型分布' data={d.order_type_distribution} />
        </Col>
      </Row>

      {/* ── 认证审核状态 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <CertStatusCard
            title='H3C 认证'
            pending={d.h3c_pending_review ?? 0}
            approved={d.h3c_approved ?? 0}
            finalApproved={d.cert_status?.h3c?.final_approved}
            color='#1677ff'
            onClick={go('/admin/certification/h3c', ['h3c:review'])}
          />
        </Col>
        <Col xs={24} md={6}>
          <CertStatusCard
            title='NISP 认证'
            pending={d.nisp_pending_review ?? 0}
            approved={d.nisp_approved ?? 0}
            finalApproved={d.cert_status?.nisp?.final_approved}
            color='#52c41a'
            onClick={go('/admin/certification/nisp', ['nisp:review'])}
          />
        </Col>
        <Col xs={24} md={6}>
          <Card
            size='small'
            hoverable={Boolean(goCourses)}
            onClick={goCourses}
            style={goCourses ? { cursor: 'pointer' } : undefined}
          >
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: '#722ed1' }}>📚 课程模块{goCourses && <DrillHint />}</Text>
            </div>
            <Statistic title='已发布课程' value={d.courses_total ?? 0} valueStyle={{ fontSize: 22, color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card
            size='small'
            hoverable={Boolean(goCompetitions)}
            onClick={goCompetitions}
            style={goCompetitions ? { cursor: 'pointer' } : undefined}
          >
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: '#fa8c16' }}>🏆 竞赛模块{goCompetitions && <DrillHint />}</Text>
            </div>
            <Space size='large'>
              <Statistic title='已发布' value={d.competitions_active ?? 0} valueStyle={{ fontSize: 22, color: '#fa8c16' }} />
              <Statistic title='总报名' value={d.competition_registrations ?? 0} valueStyle={{ fontSize: 22, color: '#eb2f96' }} />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ── 题库概览 ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card
            size='small'
            hoverable={Boolean(goQuizWorkbench)}
            onClick={goQuizWorkbench}
            style={goQuizWorkbench ? { cursor: 'pointer' } : undefined}
          >
            <Statistic
              title={<span>已发布题库{goQuizWorkbench && <DrillHint />}</span>}
              value={d.quiz_libraries_total ?? 0}
              valueStyle={{ fontSize: 22, color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card
            size='small'
            hoverable={Boolean(goQuizWorkbench)}
            onClick={goQuizWorkbench}
            style={goQuizWorkbench ? { cursor: 'pointer' } : undefined}
          >
            <Statistic
              title={<span>题目总数{goQuizWorkbench && <DrillHint />}</span>}
              value={d.quiz_questions_inventory_total ?? '—'}
              valueStyle={{ fontSize: 22, color: '#722ed1' }}
            />
            <Text type='secondary'>含草稿、已发布和停用题目</Text>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card
            size='small'
            hoverable={Boolean(goQuizWorkbench)}
            onClick={goQuizWorkbench}
            style={goQuizWorkbench ? { cursor: 'pointer' } : undefined}
          >
            <Statistic
              title={<span>可练习题数{goQuizWorkbench && <DrillHint />}</span>}
              value={d.quiz_questions_practicable_total ?? '—'}
              valueStyle={{ fontSize: 22, color: '#722ed1' }}
            />
            <Text type='secondary'>已发布 {d.quiz_questions_total ?? 0} 题 · 入口状态单独统计</Text>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card
            size='small'
            hoverable={Boolean(goQuizStats)}
            onClick={goQuizStats}
            style={goQuizStats ? { cursor: 'pointer' } : undefined}
          >
            <Statistic
              title={<span>近30日练习答题总量{goQuizStats && <DrillHint />}</span>}
              value={d.quiz_attempts_30d ?? 0}
              valueStyle={{ fontSize: 22, color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}
