import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { BookOutlined, LinkOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/stores/authStore'
import { useReauthentication } from '@/hooks/useReauthentication'
import type {
  QuizCourseBinding,
  QuizCourseOption,
  QuizLibrary,
  QuizLibraryAccessMode,
  QuizLibraryCreate,
  QuizLibraryFilter,
  QuizLibraryLifecycleAction,
  QuizLibraryUpdate,
  QuizMigrationIssue,
  QuizMigrationReport,
} from '@/types/quiz'
import { ApiError, isConflictError, isNotFoundError } from '@/core/request'
import { formatDate } from '@/utils/format'

const statusLabels: Record<QuizLibrary['status'], string> = {
  draft: '草稿',
  published: '已发布',
  suspended: '已停用',
  archived: '已归档',
  deleted: '已删除',
}

const statusColors: Record<QuizLibrary['status'], string> = {
  draft: 'default',
  published: 'success',
  suspended: 'warning',
  archived: 'purple',
  deleted: 'error',
}

const accessLabels: Record<QuizLibraryAccessMode, string> = {
  access_mode_pending: '待确认',
  free: '免费题库',
  course_entitlement: '课程购买赠送',
}

const migrationIssueLabels: Record<string, string> = {
  question_attached_to_library: '题目原来直接挂在一级分类',
  question_attached_to_module: '题目原来直接挂在二级分类',
  invalid_legacy_hierarchy: '旧分类层级异常',
  duplicate_question_stem_in_library: '题库内存在重复题干',
}

function migrationPath(issue: QuizMigrationIssue) {
  const names = issue.original_path.map((node) => {
    if (typeof node.name === 'string') return node.name
    if (typeof node.id === 'number' || typeof node.id === 'string') return `#${node.id}`
    return null
  }).filter(Boolean)
  return names.length ? names.join(' / ') : '-'
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '请求失败'
}

const ALLOWED_TRANSITIONS: Record<QuizLibraryAccessMode, QuizLibraryAccessMode[]> = {
  access_mode_pending: ['free', 'course_entitlement'],
  free: ['course_entitlement'],
  course_entitlement: ['free'],
}

function convertWarning(_current: QuizLibraryAccessMode, target: QuizLibraryAccessMode): string {
  if (target === 'course_entitlement') return '切换后只有通过课程购买获得权益的用户可以练习该题库。免费用户将无法继续使用，请确保已配置有效的课程绑定。'
  return '切换后所有用户均可练习该题库。已有的课程权益记录不会删除，但权益不再是访问前提。'
}

function publicationBlockers(library: QuizLibrary) {
  const blockers: string[] = []
  if (!library.cover_url) blockers.push('缺少封面')
  if (!library.description) blockers.push('缺少简介')
  if (library.access_mode === 'access_mode_pending') blockers.push('访问模式未确认')
  if (library.open_migration_issue_count) blockers.push(`仍有 ${library.open_migration_issue_count} 个迁移问题`)
  if (!library.question_count) blockers.push('没有可发布题目路径')
  return blockers
}

function lifecycleCopy(library: QuizLibrary, action: QuizLibraryLifecycleAction) {
  if (action === 'reconcile_migration') return {
    title: `重新检查「${library.name}」的迁移问题？`,
    body: '系统会按当前内容重新判断：已移出系统“待整理 / 未分类”节点或已经删除的题目会关闭对应问题；尚未整理和重复题干问题继续保留。不会修改题目内容。',
    okText: '开始检查',
  }
  if (action === 'publish') return {
    title: `发布题库「${library.name}」？`,
    body: '发布前服务端会重新检查封面、简介、访问模式、迁移问题和有效的“模块 → 知识点 → 已发布题目”路径。发布后仍需单独开启 V2 用户入口。',
    okText: '确认发布',
  }
  if (action === 'suspend') return {
    title: `停用题库「${library.name}」？`,
    body: '题库会立即从新目录隐藏，V2 用户入口同时关闭；已开始会话保留快照并进入暂停语义。',
    okText: '确认停用',
  }
  if (action === 'restore') return {
    title: `恢复题库「${library.name}」？`,
    body: '恢复为已发布状态，但不会自动重新开启 V2 用户入口。服务端会重新执行发布阻断检查。',
    okText: '确认恢复',
  }
  if (action === 'archive') return {
    title: `归档题库「${library.name}」？`,
    body: '归档是不可恢复的业务终态。必须先停用全部已发布题目；归档后只能删除以便清理。',
    okText: '确认归档',
  }
  if (action === 'delete') return {
    title: `删除已归档题库「${library.name}」？`,
    body: '只有已归档题库可删除。删除后保留 7 天撤销期，超过期限后不能通过管理后台恢复。历史快照不会被覆盖。',
    okText: '确认删除',
  }
  return {
    title: `撤销删除题库「${library.name}」？`,
    body: '题库会恢复为“已归档”，不会重新发布或开放给用户。',
    okText: '撤销删除',
  }
}

export default function QuizLibraries() {
  const navigate = useNavigate()
  const canManage = usePermission('quiz_library_manage')
  const canBind = usePermission('course_quiz_bind')
  const isSuperAdmin = useAuthStore((s) => s.admin?.role === 'super_admin')
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const [convertTarget, setConvertTarget] = useState<QuizLibrary | null>(null)
  const [convertMode, setConvertMode] = useState<QuizLibraryAccessMode | undefined>(undefined)
  const [converting, setConverting] = useState(false)
  const [libraries, setLibraries] = useState<QuizLibrary[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<QuizLibraryFilter>({ include_deleted: false })
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QuizLibrary | null>(null)
  const [form] = Form.useForm()
  const [bindingLibrary, setBindingLibrary] = useState<QuizLibrary | null>(null)
  const [bindings, setBindings] = useState<QuizCourseBinding[]>([])
  const [courses, setCourses] = useState<QuizCourseOption[]>([])
  const [bindingCourseId, setBindingCourseId] = useState<number>()
  const [bindingLoading, setBindingLoading] = useState(false)
  const [migrationLibrary, setMigrationLibrary] = useState<QuizLibrary | null>(null)
  const [migrationReport, setMigrationReport] = useState<QuizMigrationReport | null>(null)
  const [migrationLoading, setMigrationLoading] = useState(false)
  const controller = useRef<AbortController>()

  const load = useCallback(async (nextFilter: QuizLibraryFilter = filter) => {
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setLoading(true)
    try {
      const result = await quizService.listLibraries(nextFilter, next.signal)
      if (!next.signal.aborted) setLibraries(result)
    } catch (error) {
      if (!next.signal.aborted) message.error(errorText(error))
    } finally {
      if (!next.signal.aborted) setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load(filter)
    return () => controller.current?.abort()
  }, [filter, load])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ access_mode: 'access_mode_pending', sort_order: 0 })
    setModalOpen(true)
  }

  const openEdit = (library: QuizLibrary) => {
    setEditing(library)
    form.setFieldsValue({
      name: library.name,
      description: library.description ?? undefined,
      cover_url: library.cover_url ?? undefined,
      details: library.details ?? undefined,
      access_mode: library.access_mode,
      sort_order: library.sort_order,
    })
    setModalOpen(true)
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      if (!editing) {
        const payload: QuizLibraryCreate = {
          name: values.name.trim(),
          description: values.description?.trim() || null,
          cover_url: values.cover_url?.trim() || null,
          details: values.details?.trim() || null,
          access_mode: values.access_mode,
          sort_order: values.sort_order ?? 0,
        }
        await quizService.createLibrary(payload)
        message.success('题库已创建')
      } else {
        const payload: QuizLibraryUpdate = { lock_version: editing.lock_version }
        const nextName = values.name.trim()
        const nextDescription = values.description?.trim() || null
        const nextCover = values.cover_url?.trim() || null
        const nextDetails = values.details?.trim() || null
        if (nextName !== editing.name) payload.name = nextName
        if (nextDescription !== editing.description) payload.description = nextDescription
        if (nextCover !== editing.cover_url) payload.cover_url = nextCover
        if (nextDetails !== editing.details) payload.details = nextDetails
        if (values.access_mode !== editing.access_mode) payload.access_mode = values.access_mode
        if ((values.sort_order ?? 0) !== editing.sort_order) payload.sort_order = values.sort_order ?? 0
        if (Object.keys(payload).length === 1) { setModalOpen(false); return }
        await quizService.updateLibrary(editing.id, payload)
        message.success('题库资料已更新')
      }
      setModalOpen(false)
      await load(filter)
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      if (isConflictError(error)) { await load(filter); message.warning('题库版本已变化，列表已刷新，请重新编辑') }
      else if (isNotFoundError(error)) { await load(filter); message.warning('题库不存在，列表已刷新') }
      else message.error(errorText(error))
    }
  }

  const transition = (library: QuizLibrary, action: QuizLibraryLifecycleAction) => {
    const copy = lifecycleCopy(library, action)
    const blockers = action === 'publish' || action === 'restore' ? publicationBlockers(library) : []
    Modal.confirm({
      title: copy.title,
      width: 620,
      okText: copy.okText,
      okButtonProps: { danger: ['suspend', 'archive', 'delete'].includes(action) },
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          {blockers.length > 0 && <Alert type="warning" showIcon message="当前预检存在阻断项" description={blockers.join('；')} />}
          <div>{copy.body}</div>
          <div style={{ color: '#8c8c8c' }}>执行时服务端会按最新版本和数据库状态重新校验。</div>
        </Space>
      ),
      onOk: async () => {
        try {
          const updated = await quizService.transitionLibrary(library.id, action, library.lock_version)
          await load(filter)
          if (action === 'reconcile_migration') {
            setMigrationLibrary(updated)
            setMigrationReport(await quizService.getMigrationReport())
            message.success(updated.open_migration_issue_count ? `检查完成，仍有 ${updated.open_migration_issue_count} 个问题` : '迁移问题已全部关闭')
          } else {
            message.success('题库状态已更新')
          }
        } catch (error) {
          if (isConflictError(error)) { await load(filter); message.warning('题库版本已变化，列表已刷新') }
          else message.error(errorText(error))
          throw error
        }
      },
    })
  }

  const toggleV2 = (library: QuizLibrary, enabled: boolean) => {
    Modal.confirm({
      title: enabled ? `开启「${library.name}」的 V2 用户入口？` : `关闭「${library.name}」的 V2 用户入口？`,
      width: 620,
      okText: enabled ? '确认开启' : '确认关闭',
      okButtonProps: { danger: !enabled },
      content: enabled
        ? '只有已发布且通过全部发布检查的题库可以开启。课程权益题库还必须至少绑定一门有效课程。开启后，有权益用户将可在小程序目录看到该题库。'
        : '关闭后题库会从用户目录隐藏；该操作不改变题库的发布状态和历史快照。',
      onOk: async () => {
        try {
          await quizService.updateLibrary(library.id, { lock_version: library.lock_version, v2_enabled: enabled })
          await load(filter)
          message.success(enabled ? 'V2 用户入口已开启' : 'V2 用户入口已关闭')
        } catch (error) {
          if (isConflictError(error)) { await load(filter); message.warning('题库版本已变化，列表已刷新') }
          else message.error(errorText(error))
          throw error
        }
      },
    })
  }

  const courseNameById = useMemo(() => new Map(courses.map((course) => [course.id, course.title])), [courses])

  const openBindings = async (library: QuizLibrary) => {
    setBindingLibrary(library)
    setBindingLoading(true)
    setBindingCourseId(undefined)
    try {
      const [nextBindings, courseOptions] = await Promise.all([
        quizService.listCourseBindings(library.id),
        quizService.listCourseOptions(),
      ])
      setBindings(nextBindings)
      setCourses(courseOptions)
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setBindingLoading(false)
    }
  }

  const createBinding = async () => {
    if (!bindingLibrary || !bindingCourseId) return
    setBindingLoading(true)
    try {
      const binding = await quizService.createCourseBinding(bindingLibrary.id, bindingCourseId)
      setBindings((current) => [...current, binding])
      setBindingCourseId(undefined)
      message.success('课程已绑定')
    } catch (error) {
      message.error(errorText(error))
    } finally { setBindingLoading(false) }
  }

  const toggleBinding = async (binding: QuizCourseBinding) => {
    setBindingLoading(true)
    try {
      const updated = await quizService.updateCourseBindingStatus(binding.id, binding.status === 'active' ? 'inactive' : 'active', binding.lock_version)
      setBindings((current) => current.map((item) => item.id === updated.id ? updated : item))
      message.success(updated.status === 'active' ? '课程绑定已启用' : '课程绑定已停用')
    } catch (error) {
      if (isConflictError(error) && bindingLibrary) setBindings(await quizService.listCourseBindings(bindingLibrary.id))
      message.error(errorText(error))
    } finally { setBindingLoading(false) }
  }

  const openMigrationReport = async (library: QuizLibrary) => {
    setMigrationLibrary(library)
    setMigrationReport(null)
    setMigrationLoading(true)
    try {
      setMigrationReport(await quizService.getMigrationReport())
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setMigrationLoading(false)
    }
  }

  const openConvertModal = (library: QuizLibrary) => {
    const targets = ALLOWED_TRANSITIONS[library.access_mode]
    if (!targets?.length) { message.warning('当前模式没有可转换的目标'); return }
    setConvertTarget(library)
    setConvertMode(undefined)
  }

  const doConvert = async () => {
    if (!convertTarget || !convertMode) return
    setConverting(true)
    try {
      const token = await ensureReauthenticated()
      if (!token) { setConverting(false); return }
      const result = await quizService.convertAccessMode(convertTarget.id, convertTarget.lock_version, convertMode, token)
      message.success(`访问模式已转换为「${accessLabels[result.library.access_mode]}」${result.sessions_affected ? `，${result.sessions_affected} 个进行中的练习会话已同步` : ''}`)
      setConvertTarget(null)
      setConvertMode(undefined)
      await load(filter)
    } catch (error) {
      if (isConflictError(error)) { await load(filter); message.warning('题库版本已变化，列表已刷新') }
      else message.error(errorText(error))
    } finally {
      setConverting(false)
    }
  }

  const actions = (library: QuizLibrary) => {
    const buttons = []
    if (canManage && !['archived', 'deleted'].includes(library.status)) buttons.push(<Button key="edit" type="link" size="small" onClick={() => openEdit(library)}>编辑</Button>)
    if (library.access_mode === 'course_entitlement') buttons.push(<Button key="binding" type="link" size="small" icon={<LinkOutlined />} onClick={() => void openBindings(library)}>课程绑定</Button>)
    if (isSuperAdmin && ALLOWED_TRANSITIONS[library.access_mode]?.length) buttons.push(<Button key="convert" type="link" size="small" icon={<SwapOutlined />} onClick={() => openConvertModal(library)}>转换模式</Button>)
    if (canManage && library.status === 'draft') buttons.push(<Button key="publish" type="link" size="small" onClick={() => transition(library, 'publish')}>发布</Button>)
    if (canManage && library.status === 'published') buttons.push(<Button key="suspend" type="link" size="small" danger onClick={() => transition(library, 'suspend')}>停用</Button>)
    if (canManage && library.status === 'suspended') buttons.push(<Button key="restore" type="link" size="small" onClick={() => transition(library, 'restore')}>恢复</Button>)
    if (canManage && ['published', 'suspended'].includes(library.status)) buttons.push(<Button key="archive" type="link" size="small" danger onClick={() => transition(library, 'archive')}>归档</Button>)
    if (canManage && library.status === 'archived') buttons.push(<Button key="delete" type="link" size="small" danger onClick={() => transition(library, 'delete')}>删除</Button>)
    if (canManage && library.status === 'deleted') buttons.push(<Button key="undo" type="link" size="small" disabled={!library.restore_until || Date.parse(library.restore_until) <= Date.now()} onClick={() => transition(library, 'undo_delete')}>撤销删除</Button>)
    return <Space size={0} wrap>{buttons}</Space>
  }

  const columns: ColumnsType<QuizLibrary> = [
    { title: '题库', key: 'library', width: 240, render: (_, item) => <Space direction="vertical" size={0}><strong>{item.name}</strong><span style={{ color: '#8c8c8c' }}>{item.library_code}</span></Space> },
    { title: '访问模式', dataIndex: 'access_mode', width: 140, render: (value: QuizLibraryAccessMode) => <Tag color={value === 'free' ? 'green' : value === 'course_entitlement' ? 'blue' : 'default'}>{accessLabels[value]}</Tag> },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: QuizLibrary['status']) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag> },
    { title: 'V2 用户入口', key: 'v2', width: 130, render: (_, item) => <Tooltip title={item.status !== 'published' ? '仅已发布题库可以开启' : undefined}><Switch checked={item.v2_enabled} disabled={!canManage || (item.status !== 'published' && !item.v2_enabled)} onChange={(checked) => toggleV2(item, checked)} /></Tooltip> },
    { title: '内容', key: 'content', width: 190, render: (_, item) => `${item.module_count} 模块 / ${item.knowledge_point_count} 知识点 / ${item.question_count} 题` },
    { title: '迁移问题', dataIndex: 'open_migration_issue_count', width: 110, render: (value: number, item) => value ? <Button type="link" danger size="small" onClick={() => void openMigrationReport(item)}>{value} 项</Button> : <Tag color="success">无</Tag> },
    { title: '更新时间', dataIndex: 'updated_at', width: 170, render: (value: string) => formatDate(value) },
    { title: '操作', key: 'actions', width: 330, fixed: 'right', render: (_, item) => actions(item) },
  ]

  return (
    <PageContainer
      title="题库"
      extra={canManage ? <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建题库</Button> : undefined}
    >
      <Alert
        type="info"
        showIcon
        icon={<BookOutlined />}
        style={{ marginBottom: 16 }}
        message="题库是内容与课程权益边界"
        description="只有知识点可以挂题。发布与开启 V2 用户入口是两个独立步骤；课程购买赠送题库还需配置有效课程绑定。归档为业务终态，只有归档题库可以删除。"
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} onPressEnter={() => setFilter((current) => ({ ...current, keyword: keyword.trim() || undefined }))} allowClear prefix={<SearchOutlined />} placeholder="题库名称或编码" style={{ width: 240 }} />
        <Select allowClear placeholder="状态" value={filter.status} onChange={(status) => setFilter((current) => ({ ...current, status }))} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} style={{ width: 130 }} />
        <Select allowClear placeholder="访问模式" value={filter.access_mode} onChange={(access_mode) => setFilter((current) => ({ ...current, access_mode }))} options={Object.entries(accessLabels).map(([value, label]) => ({ value, label }))} style={{ width: 170 }} />
        <Space><Switch checked={filter.include_deleted} onChange={(include_deleted) => setFilter((current) => ({ ...current, include_deleted }))} />显示已删除</Space>
        <Button type="primary" onClick={() => setFilter((current) => ({ ...current, keyword: keyword.trim() || undefined }))}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={() => void load(filter)}>刷新</Button>
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={libraries} scroll={{ x: 1280 }} pagination={false} />

      <Drawer
        title={migrationLibrary ? `迁移问题 · ${migrationLibrary.name}` : '迁移问题'}
        open={Boolean(migrationLibrary)}
        onClose={() => { setMigrationLibrary(null); setMigrationReport(null) }}
        width={860}
        extra={migrationLibrary && <Space>
          <Button onClick={() => navigate(`/admin/quiz/questions?library_id=${migrationLibrary.id}`)}>前往内容工作台</Button>
          {canManage && <Button type="primary" loading={migrationLoading} disabled={migrationLibrary.status !== 'draft'} onClick={() => transition(migrationLibrary, 'reconcile_migration')}>重新检查</Button>}
        </Space>}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="迁移问题必须按当前内容重新检查后才会关闭"
          description="请先把题目从系统“待整理 / 未分类”节点移动到普通知识点，或删除不再保留的题目。重复题干需要删除或改写其中一题。完成后点击“重新检查”。"
        />
        <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="迁移状态">{migrationLibrary?.migration_state ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="当前问题">{migrationReport?.issues.filter((item) => item.library_id === migrationLibrary?.id).length ?? migrationLibrary?.open_migration_issue_count ?? 0}</Descriptions.Item>
          <Descriptions.Item label="报告时间">{migrationReport ? formatDate(migrationReport.generated_at) : '-'}</Descriptions.Item>
        </Descriptions>
        <Table<QuizMigrationIssue>
          rowKey="id"
          size="small"
          loading={migrationLoading}
          pagination={false}
          dataSource={migrationReport?.issues.filter((item) => item.library_id === migrationLibrary?.id) ?? []}
          locale={{ emptyText: '当前没有未处理迁移问题' }}
          columns={[
            { title: '级别', dataIndex: 'severity', width: 80, render: (value: QuizMigrationIssue['severity']) => <Tag color={value === 'blocking' ? 'error' : 'warning'}>{value === 'blocking' ? '阻断' : '警告'}</Tag> },
            { title: '对象', key: 'object', width: 110, render: (_, item) => `${item.legacy_object_type === 'question' ? '题目' : '分类'} #${item.legacy_id}` },
            { title: '问题', dataIndex: 'issue_code', width: 190, render: (value: string) => migrationIssueLabels[value] ?? value },
            { title: '原路径', key: 'path', width: 180, render: (_, item) => migrationPath(item) },
            { title: '处理方式', dataIndex: 'resolution' },
          ]}
        />
      </Drawer>

      <Modal title={editing ? `编辑题库「${editing.name}」` : '新建题库'} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={680} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="题库名称" rules={[{ required: true, message: '请输入题库名称' }, { max: 128 }]}><Input autoFocus /></Form.Item>
          <Form.Item name="description" label="简介" rules={[{ max: 512 }]}><Input.TextArea rows={2} showCount maxLength={512} /></Form.Item>
          <Form.Item name="cover_url" label="封面 URL" rules={[{ max: 512 }]}><Input placeholder="发布前必填" /></Form.Item>
          <Form.Item name="details" label="详细说明" rules={[{ max: 10000 }]}><Input.TextArea rows={5} showCount maxLength={10000} /></Form.Item>
          <Form.Item name="access_mode" label="访问模式" rules={[{ required: true }]}>
            <Select options={Object.entries(accessLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber precision={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <Drawer title={bindingLibrary ? `课程绑定 · ${bindingLibrary.name}` : '课程绑定'} open={Boolean(bindingLibrary)} onClose={() => setBindingLibrary(null)} width={680}>
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="绑定只影响课程购买完成后的题库权益发放" description="停用绑定不会修改其他课程或其他订单来源的既有权益。V2 用户入口开启时，课程权益题库必须至少保留一个有效绑定。" />
        {canBind && <Space style={{ marginBottom: 16 }}>
          <Select showSearch optionFilterProp="label" placeholder="选择课程" value={bindingCourseId} onChange={setBindingCourseId} options={courses.map((course) => ({ value: course.id, label: `${course.title} (#${course.id})` }))} style={{ width: 390 }} />
          <Button type="primary" loading={bindingLoading} disabled={!bindingCourseId} onClick={() => void createBinding()}>绑定课程</Button>
        </Space>}
        <Table<QuizCourseBinding>
          rowKey="id"
          loading={bindingLoading}
          pagination={false}
          dataSource={bindings}
          columns={[
            { title: '课程', dataIndex: 'course_id', render: (id: number) => courseNameById.get(id) ? `${courseNameById.get(id)} (#${id})` : `课程 #${id}` },
            { title: '状态', dataIndex: 'status', width: 100, render: (status: QuizCourseBinding['status']) => <Tag color={status === 'active' ? 'success' : 'default'}>{status === 'active' ? '有效' : '停用'}</Tag> },
            { title: '版本', dataIndex: 'lock_version', width: 70 },
            { title: '操作', width: 100, render: (_, item) => canBind ? <Button type="link" size="small" danger={item.status === 'active'} onClick={() => void toggleBinding(item)}>{item.status === 'active' ? '停用' : '启用'}</Button> : null },
          ]}
        />
        {bindingLibrary && <Descriptions bordered size="small" column={1} style={{ marginTop: 20 }}>
          <Descriptions.Item label="题库编码">{bindingLibrary.library_code}</Descriptions.Item>
          <Descriptions.Item label="V2 用户入口">{bindingLibrary.v2_enabled ? '已开启' : '已关闭'}</Descriptions.Item>
        </Descriptions>}
      </Drawer>
      {convertTarget && (
        <Modal
          title={`转换「${convertTarget.name}」的访问模式`}
          open
          okText="确认转换"
          okButtonProps={{ danger: true, loading: converting }}
          onCancel={() => { setConvertTarget(null); setConvertMode(undefined) }}
          onOk={() => void doConvert()}
          width={560}
          destroyOnClose
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>当前模式：<Tag color={convertTarget.access_mode === 'free' ? 'green' : convertTarget.access_mode === 'course_entitlement' ? 'blue' : 'default'}>{accessLabels[convertTarget.access_mode]}</Tag></div>
            <div>
              目标模式：
              <Select
                style={{ width: 200 }}
                placeholder="选择目标模式"
                value={convertMode}
                onChange={setConvertMode}
                options={
                  (ALLOWED_TRANSITIONS[convertTarget.access_mode] ?? [])
                    .map((mode) => ({ value: mode, label: accessLabels[mode] }))
                }
              />
            </div>
            {convertMode && <Alert type="warning" showIcon message={convertWarning(convertTarget.access_mode, convertMode)} />}
          </Space>
        </Modal>
      )}
      {reauthDialog}
    </PageContainer>
  )
}
