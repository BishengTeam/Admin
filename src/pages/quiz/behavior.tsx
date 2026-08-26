import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Col, Row, Select, Space, Table, Tag, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import type { DailyStatsItem, QuestionStatsListItem, QuestionType, QuizLibrary, StatsQuestionFilter, UserStatsListItem } from '@/types/quiz'

const { Text } = Typography
const typeLabels: Record<QuestionType, string> = { single_choice: '单选', multiple_choice: '多选', judge: '判断' }

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '请求失败'
}

export default function QuizBehavior() {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [daily, setDaily] = useState<DailyStatsItem[] | null>(null)
  const [users, setUsers] = useState<{ items: UserStatsListItem[]; total: number; page: number; page_size: number } | null>(null)
  const [userPage, setUserPage] = useState(1)
  const [libraries, setLibraries] = useState<QuizLibrary[]>([])
  const [wrongItems, setWrongItems] = useState<{ items: QuestionStatsListItem[]; total: number; page: number; page_size: number } | null>(null)
  const [wrongFilter, setWrongFilter] = useState<StatsQuestionFilter>({ sort: 'practice_wrong_count', order: 'desc', page: 1, page_size: 20 })
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingWrong, setLoadingWrong] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const sequence = useRef(0)

  const load = useCallback(async () => {
    const requestSequence = ++sequence.current
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setLoadingDaily(true)
    setLoadingUsers(true)
    setLoadingWrong(true)
    try {
      const [dailyResult, userResult, wrongResult, libraryResult] = await Promise.all([
        quizService.getDailyStats(days, next.signal),
        quizService.listUserStats({ page: userPage, page_size: 20 }, next.signal),
        quizService.listQuestionStats(wrongFilter, next.signal),
        quizService.listLibraries({ include_deleted: false }, next.signal),
      ])
      if (!next.signal.aborted && requestSequence === sequence.current) {
        setDaily(dailyResult)
        setUsers(userResult)
        setWrongItems(wrongResult)
        setLibraries(libraryResult)
      }
    } catch (error) {
      if (!next.signal.aborted && requestSequence === sequence.current) message.error(errorText(error))
    } finally {
      if (!next.signal.aborted && requestSequence === sequence.current) {
        setLoadingDaily(false)
        setLoadingUsers(false)
        setLoadingWrong(false)
      }
    }
  }, [days, userPage, wrongFilter])

  useEffect(() => {
    void load()
    return () => controller.current?.abort()
  }, [load])

  const chartOption = useMemo(() => ({
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['练习作答量', '活跃做题人数'] },
    grid: { left: 48, right: 24, top: 40, bottom: 32 },
    xAxis: { type: 'category' as const, data: (daily ?? []).map((item) => item.date.slice(5)) },
    yAxis: [
      { type: 'value' as const, name: '作答量', minInterval: 1 },
      { type: 'value' as const, name: '人数', minInterval: 1 },
    ],
    series: [
      { name: '练习作答量', type: 'line' as const, smooth: true, data: (daily ?? []).map((item) => item.practice_attempts) },
      { name: '活跃做题人数', type: 'line' as const, yAxisIndex: 1, smooth: true, data: (daily ?? []).map((item) => item.active_users) },
    ],
  }), [daily])

  const userColumns: ColumnsType<UserStatsListItem> = [
    { title: '排名', width: 70, render: (_value, _record, index) => ((users?.page ?? 1) - 1) * (users?.page_size ?? 20) + index + 1 },
    { title: '用户 ID', dataIndex: 'user_id', width: 100 },
    { title: '昵称', dataIndex: 'nickname', width: 140, render: (value: string | null) => value ?? <Text type="secondary">未填写</Text> },
    { title: '手机号', dataIndex: 'phone_masked', width: 140, render: (value: string | null) => value ?? '—' },
    { title: '累计作答', dataIndex: 'practice_total_attempts', width: 100 },
    { title: '首答次数', dataIndex: 'practice_first_attempts', width: 100 },
    { title: '首答正确', dataIndex: 'practice_first_correct', width: 100 },
    { title: '答题数', dataIndex: 'practice_answered_questions', width: 90 },
    { title: '打卡天数', dataIndex: 'checkin_days', width: 90 },
    { title: '连续天数', dataIndex: 'consecutive_days', width: 90 },
  ]

  const wrongColumns: ColumnsType<QuestionStatsListItem> = [
    { title: '排名', width: 70, render: (_value, _record, index) => ((wrongItems?.page ?? 1) - 1) * (wrongItems?.page_size ?? 20) + index + 1 },
    { title: '题目 ID', dataIndex: 'question_id', width: 90 },
    { title: '题干', dataIndex: 'question_text', ellipsis: true, width: 320 },
    { title: '题库', dataIndex: 'library_name', width: 140 },
    { title: '题型', dataIndex: 'question_type', width: 80, render: (value: QuestionType) => typeLabels[value] },
    { title: '首答次数', dataIndex: 'practice_first_attempts', width: 100 },
    { title: '首答正确', dataIndex: 'practice_first_correct', width: 100 },
    { title: '首答错误', width: 100, render: (_value, record) => record.practice_first_attempts - record.practice_first_correct },
    { title: '首答正确率', dataIndex: 'practice_first_accuracy', width: 110, render: (value: number) => `${value.toFixed(1)}%` },
  ]

  return (
    <PageContainer title="用户行为">
      <Card
        title="每日刷题趋势"
        extra={(
          <Space>
            <Select
              value={days}
              onChange={(value) => setDays(value)}
              options={[7, 30, 90].map((value) => ({ value, label: `近 ${value} 天` }))}
              style={{ width: 110 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button>
          </Space>
        )}
        loading={loadingDaily}
        style={{ marginBottom: 16 }}
      >
        <ReactECharts option={chartOption} style={{ height: 320 }} notMerge />
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="做题排行榜（累计作答次数）" loading={loadingUsers}>
            <Table<UserStatsListItem>
              rowKey="user_id"
              size="small"
              scroll={{ x: 980 }}
              columns={userColumns}
              dataSource={users?.items ?? []}
              pagination={{
                current: users?.page ?? userPage,
                pageSize: users?.page_size ?? 20,
                total: users?.total ?? 0,
                showSizeChanger: false,
                onChange: (page) => setUserPage(page),
              }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            title="错题排行榜（首答错误数）"
            loading={loadingWrong}
            extra={(
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="全部题库"
                value={wrongFilter.library_id}
                onChange={(value) => setWrongFilter((current) => ({ ...current, library_id: value, page: 1 }))}
                options={libraries.map((item) => ({ value: item.id, label: item.name }))}
                style={{ width: 200 }}
              />
            )}
          >
            <Table<QuestionStatsListItem>
              rowKey="question_id"
              size="small"
              scroll={{ x: 1130 }}
              columns={wrongColumns}
              dataSource={wrongItems?.items ?? []}
              pagination={{
                current: wrongItems?.page ?? wrongFilter.page ?? 1,
                pageSize: wrongItems?.page_size ?? 20,
                total: wrongItems?.total ?? 0,
                showSizeChanger: false,
                onChange: (page) => setWrongFilter((current) => ({ ...current, page })),
              }}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              <Tag color="orange">口径</Tag>首答错误 = 首答次数 − 首答正确；管理端统计最多延迟 1 分钟。
            </Text>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}
