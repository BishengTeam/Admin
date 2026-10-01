import { Row, Col, Card, Statistic, Spin, Result, Button, Badge, Space, Typography } from 'antd'
import {
  UserOutlined, ShoppingCartOutlined, CalendarOutlined, CheckCircleOutlined,
  RiseOutlined, PercentageOutlined, BookOutlined, QuestionCircleOutlined,
  SafetyCertificateOutlined, TrophyOutlined, TeamOutlined, ReadOutlined,
  ClockCircleOutlined, FileDoneOutlined, AlertOutlined,
} from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { useDashboardData } from '@/hooks/useDashboardData'
import type { DashboardData } from '@/types/dashboard'

const { Text, Title } = Typography

function StatCard({ title, value, icon, color, suffix, isAmount }: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  suffix?: string
  isAmount?: boolean
}) {
  return (
    <Card hoverable size='small'>
      <Statistic
        title={
          <span style={{ fontSize: 13, color: '#666' }}>
            <span style={{ color, marginRight: 6 }}>{icon}</span>
            {title}
          </span>
        }
        value={isAmount ? value / 100 : value}
        precision={isAmount ? 2 : 0}
        prefix={isAmount ? '¥' : undefined}
        suffix={suffix}
        valueStyle={{ fontSize: 24, color }}
      />
    </Card>
  )
}

function ModuleSection({ title, icon, color, children }: {
  title: string
  icon: React.ReactNode
  color: string
  children: React.ReactNode
}) {
  return (
    <Card
      size='small'
      title={
        <Space>
          <span style={{ color, fontSize: 18 }}>{icon}</span>
          <Text strong style={{ fontSize: 15 }}>{title}</Text>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {children}
    </Card>
  )
}

export default function Dashboard() {
  const { data, loading, error, refresh } = useDashboardData()

  if (error) {
    return (
      <PageContainer title='数据看板'>
        <Result
          status='error'
          title='数据加载失败'
          subTitle={error}
          extra={<Button type='primary' onClick={() => refresh()}>重试</Button>}
        />
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
          <StatCard title='近30日订单' value={d.recent_orders_30d} icon={<CalendarOutlined />} color='#eb2f96' />
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
      </Row>

      {/* ── 题库模块 ── */}
      <ModuleSection title='题库模块' icon={<QuestionCircleOutlined />} color='#1677ff'>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <StatCard title='已发布题库' value={d.quiz_libraries_total ?? 0} icon={<BookOutlined />} color='#1677ff' />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard title='已发布题目' value={d.quiz_questions_total ?? 0} icon={<QuestionCircleOutlined />} color='#722ed1' />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard title='今日答题数' value={d.quiz_attempts_today ?? 0} icon={<ClockCircleOutlined />} color='#fa8c16' />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard title='近30日答题数' value={d.quiz_attempts_30d ?? 0} icon={<CalendarOutlined />} color='#13c2c2' />
          </Col>
        </Row>
      </ModuleSection>

      {/* ── 认证模块 ── */}
      <ModuleSection title='认证模块' icon={<SafetyCertificateOutlined />} color='#52c41a'>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <Card size='small' style={{ borderColor: (d.h3c_pending_review ?? 0) > 0 ? '#fa8c16' : undefined }}>
              <Statistic
                title={
                  <span style={{ fontSize: 13 }}>
                    <AlertOutlined style={{ color: '#fa8c16', marginRight: 6 }} />
                    H3C 待审核
                    {(d.h3c_pending_review ?? 0) > 0 && (
                      <Badge count={d.h3c_pending_review} style={{ marginLeft: 8 }} />
                    )}
                  </span>
                }
                value={d.h3c_pending_review ?? 0}
                valueStyle={{ fontSize: 24, color: (d.h3c_pending_review ?? 0) > 0 ? '#fa8c16' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <StatCard title='H3C 已通过' value={d.h3c_approved ?? 0} icon={<FileDoneOutlined />} color='#52c41a' />
          </Col>
          <Col xs={12} sm={6}>
            <Card size='small' style={{ borderColor: (d.nisp_pending_review ?? 0) > 0 ? '#fa8c16' : undefined }}>
              <Statistic
                title={
                  <span style={{ fontSize: 13 }}>
                    <AlertOutlined style={{ color: '#fa8c16', marginRight: 6 }} />
                    NISP 待审核
                    {(d.nisp_pending_review ?? 0) > 0 && (
                      <Badge count={d.nisp_pending_review} style={{ marginLeft: 8 }} />
                    )}
                  </span>
                }
                value={d.nisp_pending_review ?? 0}
                valueStyle={{ fontSize: 24, color: (d.nisp_pending_review ?? 0) > 0 ? '#fa8c16' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <StatCard title='NISP 已通过' value={d.nisp_approved ?? 0} icon={<FileDoneOutlined />} color='#52c41a' />
          </Col>
        </Row>
      </ModuleSection>

      {/* ── 课程/竞赛/课堂 ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <ModuleSection title='课程模块' icon={<ReadOutlined />} color='#722ed1'>
            <StatCard title='已上线课程' value={d.courses_total ?? 0} icon={<ReadOutlined />} color='#722ed1' />
          </ModuleSection>
        </Col>
        <Col xs={24} md={8}>
          <ModuleSection title='竞赛模块' icon={<TrophyOutlined />} color='#fa8c16'>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <StatCard title='进行中赛事' value={d.competitions_active ?? 0} icon={<TrophyOutlined />} color='#fa8c16' />
              </Col>
              <Col span={12}>
                <StatCard title='总报名人次' value={d.competition_registrations ?? 0} icon={<TeamOutlined />} color='#eb2f96' />
              </Col>
            </Row>
          </ModuleSection>
        </Col>
        <Col xs={24} md={8}>
          <ModuleSection title='课堂模块' icon={<TeamOutlined />} color='#13c2c2'>
            <StatCard title='进行中课堂' value={d.classrooms_active ?? 0} icon={<TeamOutlined />} color='#13c2c2' />
          </ModuleSection>
        </Col>
      </Row>
    </PageContainer>
  )
}
