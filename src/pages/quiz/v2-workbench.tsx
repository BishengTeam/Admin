import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Tree,
} from 'antd'
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface'
import type { DataNode } from 'antd/es/tree'
import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  UndoOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import { usePermission } from '@/hooks/usePermission'
import { ApiError, isConflictError, isNotFoundError, isRateLimitError } from '@/core/request'
import { formatDate } from '@/utils/format'
import type {
  BatchResponse,
  QuizContentTree,
  QuizKnowledgePoint,
  QuizLibrary,
  QuizModule,
  QuizQuestionRevision,
  QuizV2Question,
  QuizV2QuestionFilter,
} from '@/types/quiz'
import type { PageData } from '@/types/api'
import V2QuestionModal from './components/V2QuestionModal'

const statusLabels = { draft: '草稿', published: '已发布', disabled: '已停用', deleted: '已删除' } as const
const statusColors = { draft: 'default', published: 'success', disabled: 'warning', deleted: 'error' } as const
const typeLabels = { single_choice: '单选题', multiple_choice: '多选题', judge: '判断题', essay: '问答题' } as const

type Selection = { kind: 'all' } | { kind: 'module'; id: number } | { kind: 'point'; id: number }
type EditingContent = { kind: 'module'; value: QuizModule } | { kind: 'point'; value: QuizKnowledgePoint } | null

function errorText(error: unknown) { return error instanceof Error ? error.message : '请求失败' }
function canUndo(until: string | null) { return Boolean(until && Date.parse(until) > Date.now()) }

function findModule(tree: QuizContentTree | null, id: number) { return tree?.modules.find((item) => item.id === id) }
function findPoint(tree: QuizContentTree | null, id: number) { return tree?.modules.flatMap((item) => item.knowledge_points).find((item) => item.id === id) }

export default function QuizV2Workbench() {
  const canWrite = usePermission('quiz_content_edit') || usePermission('quiz:write')
  const canPublish = usePermission('quiz_content_publish') || usePermission('quiz:write')
  const canImport = usePermission('quiz:import')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [libraries, setLibraries] = useState<QuizLibrary[]>([])
  const selectedLibraryId = Number(params.get('library_id')) || undefined
  const selectedModuleId = Number(params.get('module_id')) || undefined
  const selectedPointId = Number(params.get('knowledge_point_id')) || undefined
  const focusQuestionId = Number(params.get('question_id')) || undefined
  const selection: Selection = selectedPointId ? { kind: 'point', id: selectedPointId } : selectedModuleId ? { kind: 'module', id: selectedModuleId } : { kind: 'all' }
  const [tree, setTree] = useState<QuizContentTree | null>(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const [questions, setQuestions] = useState<PageData<QuizV2Question> | null>(null)
  const [questionLoading, setQuestionLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '')
  const [selectedRows, setSelectedRows] = useState<Record<number, QuizV2Question>>({})
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizV2Question | null>(null)
  const [viewing, setViewing] = useState<QuizV2Question | null>(null)
  const [revisions, setRevisions] = useState<QuizQuestionRevision[]>([])
  const [revisionLoading, setRevisionLoading] = useState(false)
  const [contentModalOpen, setContentModalOpen] = useState(false)
  const [editingContent, setEditingContent] = useState<EditingContent>(null)
  const [contentParentModule, setContentParentModule] = useState<number>()
  const [contentForm] = Form.useForm()
  const librariesController = useRef<AbortController>()
  const treeController = useRef<AbortController>()
  const questionsController = useRef<AbortController>()
  const focusResolvedRef = useRef<number | null>(null)

  const updateParams = useCallback((changes: Record<string, string | number | undefined>) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(changes).forEach(([key, value]) => value == null || value === '' ? next.delete(key) : next.set(key, String(value)))
      return next
    }, { replace: true })
  }, [setParams])

  const loadLibraries = useCallback(async () => {
    librariesController.current?.abort()
    const controller = new AbortController()
    librariesController.current = controller
    try {
      const result = await quizService.listLibraries({ include_deleted: false }, controller.signal)
      if (controller.signal.aborted) return
      setLibraries(result)
      if (!selectedLibraryId && !focusQuestionId && result.length) updateParams({ library_id: result[0].id })
    } catch (error) {
      if (!controller.signal.aborted) message.error(errorText(error))
    }
  }, [focusQuestionId, selectedLibraryId, updateParams])

  const loadTree = useCallback(async () => {
    treeController.current?.abort()
    if (!selectedLibraryId) { setTree(null); return }
    const controller = new AbortController()
    treeController.current = controller
    setTreeLoading(true)
    try {
      const result = await quizService.getContentTree(selectedLibraryId, controller.signal)
      if (!controller.signal.aborted) setTree(result)
    } catch (error) {
      if (!controller.signal.aborted) message.error(errorText(error))
    } finally { if (!controller.signal.aborted) setTreeLoading(false) }
  }, [selectedLibraryId])

  const filters = useMemo<QuizV2QuestionFilter | null>(() => selectedLibraryId || focusQuestionId ? {
    ...(selectedLibraryId ? { library_id: selectedLibraryId } : {}),
    ...(focusQuestionId ? { question_id: focusQuestionId } : {}),
    ...(selection.kind === 'module' ? { module_id: selection.id } : {}),
    ...(selection.kind === 'point' ? { knowledge_point_id: selection.id } : {}),
    question_type: (params.get('question_type') as QuizV2QuestionFilter['question_type']) || undefined,
    status: (params.get('status') as QuizV2QuestionFilter['status']) || undefined,
    keyword: params.get('keyword')?.trim() || undefined,
    include_deleted: focusQuestionId !== undefined || params.get('include_deleted') === 'true',
    page,
    page_size: pageSize,
  } : null, [focusQuestionId, page, pageSize, params, selectedLibraryId, selection.kind, selection.kind === 'all' ? 0 : selection.id])

  const loadQuestions = useCallback(async () => {
    questionsController.current?.abort()
    if (!filters) { setQuestions(null); return }
    const controller = new AbortController()
    questionsController.current = controller
    setQuestionLoading(true)
    try {
      const result = await quizService.listV2Questions(filters, controller.signal)
      if (!controller.signal.aborted) setQuestions(result)
    } catch (error) {
      if (!controller.signal.aborted) message.error(errorText(error))
    } finally { if (!controller.signal.aborted) setQuestionLoading(false) }
  }, [filters])

  useEffect(() => { void loadLibraries(); return () => librariesController.current?.abort() }, [loadLibraries])
  useEffect(() => { void loadTree(); return () => treeController.current?.abort() }, [loadTree])
  useEffect(() => { setPage(1); setSelectedRows({}); void loadQuestions(); return () => questionsController.current?.abort() }, [loadQuestions])
  useEffect(() => { setKeyword(params.get('keyword') ?? '') }, [params])

  const refreshAll = async () => { await Promise.all([loadLibraries(), loadTree(), loadQuestions()]) }
  const selectedLibrary = libraries.find((item) => item.id === selectedLibraryId)
  const selectedPoint = selection.kind === 'point' ? findPoint(tree, selection.id) : undefined
  const importBlocked = !selectedLibrary || ['archived', 'deleted'].includes(selectedLibrary.status)

  const openCreateContent = (kind: 'module' | 'point', moduleId?: number) => {
    setEditingContent(null)
    setContentParentModule(moduleId)
    contentForm.resetFields()
    contentForm.setFieldsValue({ module_id: moduleId, sort_order: 0 })
    setContentModalOpen(true)
    contentForm.setFieldValue('_kind', kind)
  }

  const openEditContent = (value: QuizModule | QuizKnowledgePoint, kind: 'module' | 'point') => {
    setEditingContent({ kind, value } as EditingContent)
    setContentParentModule(kind === 'point' ? (value as QuizKnowledgePoint).module_id : undefined)
    contentForm.setFieldsValue({ _kind: kind, name: value.name, description: value.description ?? undefined, sort_order: value.sort_order, module_id: kind === 'point' ? (value as QuizKnowledgePoint).module_id : undefined })
    setContentModalOpen(true)
  }

  const saveContent = async () => {
    if (!selectedLibraryId) return
    try {
      const values = await contentForm.validateFields()
      const kind = values._kind as 'module' | 'point'
      if (!editingContent) {
        if (kind === 'module') await quizService.createModule({ library_id: selectedLibraryId, name: values.name.trim(), description: values.description?.trim() || null, sort_order: values.sort_order ?? 0 })
        else await quizService.createKnowledgePoint({ module_id: values.module_id, name: values.name.trim(), description: values.description?.trim() || null, sort_order: values.sort_order ?? 0 })
      } else if (editingContent.kind === 'module') {
        const item = editingContent.value
        await quizService.updateModule(item.id, { lock_version: item.lock_version, name: values.name.trim(), description: values.description?.trim() || null, sort_order: values.sort_order ?? 0 })
      } else {
        const item = editingContent.value
        await quizService.updateKnowledgePoint(item.id, { lock_version: item.lock_version, module_id: values.module_id, name: values.name.trim(), description: values.description?.trim() || null, sort_order: values.sort_order ?? 0 })
      }
      setContentModalOpen(false)
      await loadTree()
      message.success(editingContent ? '内容节点已更新' : '内容节点已创建')
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      if (isConflictError(error)) { await loadTree(); message.warning('节点版本已变化，树已刷新') }
      else message.error(errorText(error))
    }
  }

  const runContentAction = async (kind: 'module' | 'point', item: QuizModule | QuizKnowledgePoint, action: 'toggle' | 'delete' | 'undo') => {
    try {
      if (kind === 'module') {
        const module = item as QuizModule
        if (action === 'toggle') await quizService.updateModuleStatus(module.id, module.status === 'active' ? 'disabled' : 'active', module.lock_version)
        else if (action === 'delete') await quizService.deleteModule(module.id, module.lock_version)
        else await quizService.undoDeleteModule(module.id, module.lock_version)
      } else {
        const point = item as QuizKnowledgePoint
        if (action === 'toggle') await quizService.updateKnowledgePointStatus(point.id, point.status === 'active' ? 'disabled' : 'active', point.lock_version)
        else if (action === 'delete') await quizService.deleteKnowledgePoint(point.id, point.lock_version)
        else await quizService.undoDeleteKnowledgePoint(point.id, point.lock_version)
      }
      await loadTree()
      message.success(action === 'delete' ? '已删除，可在 7 天内撤销' : action === 'undo' ? '已撤销删除，节点保持停用' : '状态已更新')
    } catch (error) {
      if (isConflictError(error)) { await loadTree(); message.warning('节点版本已变化，树已刷新') }
      else message.error(errorText(error))
      throw error
    }
  }

  const confirmContentAction = (kind: 'module' | 'point', item: QuizModule | QuizKnowledgePoint, action: 'toggle' | 'delete' | 'undo') => {
    const label = kind === 'module' ? '模块' : '知识点'
    const target = action === 'toggle' ? (item.status === 'active' ? '停用' : '启用') : action === 'delete' ? '删除' : '撤销删除'
    const warning = action === 'delete'
      ? `只有已停用且为空的${label}可删除；服务端不会级联删除。删除后有 7 天撤销期。`
      : action === 'toggle' && item.status === 'active'
        ? `${label}停用后会从新题池隐藏，但不会覆盖既有会话和历史快照。`
        : action === 'undo' ? `撤销后${label}恢复为停用状态，不会自动启用。` : `父级仍停用时，子项自身启用也不会进入新题池。`
    const isPublishedContentDisable = action === 'toggle' && item.status === 'active' && selectedLibrary?.status === 'published'
    Modal.confirm({
      title: `${target}${label}「${item.name}」？`,
      content: <Space direction="vertical" style={{ width: '100%' }}>
        {isPublishedContentDisable && <Alert type="error" showIcon message="高风险：正在停用已发布题库的有效内容" description="服务端会重新计算剩余有效题池；如果该操作会使题库失去最后一条“模块 → 知识点 → 已发布题目”路径，将拒绝执行。紧急清空请先停用题库。" />}
        <span>{warning}</span>
      </Space>,
      okText: `确认${target}`,
      okButtonProps: { danger: target === '停用' || action === 'delete' },
      onOk: () => runContentAction(kind, item, action),
    })
  }

  const titleActions = (kind: 'module' | 'point', item: QuizModule | QuizKnowledgePoint) => canWrite ? <Space size={0} onClick={(event) => event.stopPropagation()}>
    {kind === 'module' && item.status !== 'deleted' && <Tooltip title="新增知识点"><Button aria-label={`为模块${item.name}新增知识点`} type="text" size="small" icon={<PlusOutlined />} disabled={item.status !== 'active'} onClick={() => openCreateContent('point', item.id)} /></Tooltip>}
    {item.status !== 'deleted' && item.system_kind === 'none' && <Button aria-label={`编辑${kind === 'module' ? '模块' : '知识点'}${item.name}`} type="text" size="small" icon={<EditOutlined />} onClick={() => openEditContent(item, kind)} />}
    {item.status !== 'deleted' && item.system_kind === 'none' && <Button aria-label={`${item.status === 'active' ? '停用' : '启用'}${kind === 'module' ? '模块' : '知识点'}${item.name}`} type="text" size="small" icon={item.status === 'active' ? <StopOutlined /> : <UndoOutlined />} onClick={() => confirmContentAction(kind, item, 'toggle')} />}
    {item.status === 'disabled' && item.system_kind === 'none' && <Button aria-label={`删除${kind === 'module' ? '模块' : '知识点'}${item.name}`} danger type="text" size="small" icon={<DeleteOutlined />} onClick={() => confirmContentAction(kind, item, 'delete')} />}
    {item.status === 'deleted' && <Button aria-label={`撤销删除${kind === 'module' ? '模块' : '知识点'}${item.name}`} type="text" size="small" disabled={!canUndo(item.restore_until)} onClick={() => confirmContentAction(kind, item, 'undo')}>撤销</Button>}
  </Space> : null

  const treeData: DataNode[] = [
    { key: 'all', title: '整库全部题目', icon: <FolderOpenOutlined /> },
    ...(tree?.modules.map((module) => ({
      key: `module:${module.id}`,
      disabled: module.status === 'deleted',
      title: <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span>{module.name}</span>{module.system_kind !== 'none' && <Tag color="warning">待整理</Tag>}{module.status !== 'active' && <Tag>{module.status === 'deleted' ? '已删除' : '停用'}</Tag>}<Tag color="blue">{module.question_count} 题</Tag>{titleActions('module', module)}</div>,
      children: module.knowledge_points.map((point) => ({
        key: `point:${point.id}`,
        disabled: point.status === 'deleted',
        title: <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span>{point.name}</span>{point.system_kind !== 'none' && <Tag color="warning">未分类</Tag>}{point.status !== 'active' && <Tag>{point.status === 'deleted' ? '已删除' : '停用'}</Tag>}<Tag>{point.question_count} 题</Tag>{titleActions('point', point)}</div>,
      })),
    })) ?? []),
  ]

  const selectNode = (keys: React.Key[]) => {
    const key = String(keys[0] ?? 'all')
    if (key.startsWith('module:')) updateParams({ module_id: Number(key.split(':')[1]), knowledge_point_id: undefined, question_id: undefined, include_deleted: undefined })
    else if (key.startsWith('point:')) updateParams({ module_id: undefined, knowledge_point_id: Number(key.split(':')[1]), question_id: undefined, include_deleted: undefined })
    else updateParams({ module_id: undefined, knowledge_point_id: undefined, question_id: undefined, include_deleted: undefined })
  }

  const openQuestion = (question?: QuizV2Question) => {
    setEditingQuestion(question ?? null)
    setQuestionModalOpen(true)
  }

  const runQuestion = async (question: QuizV2Question, action: 'publish' | 'disable' | 'restore' | 'delete' | 'undo') => {
    try {
      if (action === 'publish') await quizService.publishV2Question(question.id, question.lock_version)
      else if (action === 'disable') await quizService.disableV2Question(question.id, question.lock_version)
      else if (action === 'restore') await quizService.restoreV2Question(question.id, question.lock_version)
      else if (action === 'delete') await quizService.deleteQuestion(question.id, question.lock_version)
      else await quizService.undoDeleteQuestion(question.id, question.lock_version)
      setSelectedRows({})
      await Promise.all([loadQuestions(), loadTree(), loadLibraries()])
      message.success(action === 'publish' ? '待发布修订已发布' : action === 'delete' ? '题目已删除，可在 7 天内撤销' : action === 'undo' ? '已撤销删除，题目保持停用或草稿' : '题目状态已更新')
    } catch (error) {
      if (isConflictError(error)) { await loadQuestions(); message.warning('题目版本已变化，列表已刷新') }
      else message.error(errorText(error))
      throw error
    }
  }

  const confirmQuestion = (question: QuizV2Question, action: 'publish' | 'disable' | 'restore' | 'delete' | 'undo') => {
    const copy = action === 'publish'
      ? ['发布题目修订？', question.ever_published ? '仅切换未来会话使用的修订；已开始会话和历史快照保持原版本。停用题发布新修订后仍保持停用。' : '首次发布后题目进入可用题池。']
      : action === 'disable' ? ['停用题目？', '停用后从新题池隐藏，但已开始会话和历史快照不受影响。']
        : action === 'restore' ? ['恢复题目？', '恢复前会重新检查模块和知识点是否有效。']
          : action === 'delete' ? ['删除题目？', question.ever_published ? '已发布题必须先停用。删除后保留 7 天撤销期，历史快照不受影响。' : '从未发布草稿可删除，删除后保留 7 天撤销期。']
            : ['撤销删除题目？', '曾发布题恢复为停用；从未发布题恢复为草稿，不会自动进入题池。']
    const isPublishedContentDisable = action === 'disable' && selectedLibrary?.status === 'published'
    Modal.confirm({
      title: copy[0],
      content: <Space direction="vertical" style={{ width: '100%' }}>
        {isPublishedContentDisable && <Alert type="error" showIcon message="高风险：正在缩减已发布题库的有效题池" description="如果这是题库最后一道有效已发布题，服务端将拒绝停用。紧急清空请先停用题库。" />}
        <span>{copy[1]}</span>
      </Space>,
      okText: '确认执行',
      okButtonProps: { danger: ['disable', 'delete'].includes(action) },
      onOk: () => runQuestion(question, action),
    })
  }

  const openRevisions = useCallback(async (question: QuizV2Question) => {
    setViewing(question)
    setRevisionLoading(true)
    try { setRevisions(await quizService.listQuestionRevisions(question.id)) }
    catch (error) { message.error(errorText(error)) }
    finally { setRevisionLoading(false) }
  }, [])

  // 工单「处理」跳转：按题目 ID 定位到所属题库与知识点，并自动打开修订历史。
  useEffect(() => {
    if (focusQuestionId === undefined) { focusResolvedRef.current = null; return }
    if (!questions || focusResolvedRef.current === focusQuestionId) return
    focusResolvedRef.current = focusQuestionId
    const focused = questions.items.find((item) => item.id === focusQuestionId)
    if (!focused) {
      message.warning(`未找到题目 #${focusQuestionId}，可能不是新版题库题目或已被彻底删除`)
      updateParams({ question_id: undefined, include_deleted: undefined })
      return
    }
    updateParams({ library_id: focused.library_id, module_id: undefined, knowledge_point_id: focused.knowledge_point_id })
    void openRevisions(focused)
  }, [focusQuestionId, openRevisions, questions, updateParams])

  const batch = (action: 'publish' | 'disable') => {
    const rows = Object.values(selectedRows)
    const eligible = rows.filter((item) => action === 'publish' ? item.has_pending_revision && item.status !== 'deleted' : item.status === 'published')
    Modal.confirm({
      title: action === 'publish' ? `批量发布 ${eligible.length} 个修订？` : `批量停用 ${eligible.length} 道已发布题？`,
      content: <Space direction="vertical" style={{ width: '100%' }}>
        {action === 'disable' && selectedLibrary?.status === 'published' && <Alert type="error" showIcon message="高风险：正在批量缩减已发布题库的有效题池" description="服务端会重新计算整批操作后的剩余题池；若题库将失去最后一条有效内容路径，整批拒绝且不提交。紧急清空请先停用题库。" />}
        <span>仅处理当前页明确勾选的项目，最多 100 条。服务端会在单一事务中逐项重新校验，任一失败则整批不变。</span>
      </Space>,
      okText: action === 'publish' ? '确认发布' : '确认停用',
      okButtonProps: { danger: action === 'disable', disabled: eligible.length === 0 },
      onOk: async () => {
        let result: BatchResponse
        try {
          result = action === 'publish'
            ? await quizService.batchPublish({ items: eligible.map((item) => ({ question_id: item.id, lock_version: item.lock_version })) })
            : await quizService.batchDisable({ items: eligible.map((item) => ({ question_id: item.id, lock_version: item.lock_version })) })
        } catch (error) {
          if (isConflictError(error)) { await loadQuestions(); setSelectedRows({}); message.warning('版本冲突，列表已刷新；未自动重试') }
          else if (isRateLimitError(error)) message.warning(errorText(error))
          throw error
        }
        if (!result.succeeded) {
          Modal.error({ title: '批量操作未完成（整批未提交）', content: <ul>{result.errors.map((item) => <li key={item.question_id}>题目 #{item.question_id}{item.field ? `：${item.field}` : ''}：{item.message}</li>)}</ul> })
          return
        }
        setSelectedRows({})
        await Promise.all([loadQuestions(), loadTree(), loadLibraries()])
        message.success(`已更新 ${result.updated_count} 道题`)
      },
    })
  }

  const columns: ColumnsType<QuizV2Question> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '题干', dataIndex: 'question_text', ellipsis: true, width: 330, render: (value: string, item) => <Button type="link" style={{ padding: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => void openRevisions(item)}>{value}</Button> },
    { title: '知识点', dataIndex: 'knowledge_point_id', width: 180, render: (id: number) => { const point = findPoint(tree, id); const module = point ? findModule(tree, point.module_id) : undefined; return point ? `${module?.name ?? ''} / ${point.name}` : `#${id}` } },
    { title: '题型', dataIndex: 'question_type', width: 90, render: (value: QuizV2Question['question_type']) => typeLabels[value] },
    { title: '状态', dataIndex: 'status', width: 90, render: (value: QuizV2Question['status']) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag> },
    { title: '修订', key: 'revision', width: 160, render: (_, item) => <Space direction="vertical" size={0}><span>线上 v{item.current_revision_no ?? '-'}</span>{item.has_pending_revision && <Tag color="processing">待发布 v{item.pending_revision_no}</Tag>}</Space> },
    { title: '版本', dataIndex: 'lock_version', width: 70 },
    { title: '更新时间', dataIndex: 'updated_at', width: 170, render: (value: string) => formatDate(value) },
    { title: '操作', key: 'actions', width: 300, fixed: 'right', render: (_, item) => <Space size={0} wrap>
      {canWrite && item.status !== 'deleted' && <Button type="link" size="small" onClick={() => openQuestion(item)}>编辑</Button>}
      {canPublish && item.has_pending_revision && item.status !== 'deleted' && <Button type="link" size="small" onClick={() => confirmQuestion(item, 'publish')}>发布修订</Button>}
      {canPublish && item.status === 'published' && <Button type="link" size="small" danger onClick={() => confirmQuestion(item, 'disable')}>停用</Button>}
      {canPublish && item.status === 'disabled' && <Button type="link" size="small" onClick={() => confirmQuestion(item, 'restore')}>恢复</Button>}
      {canWrite && ((item.status === 'draft' && !item.ever_published) || item.status === 'disabled') && <Button type="link" size="small" danger onClick={() => confirmQuestion(item, 'delete')}>删除</Button>}
      {canWrite && item.status === 'deleted' && <Button type="link" size="small" disabled={!canUndo(item.restore_until)} onClick={() => confirmQuestion(item, 'undo')}>撤销删除</Button>}
    </Space> },
  ]

  const rowSelection: TableRowSelection<QuizV2Question> = {
    selectedRowKeys: Object.keys(selectedRows).map(Number),
    getCheckboxProps: (item) => ({ disabled: item.status === 'deleted' }),
    onSelect: (item, checked) => setSelectedRows((current) => { const next = { ...current }; if (checked) { if (Object.keys(next).length >= 100) { message.warning('每次最多选择 100 道题'); return current } next[item.id] = item } else delete next[item.id]; return next }),
    onSelectAll: (checked, _rows, changeRows) => setSelectedRows((current) => { const next = { ...current }; changeRows.forEach((item) => { if (checked && Object.keys(next).length < 100) next[item.id] = item; else if (!checked) delete next[item.id] }); return next }),
  }

  return (
    <PageContainer title="题库内容工作台">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert type="info" showIcon message="固定层级：题库 → 模块 → 知识点 → 题目" description="题库和模块不能直接挂题。点击模块可查看整个模块题目；新增单题必须选择知识点，导入文件则自行携带完整的“模块 / 知识点”路径。发布后编辑生成待发布修订，不覆盖线上版本。" />
        <Space wrap>
          <Select aria-label="选择题库" showSearch optionFilterProp="label" placeholder="先选择题库" value={selectedLibraryId} onChange={(library_id) => updateParams({ library_id, module_id: undefined, knowledge_point_id: undefined, question_id: undefined, include_deleted: undefined })} options={libraries.filter((item) => item.status !== 'deleted').map((item) => ({ value: item.id, label: `${item.name} (${item.library_code})` }))} style={{ width: 360 }} />
          {selectedLibrary && <><Tag color={selectedLibrary.status === 'published' ? 'success' : 'default'}>{selectedLibrary.status}</Tag><Tag color={selectedLibrary.v2_enabled ? 'blue' : 'default'}>V2 {selectedLibrary.v2_enabled ? '已开放' : '未开放'}</Tag></>}
          <Button icon={<ReloadOutlined />} onClick={() => void refreshAll()}>刷新</Button>
        </Space>
        {!selectedLibraryId ? (focusQuestionId
          ? <Alert type="info" showIcon message={`正在定位题目 #${focusQuestionId}…`} />
          : <Alert type="warning" message="请先在“题库”页面创建并选择一个题库" />) : <Row gutter={16} align="top">
          <Col xs={24} lg={7} xl={6}>
            <Card size="small" title="模块与知识点" loading={treeLoading} extra={canWrite && selectedLibrary && !['archived', 'deleted'].includes(selectedLibrary.status) ? <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => openCreateContent('module')}>新增模块</Button> : undefined}>
              <Tree showLine blockNode defaultExpandAll treeData={treeData} selectedKeys={[selection.kind === 'all' ? 'all' : `${selection.kind}:${selection.id}`]} onSelect={selectNode} style={{ maxHeight: 'calc(100vh - 340px)', overflow: 'auto' }} />
            </Card>
          </Col>
          <Col xs={24} lg={17} xl={18}>
            <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
              <Space wrap>
                <Input.Search allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={(value) => updateParams({ keyword: value.trim() || undefined, question_id: undefined })} placeholder="搜索题干" style={{ width: 220 }} />
                <Select aria-label="题目题型" allowClear placeholder="题型" value={params.get('question_type') || undefined} onChange={(question_type) => updateParams({ question_type, question_id: undefined })} options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))} style={{ width: 120 }} />
                <Select aria-label="题目状态" allowClear placeholder="状态" value={params.get('status') || undefined} onChange={(status) => updateParams({ status, include_deleted: status === 'deleted' ? 'true' : undefined, question_id: undefined })} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} style={{ width: 120 }} />
              </Space>
              <Space wrap>
                {Object.keys(selectedRows).length > 0 && <><Button disabled={!canPublish} onClick={() => batch('publish')}>批量发布修订 ({Object.keys(selectedRows).length})</Button><Button danger disabled={!canPublish} onClick={() => batch('disable')}>批量停用</Button></>}
                {canImport && <Tooltip title={importBlocked ? '只有未归档、未删除的题库可以创建导入任务' : '导入文件需包含完整的“模块 / 知识点”路径'}><Button icon={<UploadOutlined />} disabled={importBlocked} onClick={() => navigate(`/admin/quiz/imports?library_id=${selectedLibraryId}`)}>导入</Button></Tooltip>}
                {canWrite && <Tooltip title={!selectedPoint ? '题目只能挂到知识点，请先选择知识点' : undefined}><Button type="primary" icon={<PlusOutlined />} disabled={!selectedPoint || selectedPoint.status !== 'active'} onClick={() => openQuestion()}>新增题目</Button></Tooltip>}
              </Space>
            </Space>
            {selection.kind !== 'point' && <Alert style={{ marginBottom: 12 }} type="warning" showIcon message={selection.kind === 'module' ? '当前展示整个模块的题目；新增单题仍需选择知识点，导入可直接选择当前题库。' : '当前展示整库题目；新增单题仍需选择知识点，导入可直接选择当前题库。'} />}
            {focusQuestionId && <Alert style={{ marginBottom: 12 }} type="info" showIcon closable message={`题目 #${focusQuestionId} 定位模式`} description="当前列表仅显示该题目，修订历史已自动打开；修正后可点击「已解决」闭环工单，或关闭本提示恢复完整列表。" onClose={() => updateParams({ question_id: undefined, include_deleted: undefined })} />}
            <Table<QuizV2Question> rowKey="id" loading={questionLoading} dataSource={questions?.items ?? []} columns={columns} scroll={{ x: 1450 }} rowSelection={canWrite ? rowSelection : undefined} pagination={{ current: questions?.page ?? page, pageSize: questions?.page_size ?? pageSize, total: questions?.total ?? 0, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], onChange: (nextPage, nextSize) => { setSelectedRows({}); setPage(nextSize !== pageSize ? 1 : nextPage); setPageSize(nextSize) } }} />
          </Col>
        </Row>}
      </Space>

      <Modal title={editingContent ? `编辑${editingContent.kind === 'module' ? '模块' : '知识点'}` : contentParentModule ? '新增知识点' : '新增模块'} open={contentModalOpen} onOk={saveContent} onCancel={() => setContentModalOpen(false)} destroyOnClose>
        <Form form={contentForm} layout="vertical">
          <Form.Item name="_kind" hidden><Input /></Form.Item>
          {(contentParentModule || editingContent?.kind === 'point') && <Form.Item name="module_id" label="所属模块" rules={[{ required: true }]}><Select options={(tree?.modules ?? []).filter((item) => item.status === 'active' && item.system_kind === 'none').map((item) => ({ value: item.id, label: item.name }))} /></Form.Item>}
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }, { max: 128 }]}><Input autoFocus /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} maxLength={256} showCount /></Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber precision={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <V2QuestionModal open={questionModalOpen} question={editingQuestion} modules={tree?.modules ?? []} defaultPointId={selectedPoint?.id} onClose={() => setQuestionModalOpen(false)} onSaved={async () => { setQuestionModalOpen(false); setEditingQuestion(null); await Promise.all([loadQuestions(), loadTree(), loadLibraries()]); message.success(editingQuestion ? '已创建待发布修订' : '题目草稿已创建') }} onConflict={() => { setQuestionModalOpen(false); void loadQuestions(); message.warning('题目版本已变化，列表已刷新') }} onNotFound={() => { setQuestionModalOpen(false); void refreshAll(); message.warning('题目或知识点不存在，数据已刷新') }} />

      <Drawer title={viewing ? `题目 #${viewing.id} · 修订历史` : '修订历史'} open={Boolean(viewing)} onClose={() => { setViewing(null); setRevisions([]) }} width={780}>
        {viewing && <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="逻辑题状态"><Tag color={statusColors[viewing.status]}>{statusLabels[viewing.status]}</Tag></Descriptions.Item>
          <Descriptions.Item label="乐观锁版本">{viewing.lock_version}</Descriptions.Item>
          <Descriptions.Item label="线上修订">v{viewing.current_revision_no ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="待发布修订">{viewing.pending_revision_no ? `v${viewing.pending_revision_no}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="题干" span={2}>{viewing.question_text}</Descriptions.Item>
          <Descriptions.Item label="删除撤销截止" span={2}>{viewing.restore_until ? formatDate(viewing.restore_until) : '-'}</Descriptions.Item>
        </Descriptions>}
        <Table<QuizQuestionRevision> rowKey="id" loading={revisionLoading} dataSource={revisions} pagination={false} columns={[
          { title: '修订', dataIndex: 'revision_no', width: 80, render: (value: number) => `v${value}` },
          { title: '状态', dataIndex: 'status', width: 110, render: (value: QuizQuestionRevision['status']) => <Tag>{value}</Tag> },
          { title: '题干', dataIndex: 'question_text' },
          { title: '发布时间', dataIndex: 'published_at', width: 170, render: (value: string | null) => value ? formatDate(value) : '-' },
          { title: '创建时间', dataIndex: 'created_at', width: 170, render: (value: string) => formatDate(value) },
        ]} />
      </Drawer>
    </PageContainer>
  )
}
