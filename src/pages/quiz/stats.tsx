import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Col, Input, Progress, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import type { Category, QuestionStatsListItem, QuestionStatus, QuestionType, StatsOverview, StatsQuestionFilter } from '@/types/quiz'
import { buildCategoryTree, flattenCategories } from './components/CategoryTree'

const { Text } = Typography
const typeLabels: Record<QuestionType, string> = { single_choice: '单选', multiple_choice: '多选', judge: '判断' }
const statusLabels: Record<QuestionStatus, string> = { draft: '草稿', published: '已发布', disabled: '已停用' }
const statusColors: Record<QuestionStatus, string> = { draft: 'default', published: 'success', disabled: 'warning' }

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '请求失败'
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '尚未聚合'
}

function accuracy(value: number) {
  return `${value.toFixed(1)}%`
}

export default function QuizStats() {
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [data, setData] = useState<{ items: QuestionStatsListItem[]; total: number; page: number; page_size: number } | null>(null)
  const [filters, setFilters] = useState<StatsQuestionFilter>({ page: 1, page_size: 20 })
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const sequence = useRef(0)
  const filterKey = JSON.stringify(filters)

  const load = useCallback(async () => {
    const requestSequence = ++sequence.current
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setLoading(true)
    try {
      const [overviewResult, questionResult, categoryResult] = await Promise.all([
        quizService.getStatsOverview(next.signal),
        quizService.listQuestionStats(filters, next.signal),
        quizService.listCategories({}, next.signal),
      ])
      if (!next.signal.aborted && requestSequence === sequence.current) {
        setOverview(overviewResult)
        setData(questionResult)
        setCategories(categoryResult)
      }
    } catch (error) {
      if (!next.signal.aborted && requestSequence === sequence.current) message.error(errorText(error))
    } finally {
      if (!next.signal.aborted && requestSequence === sequence.current) setLoading(false)
    }
  }, [filterKey])

  useEffect(() => {
    void load()
    return () => controller.current?.abort()
  }, [load])

  const categoryOptions = useMemo(() => flattenCategories(buildCategoryTree(categories)).map((item) => ({
    value: item.id,
    label: `${'　'.repeat(item.depth - 1)}${item.name}`,
  })), [categories])

  const search = () => setFilters((current) => ({ ...current, keyword: keyword.trim() || undefined, page: 1 }))
  const columns: ColumnsType<QuestionStatsListItem> = [
    { title: '题目 ID', dataIndex: 'question_id', width: 90 },
    { title: '题干', dataIndex: 'question_text', ellipsis: true, width: 300 },
    { title: '分类', dataIndex: 'category_name', width: 150 },
    { title: '题型', dataIndex: 'question_type', width: 90, render: (value: QuestionType) => typeLabels[value] },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: QuestionStatus) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag> },
    { title: '练习首答', dataIndex: 'practice_first_attempts', width: 100 },
    { title: '练习正确率', dataIndex: 'practice_first_accuracy', width: 120, render: (value: number) => accuracy(value) },
    { title: '考试作答', dataIndex: 'exam_answers', width: 100 },
    { title: '考试正确率', dataIndex: 'exam_accuracy', width: 120, render: (value: number) => accuracy(value) },
    { title: '聚合水位', dataIndex: 'aggregated_through', width: 180, render: formatDate },
  ]

  return (
    <PageContainer title="题库聚合统计">
      <Alert
        showIcon
        type="info"
        style={{ marginBottom: 16 }}
        message="管理端统计最多延迟 1 分钟，不提供用户下钻或导出。"
        description={`查询时间：${formatDate(overview?.calculated_at ?? null)}；聚合水位：${formatDate(overview?.aggregated_through ?? null)}`}
      />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}><Card loading={loading}><Statistic title="分类" value={overview?.category_count ?? 0} suffix={`个（启用 ${overview?.active_category_count ?? 0} / 停用 ${overview?.disabled_category_count ?? 0}）`} /></Card></Col>
        <Col xs={24} md={8}><Card loading={loading}><Statistic title="题目" value={overview?.question_count ?? 0} suffix="道" /><Text type="secondary">草稿 {overview?.draft_question_count ?? 0} / 发布 {overview?.published_question_count ?? 0} / 停用 {overview?.disabled_question_count ?? 0}</Text></Card></Col>
        <Col xs={24} md={8}><Card loading={loading}><Statistic title="练习会话" value={overview?.practice_session_count ?? 0} suffix="场" /><Text type="secondary">首答 {overview?.practice_first_attempts ?? 0} 次，正确 {overview?.practice_first_correct ?? 0} 次</Text></Card></Col>
        <Col xs={24} md={12}><Card title="练习首答正确率" loading={loading}><Progress percent={overview?.practice_first_accuracy ?? 0} format={(value) => accuracy(value ?? 0)} /></Card></Col>
        <Col xs={24} md={12}><Card title="考试正确率" loading={loading}><Progress percent={overview?.exam_accuracy ?? 0} format={(value) => accuracy(value ?? 0)} /><Text type="secondary">完成 {overview?.completed_exam_count ?? 0} 场 / 超时 {overview?.timed_out_exam_count ?? 0} 场 / 作答 {overview?.exam_answers ?? 0} 次</Text></Card></Col>
      </Row>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select allowClear showSearch optionFilterProp="label" placeholder="分类" value={filters.category_id} onChange={(value) => setFilters((current) => ({ ...current, category_id: value, page: 1 }))} options={categoryOptions} style={{ width: 220 }} />
        <Select allowClear placeholder="题型" value={filters.question_type} onChange={(value) => setFilters((current) => ({ ...current, question_type: value, page: 1 }))} options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} style={{ width: 120 }} />
        <Select allowClear placeholder="状态" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value, page: 1 }))} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} style={{ width: 120 }} />
        <Input allowClear value={keyword} prefix={<SearchOutlined />} placeholder="题干关键词" onChange={(event) => setKeyword(event.target.value)} onPressEnter={search} style={{ width: 240 }} />
        <Button type="primary" onClick={search}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button>
      </Space>
      <Table<QuestionStatsListItem>
        rowKey="question_id"
        scroll={{ x: 1350 }}
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={{
          current: data?.page ?? filters.page ?? 1,
          pageSize: data?.page_size ?? filters.page_size ?? 20,
          total: data?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (total) => `共 ${total} 道题`,
          onChange: (page, pageSize) => setFilters((current) => ({ ...current, page, page_size: pageSize })),
        }}
      />
    </PageContainer>
  )
}
