import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Descriptions, Drawer, Input, message, Modal, Progress, Select, Space, Spin, Table, Tag } from 'antd'
import { BarChartOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, StopOutlined, UndoOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { useNavigate } from 'react-router-dom'
import { quizService } from '@/services/quiz'
import { ApiError, isConflictError, isNotFoundError, isValidationError } from '@/core/request'
import type { Category, Question, QuestionFilter, QuestionStats, QuestionStatus, QuestionType } from '@/types/quiz'
import { formatQuestionPublishErrors, validateQuestionForPublish } from '@/utils/quiz'
import { QUIZ_IMPORT_SUCCEEDED_EVENT } from '@/utils/quizEvents'
import { getCategoryPath, isCategoryEffectivelyDisabled } from './CategoryTree'
import QuestionModal from './QuestionModal'

interface QuestionTableProps {
  filters: QuestionFilter
  keyword: string
  categories: Category[]
  canWrite: boolean
  canImport: boolean
  onKeywordChange: (value: string) => void
  onFilterChange: (value: Partial<QuestionFilter>) => void
  onRefreshCategories: () => void | Promise<void>
}

interface SelectedQuestion {
  question_id: number
  lock_version: number
  status: QuestionStatus
  category_id: number
  ever_published: boolean
  // Keep the row snapshot for deterministic client-side publish validation.
  // The version sent to the API is always this selection's numeric snapshot;
  // a 409 causes a refresh and never an automatic retry.
  question: Question
}

const typeLabels: Record<QuestionType, string> = { single_choice: '单选', multiple_choice: '多选', judge: '判断' }
const statusLabels: Record<QuestionStatus, string> = { draft: '草稿', published: '已发布', disabled: '已停用' }
const statusColors: Record<QuestionStatus, string> = { draft: 'default', published: 'success', disabled: 'warning' }

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message
  return error instanceof Error ? error.message : '请求失败'
}

function showActionErrors(title: string, errors: Array<{ questionId: number; messages: string[] }>) {
  Modal.warning({
    title,
    content: (
      <div>
        {errors.flatMap((item) => item.messages.map((messageText, index) => (
          <div key={`${item.questionId}-${index}`}>题目 #{item.questionId}：{messageText}</div>
        )))}
      </div>
    ),
  })
}

export default function QuestionTable({ filters, keyword, categories, canWrite, canImport, onKeywordChange, onFilterChange, onRefreshCategories }: QuestionTableProps) {
  const navigate = useNavigate()
  const [data, setData] = useState<{ items: Question[]; total: number; page: number; page_size: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<Record<number, SelectedQuestion>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)
  const [viewing, setViewing] = useState<Question | null>(null)
  const [stats, setStats] = useState<QuestionStats | null>(null)
  const [statsQuestion, setStatsQuestion] = useState<Question | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const seq = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const statsSeq = useRef(0)
  const filterKey = JSON.stringify(filters)

  const load = useCallback(async (targetPage = page, targetPageSize = pageSize) => {
    const requestSeq = ++seq.current
    controller.current?.abort()
    const nextController = new AbortController()
    controller.current = nextController
    setLoading(true)
    try {
      const result = await quizService.listQuestions({ ...filters, page: targetPage, page_size: targetPageSize }, nextController.signal)
      if (requestSeq === seq.current) {
        setData(result)
        // A selected row can reappear after paging or a refresh.  Replace its
        // snapshot with the newest list response so a later batch operation
        // never sends a lock_version from an obsolete row cache.
        setSelected((current) => {
          let changed = false
          const next = { ...current }
          result.items.forEach((item) => {
            const previous = next[item.id]
            if (!previous) return
            next[item.id] = {
              ...previous,
              lock_version: item.lock_version,
              status: item.status,
              category_id: item.category_id,
              ever_published: item.ever_published,
              question: item,
            }
            changed = changed || previous.lock_version !== item.lock_version || previous.question !== item
          })
          return changed ? next : current
        })
      }
    } catch (error) {
      if (!nextController.signal.aborted && requestSeq === seq.current) message.error(errorText(error))
    } finally {
      if (requestSeq === seq.current) setLoading(false)
    }
  }, [filterKey, page, pageSize])

  useEffect(() => {
    setPage(1)
    setSelected({})
  }, [filterKey])

  useEffect(() => {
    load(page, pageSize)
    return () => controller.current?.abort()
  }, [load, page, pageSize])

  useEffect(() => {
    const refreshAfterImport = () => {
      setSelected({})
      void load(page, pageSize)
    }
    window.addEventListener(QUIZ_IMPORT_SUCCEEDED_EVENT, refreshAfterImport)
    return () => window.removeEventListener(QUIZ_IMPORT_SUCCEEDED_EVENT, refreshAfterImport)
  }, [load, page, pageSize])

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const currentSelectedKeys = useMemo(() => data?.items.filter((item) => selected[item.id]).map((item) => item.id) ?? [], [data, selected])
  const selectedItems = Object.values(selected)

  const refreshAfterConflict = () => {
    setSelected({})
    load(page, pageSize)
    onRefreshCategories()
    message.warning('数据已被其他管理员修改，列表已刷新；当前输入仍保留，请关闭后重新打开并对比，再提交')
  }

  const refreshAfterMissing = async (text = '题目不存在，列表已刷新') => {
    setSelected({})
    setModalOpen(false)
    setEditing(null)
    setViewing(null)
    statsSeq.current += 1
    setStatsQuestion(null)
    setStats(null)
    setStatsLoading(false)
    await load(page, pageSize)
    await onRefreshCategories()
    message.warning(text)
  }

  const runSingle = async (action: () => Promise<Question>, success: string) => {
    try {
      const updated = await action()
      setData((current) => current ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) } : current)
      setSelected({})
      onRefreshCategories()
      message.success(success)
    } catch (error) {
      if (isConflictError(error)) refreshAfterConflict()
      else if (isNotFoundError(error)) await refreshAfterMissing()
      else if (isValidationError(error)) message.warning(errorText(error))
      else message.error(errorText(error))
    }
  }

  const deleteDraft = async (question: Question) => {
    if (question.status !== 'draft' || question.ever_published) return
    try {
      await quizService.deleteQuestion(question.id, question.lock_version)
      setSelected({})
      message.success('草稿已删除')
      load(page, pageSize)
    } catch (error) {
      if (isConflictError(error)) refreshAfterConflict()
      else if (isNotFoundError(error)) await refreshAfterMissing()
      else message.error(errorText(error))
    }
  }

  const handleBatch = async (kind: 'publish' | 'disable') => {
    if (!selectedItems.length) return
    const invalid: Array<{ questionId: number; messages: string[] }> = []
    selectedItems.forEach((item) => {
      const errors: string[] = []
      if (kind === 'publish') {
        if (item.status !== 'draft') errors.push('只有草稿题目可以发布')
        if (isCategoryEffectivelyDisabled(categories, item.category_id)) errors.push('分类自身或祖先分类已停用，不能发布')
        if (item.status === 'draft') errors.push(...formatQuestionPublishErrors(validateQuestionForPublish(item.question)))
      } else if (item.status !== 'published') {
        errors.push('只有已发布题目可以批量停用')
      }
      if (errors.length) invalid.push({ questionId: item.question_id, messages: errors })
    })
    if (invalid.length) {
      showActionErrors(kind === 'publish' ? '批量发布前校验未通过' : '批量停用前校验未通过', invalid)
      return
    }
    Modal.confirm({
      title: `确认批量${kind === 'publish' ? '发布' : '停用'} ${selectedItems.length} 道题目？`,
      content: '仅操作当前页明确勾选的题目。服务端将整批重新校验，任一题失败时整批不变。',
      okText: `确认${kind === 'publish' ? '发布' : '停用'}`,
      onOk: async () => {
        try {
          const payload = { items: selectedItems.map(({ question_id, lock_version }) => ({ question_id, lock_version })) }
          const result = kind === 'publish'
            ? await quizService.batchPublish(payload)
            : await quizService.batchDisable(payload)
          if (result.succeeded) message.success(`已${kind === 'publish' ? '发布' : '停用'} ${result.updated_count} 道题目`)
          else {
            showActionErrors('批量操作未完成（整批未提交）', result.errors.map((item) => ({ questionId: item.question_id, messages: [`${item.field ? `${item.field}：` : ''}${item.message}（错误码 ${item.code}）`] })))
          }
          setSelected({})
          await load(page, pageSize)
          await onRefreshCategories()
        } catch (error) {
          if (isConflictError(error)) refreshAfterConflict()
          else if (isNotFoundError(error)) await refreshAfterMissing()
          else message.error(errorText(error))
        }
      },
    })
  }

  const selectedPublishedCount = selectedItems.filter((item) => item.status === 'published').length

  const publishSingle = (record: Question) => {
    const errors = formatQuestionPublishErrors(validateQuestionForPublish(record))
    if (isCategoryEffectivelyDisabled(categories, record.category_id)) errors.unshift('分类自身或祖先分类已停用，不能发布')
    if (errors.length) {
      showActionErrors('发布前校验未通过', [{ questionId: record.id, messages: errors }])
      return
    }
    void runSingle(() => quizService.publishQuestion(record.id, record.lock_version), '题目已发布')
  }

  const openStats = async (question: Question) => {
    const requestSeq = ++statsSeq.current
    setStatsQuestion(question)
    setStats(null)
    setStatsLoading(true)
    try {
      const result = await quizService.getQuestionStats(question.id)
      if (requestSeq === statsSeq.current) setStats(result)
    } catch (error) {
      if (requestSeq === statsSeq.current) {
        if (isNotFoundError(error)) await refreshAfterMissing()
        else message.error(errorText(error))
      }
    } finally {
      if (requestSeq === statsSeq.current) setStatsLoading(false)
    }
  }

  const columns: ColumnsType<Question> = [
    { title: '题目', dataIndex: 'question_text', ellipsis: true, width: 320 },
    { title: '题型', dataIndex: 'question_type', width: 80, render: (value: QuestionType) => <Tag color="blue">{typeLabels[value]}</Tag> },
    { title: '分类', dataIndex: 'category_id', width: 150, render: (id: number) => <Tag>{categoryMap.get(id)?.name ?? `分类 #${id}`}</Tag> },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: QuestionStatus, record) => <Space size={4}><Tag color={statusColors[value]}>{statusLabels[value]}</Tag>{isCategoryEffectivelyDisabled(categories, record.category_id) && <Tag color="warning">分类停用</Tag>}</Space> },
    { title: '更新时间', dataIndex: 'updated_at', width: 170, render: formatDate },
    { title: '版本', dataIndex: 'lock_version', width: 70 },
    {
      title: '操作', width: 350, fixed: 'right', render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewing(record)}>查看</Button>
          {canWrite && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true) }}>编辑</Button>}
          {record.status === 'draft' && canWrite && <Button type="link" size="small" disabled={record.ever_published || isCategoryEffectivelyDisabled(categories, record.category_id)} onClick={() => publishSingle(record)}>发布</Button>}
          {record.status === 'published' && canWrite && <Button type="link" size="small" icon={<StopOutlined />} onClick={() => runSingle(() => quizService.disableQuestion(record.id, record.lock_version), '题目已停用')}>停用</Button>}
          {record.status === 'disabled' && canWrite && <Button type="link" size="small" icon={<UndoOutlined />} disabled={isCategoryEffectivelyDisabled(categories, record.category_id)} onClick={() => runSingle(() => quizService.restoreQuestion(record.id, record.lock_version), '题目已恢复')}>恢复</Button>}
          <Button type="link" size="small" icon={<BarChartOutlined />} onClick={() => openStats(record)}>统计</Button>
          {record.status === 'draft' && !record.ever_published && canWrite && <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => Modal.confirm({ title: '删除草稿', content: '仅删除该草稿，不会影响其他题目。', onOk: () => deleteDraft(record) })}>删除草稿</Button>}
        </Space>
      ),
    },
  ]

  const rowSelection: TableRowSelection<Question> = {
    selectedRowKeys: currentSelectedKeys,
    onSelect: (record, checked) => {
      setSelected((current) => {
        const next = { ...current }
        if (checked) {
          if (Object.keys(next).length >= 100) { message.warning('每次最多选择 100 道题目'); return current }
          next[record.id] = { question_id: record.id, lock_version: record.lock_version, status: record.status, category_id: record.category_id, ever_published: record.ever_published, question: record }
        }
        else delete next[record.id]
        return next
      })
    },
    onSelectAll: (checked, _rows, changeRows) => {
      setSelected((current) => {
        const next = { ...current }
        changeRows.forEach((record) => {
          if (checked) {
            if (Object.keys(next).length >= 100) return
            next[record.id] = { question_id: record.id, lock_version: record.lock_version, status: record.status, category_id: record.category_id, ever_published: record.ever_published, question: record }
          }
          else delete next[record.id]
        })
        return next
      })
    },
  }

  const closeModal = () => { setModalOpen(false); setEditing(null) }
  const updateFilters = (next: Partial<QuestionFilter>) => {
    // Filter changes intentionally reset to the first page and selection effect clears stale versions.
    onFilterChange(next)
  }

  return (
    <div>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space wrap>
          <Input prefix={<SearchOutlined />} allowClear placeholder="搜索题干" value={keyword} onChange={(event) => onKeywordChange(event.target.value)} style={{ width: 240 }} />
          <Select aria-label="题目题型" allowClear placeholder="题型" style={{ width: 130 }} value={filters.question_type} onChange={(value) => updateFilters({ question_type: value })} options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} />
          <Select aria-label="题目状态" allowClear placeholder="状态" style={{ width: 120 }} value={filters.status} onChange={(value) => updateFilters({ status: value })} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
        </Space>
        <Space>
          {Object.keys(selected).length > 0 && <>
            <Button onClick={() => handleBatch('publish')} disabled={!canWrite}>批量发布 ({Object.keys(selected).length})</Button>
            <Button onClick={() => handleBatch('disable')} disabled={!canWrite}>批量停用已发布题目 ({selectedPublishedCount})</Button>
          </>}
          {canImport && <Button icon={<UploadOutlined />} onClick={() => navigate('/admin/quiz/imports')}>导入任务</Button>}
          <Button icon={<ReloadOutlined />} onClick={() => { setSelected({}); load(page, pageSize) }}>刷新</Button>
          {canWrite && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true) }}>新增题目</Button>}
        </Space>
      </Space>
      <Table<Question>
        rowKey="id"
        size="middle"
        scroll={{ x: 1220 }}
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        rowSelection={canWrite ? rowSelection : undefined}
        pagination={{ current: data?.page ?? page, pageSize: data?.page_size ?? pageSize, total: data?.total ?? 0, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], showTotal: (total) => `共 ${total} 条`, onChange: (nextPage, nextSize) => { setSelected({}); setPage(nextSize !== pageSize ? 1 : nextPage); setPageSize(nextSize) } }}
      />
      <QuestionModal open={modalOpen} question={editing} categories={categories} canWrite={canWrite} onClose={closeModal} onSaved={(saved) => { closeModal(); setSelected({}); if (editing) setData((current) => current ? { ...current, items: current.items.map((item) => item.id === saved.id ? saved : item) } : current); else void load(page, pageSize); onRefreshCategories(); message.success(editing ? '题目已更新' : '题目已创建') }} onConflict={refreshAfterConflict} onNotFound={() => { void refreshAfterMissing(editing ? '题目不存在，列表已刷新' : '所属分类不存在，分类和题目列表已刷新') }} />
      <Drawer title={`题目详情${viewing ? ` #${viewing.id}` : ''}`} open={Boolean(viewing)} onClose={() => setViewing(null)} width={600}>
        {viewing && <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="题型">{typeLabels[viewing.question_type]}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={statusColors[viewing.status]}>{statusLabels[viewing.status]}</Tag></Descriptions.Item>
          <Descriptions.Item label="分类" span={2}>{getCategoryPath(categories, viewing.category_id).map((item) => item.name).join(' / ') || `分类 #${viewing.category_id}`}</Descriptions.Item>
          <Descriptions.Item label="题干" span={2}>{viewing.question_text}</Descriptions.Item>
          <Descriptions.Item label="选项" span={2}>
            {viewing.options ? Object.entries(viewing.options).map(([key, value]) => <div key={key}><strong>{key}.</strong> {value}</div>) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="正确答案" span={2}>{Array.isArray(viewing.correct_answer) ? viewing.correct_answer.join(', ') : viewing.correct_answer || '-'}</Descriptions.Item>
          <Descriptions.Item label="答案解析" span={2}>{viewing.explanation || '-'}</Descriptions.Item>
          <Descriptions.Item label="曾发布">{viewing.ever_published ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label="版本">{viewing.lock_version}</Descriptions.Item>
          <Descriptions.Item label="首次发布">{formatDate(viewing.published_at)}</Descriptions.Item>
          <Descriptions.Item label="停用时间">{formatDate(viewing.disabled_at)}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(viewing.created_at)}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{formatDate(viewing.updated_at)}</Descriptions.Item>
        </Descriptions>}
      </Drawer>
      <Drawer title={`题目统计${statsQuestion ? ` #${statsQuestion.id}` : ''}`} open={Boolean(statsQuestion)} onClose={() => { statsSeq.current += 1; setStatsQuestion(null); setStats(null); setStatsLoading(false) }} width={420}>
        {statsLoading ? <Spin /> : stats && <Space direction="vertical" style={{ width: '100%' }}>
          {statsQuestion && <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="题目状态">{statusLabels[statsQuestion.status]}</Descriptions.Item>
            <Descriptions.Item label="首次发布">{formatDate(statsQuestion.published_at)}</Descriptions.Item>
            <Descriptions.Item label="停用时间">{formatDate(statsQuestion.disabled_at)}</Descriptions.Item>
          </Descriptions>}
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="练习首答次数">{stats.practice_first_attempts}</Descriptions.Item>
            <Descriptions.Item label="练习首答正确数">{stats.practice_first_correct}</Descriptions.Item>
            <Descriptions.Item label="练习首答正确率">{stats.practice_first_accuracy.toFixed(1)}%</Descriptions.Item>
            <Descriptions.Item label="考试作答次数">{stats.exam_answers}</Descriptions.Item>
            <Descriptions.Item label="考试正确数">{stats.exam_correct}</Descriptions.Item>
            <Descriptions.Item label="考试正确率">{stats.exam_accuracy.toFixed(1)}%</Descriptions.Item>
            <Descriptions.Item label="统计截止时间">{formatDate(stats.aggregated_through)}</Descriptions.Item>
          </Descriptions>
          <Progress percent={Number(stats.practice_first_accuracy.toFixed(1))} format={(value) => `${value?.toFixed(1)}%`} />
          <Progress percent={Number(stats.exam_accuracy.toFixed(1))} format={(value) => `${value?.toFixed(1)}%`} />
        </Space>}
      </Drawer>
    </div>
  )
}
