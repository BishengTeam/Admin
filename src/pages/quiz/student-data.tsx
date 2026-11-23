import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, DatePicker, Select, Space, Table, Tag, Typography, message } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { PAGE_SIZE_OPTIONS } from '@/core/constants'
import { quizService } from '@/services/quiz'
import { formatDate } from '@/utils/format'
import type { QuizLibrary, StudentStatsItem } from '@/types/quiz'

const { Text } = Typography
const { RangePicker } = DatePicker

const nameSourceLabels = {
  declared: { text: '自填', color: 'blue' },
  realname: { text: '实名', color: 'green' },
  none: { text: '未填写', color: 'default' },
} as const

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '请求失败'
}

function percent(value: number | null) {
  return value === null || value === undefined ? '—' : `${value.toFixed(1)}%`
}

function score(value: number | null) {
  return value === null || value === undefined ? '—' : value.toFixed(1)
}

export default function QuizStudentData() {
  const [libraries, setLibraries] = useState<QuizLibrary[]>([])
  const [libraryId, setLibraryId] = useState<number | null>(null)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [data, setData] = useState<{ items: StudentStatsItem[]; total: number; page: number; page_size: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    const next = new AbortController()
    quizService
      .listLibraries({ include_deleted: false }, next.signal)
      .then((items) => setLibraries(items))
      .catch(() => setLibraries([]))
    return () => next.abort()
  }, [])

  const load = useCallback(async () => {
    if (!libraryId) {
      setData(null)
      return
    }
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setLoading(true)
    try {
      const result = await quizService.listStudentStats(
        {
          library_id: libraryId,
          date_from: range?.[0]?.format('YYYY-MM-DD'),
          date_to: range?.[1]?.format('YYYY-MM-DD'),
          page,
          page_size: pageSize,
        },
        next.signal,
      )
      if (!next.signal.aborted) setData(result)
    } catch (error) {
      if (!next.signal.aborted) message.error(errorText(error))
    } finally {
      if (!next.signal.aborted) setLoading(false)
    }
  }, [libraryId, page, pageSize, range])

  useEffect(() => {
    void load()
    return () => controller.current?.abort()
  }, [load])

  const handleExport = async () => {
    if (!libraryId) {
      message.warning('请先选择题库')
      return
    }
    setExporting(true)
    try {
      const blob = await quizService.exportStudentStatsCsv({
        library_id: libraryId,
        date_from: range?.[0]?.format('YYYY-MM-DD'),
        date_to: range?.[1]?.format('YYYY-MM-DD'),
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quiz_student_stats_${libraryId}_${dayjs().format('YYYYMMDDHHmm')}.csv`
      link.click()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setExporting(false)
    }
  }

  const columns: ColumnsType<StudentStatsItem> = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 140,
      fixed: 'left',
      render: (value: string | null, record) => {
        const source = nameSourceLabels[record.name_source]
        return value ? (
          <Space size={4}>
            <Text>{value}</Text>
            <Tag color={source.color}>{source.text}</Tag>
          </Space>
        ) : (
          <Text type="secondary">未填写</Text>
        )
      },
    },
    { title: '用户 ID', dataIndex: 'user_id', width: 90, fixed: 'left' },
    { title: '手机号', dataIndex: 'phone_masked', width: 130, render: (value: string | null) => value ?? '—' },
    { title: '累计作答', dataIndex: 'practice_total_attempts', width: 100 },
    { title: '首答次数', dataIndex: 'practice_first_attempts', width: 100 },
    { title: '首答正确', dataIndex: 'practice_first_correct', width: 100 },
    { title: '首答正确率', dataIndex: 'practice_first_accuracy', width: 110, render: (value: number) => percent(value) },
    { title: '做题题目数', dataIndex: 'practice_answered_questions', width: 110 },
    { title: '活跃天数', dataIndex: 'practice_active_days', width: 100 },
    { title: '最近练习', dataIndex: 'practice_last_at', width: 170, render: (value: string | null) => (value ? formatDate(value) : '—') },
    { title: '考试次数', dataIndex: 'exam_count', width: 100 },
    { title: '平均分', dataIndex: 'exam_average_score', width: 90, render: (value: number | null) => score(value) },
    { title: '最高分', dataIndex: 'exam_high_score', width: 90, render: (value: number | null) => score(value) },
    { title: '最低分', dataIndex: 'exam_low_score', width: 90, render: (value: number | null) => score(value) },
    { title: '及格次数', dataIndex: 'exam_pass_count', width: 100 },
    { title: '及格比', dataIndex: 'exam_pass_rate', width: 100, render: (value: number | null) => percent(value) },
    { title: '最近考试', dataIndex: 'exam_last_at', width: 170, render: (value: string | null) => (value ? formatDate(value) : '—') },
  ]

  return (
    <PageContainer title="学生数据">
      <Card
        title="学生练习与考试汇总"
        extra={<Text type="secondary">练习含重做；考试仅已结算且已出分；及格线 60 分</Text>}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择题库（必选）"
            value={libraryId}
            onChange={(value) => {
              setLibraryId(value ?? null)
              setPage(1)
            }}
            options={libraries.map((item) => ({ value: item.id, label: item.name }))}
            style={{ width: 260 }}
          />
          <RangePicker
            value={range}
            onChange={(value) => {
              setRange(value as [Dayjs, Dayjs] | null)
              setPage(1)
            }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={() => void load()} disabled={!libraryId}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={exporting}
            disabled={!libraryId}
            onClick={() => void handleExport()}
          >
            导出 CSV
          </Button>
        </Space>
        {!libraryId ? (
          <Text type="secondary">请先选择题库；同一题库下按累计作答次数降序排列。</Text>
        ) : (
          <Table<StudentStatsItem>
            rowKey="user_id"
            size="small"
            loading={loading}
            scroll={{ x: 1800 }}
            columns={columns}
            dataSource={data?.items ?? []}
            pagination={{
              current: data?.page ?? page,
              pageSize: data?.page_size ?? pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showTotal: (total) => `共 ${total} 名学生`,
              onChange: (nextPage, nextSize) => { setPageSize(nextSize); setPage(nextSize !== pageSize ? 1 : nextPage) },
            }}
          />
        )}
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          <Tag color="orange">口径</Tag>
          姓名优先取自填姓名，其次已通过的实名姓名；导出为明文手机号，供线下核对。
        </Text>
      </Card>
    </PageContainer>
  )
}
