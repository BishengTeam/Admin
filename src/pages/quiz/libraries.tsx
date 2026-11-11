import { PublicationDialog } from './components/PublicationDialog'
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
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { DownloadOutlined, KeyOutlined, LinkOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import { ImageUpload } from '@/components/ImageUpload'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/stores/authStore'
import { useReauthentication } from '@/hooks/useReauthentication'
import type { PageData } from '@/types/api'
import type {
  QuizActivationCode,
  QuizActivationCodeStatus,
  QuizActivationCodeGenerateResponse,
  QuizActivationValidityDays,
  QuizCourseBinding,
  QuizCourseOption,
  QuizLibrary,
  QuizLibraryAccessMode,
  QuizLibraryCreate,
  QuizLibraryFilter,
  QuizLibraryView,
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
  paid: '付费题库',
  activation_code: '激活码解锁',
}

const activationCodeStatusLabels: Record<QuizActivationCodeStatus, string> = {
  issued: '可兑换',
  redeemed: '已兑换',
  revoked: '已作废',
}

const activationValidityOptions: { value: QuizActivationValidityDays; label: string }[] = [
  { value: 1, label: '1 天' },
  { value: 3, label: '3 天' },
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天' },
  { value: 60, label: '60 天' },
  { value: 90, label: '90 天' },
  { value: 365, label: '1 年（365 天）' },
]

const vendorLabels: Record<QuizLibrary['vendor_tag'], string> = {
  h3c: 'H3C',
  nisp: 'NISP',
  sangfor: '深信服',
  none: '其他',
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

// 与后端转换规则对齐；paid 使用积分商城兑换，现金购买保持关闭。
const ALLOWED_TRANSITIONS: Record<QuizLibraryAccessMode, QuizLibraryAccessMode[]> = {
  access_mode_pending: ['free', 'course_entitlement', 'paid', 'activation_code'],
  free: ['course_entitlement', 'paid', 'activation_code'],
  course_entitlement: ['free', 'paid', 'activation_code'],
  paid: ['free', 'course_entitlement', 'activation_code'],
  activation_code: ['free', 'course_entitlement', 'paid'],
}

function convertWarning(_current: QuizLibraryAccessMode, target: QuizLibraryAccessMode): string {
  if (target === 'course_entitlement') return '切换后需要课程权益才能练习。若尚未绑定课程，请先关闭用户入口，再切换模式并绑定课程，完成后重新开启。'
  if (target === 'activation_code') return '切换后题库对所有用户可见，但只有兑换激活码的用户可以练习。请先在「激活码」面板批量生成激活码并交发放方。'
  if (target === 'paid') return '切换后需通过积分商城兑换权益才能练习。请填写题库价格，并在积分商城配置题库商品及兑换积分。'
  return '切换后所有用户均可练习该题库。已有的课程权益记录不会删除，但权益不再是访问前提。'
}

function lifecycleCopy(library: QuizLibrary, action: QuizLibraryLifecycleAction) {
  if (action === 'reconcile_migration') return {
    title: `重新检查「${library.name}」的迁移问题？`,
    body: '系统会按当前内容重新判断：已移出系统“待整理 / 未分类”节点或已经删除的题目会关闭对应问题；尚未整理和重复题干问题继续保留。不会修改题目内容。',
    okText: '开始检查',
  }
  if (action === 'publish') return {
    title: `发布题库「${library.name}」？`,
    body: '发布前服务端会重新检查访问模式、迁移问题和有效的“模块 → 知识点 → 已发布题目”路径。发布后仍需单独开启 V2 用户入口。',
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
  if (action === 'delete') {
    if (library.status === 'draft') return {
      title: `将未发布题库「${library.name}」移入回收站？`,
      body: '未发布题库可整体移入回收站。删除后保留 30 个自然日撤销期，期间可在「回收站」恢复为草稿；到期未恢复将被自动清理（题库内容不为空时保留墓碑记录）。历史快照不会被覆盖。',
      okText: '移入回收站',
    }
    return {
      title: `将已归档题库「${library.name}」移入回收站？`,
      body: '删除后保留 30 个自然日撤销期，超过期限后不能通过管理后台恢复。历史快照不会被覆盖。',
      okText: '移入回收站',
    }
  }
  return {
    title: `撤销删除题库「${library.name}」？`,
    body: library.archived_at == null
      ? '题库会恢复为“草稿”（删自未发布状态），不会发布或开放给用户。'
      : '题库会恢复为“已归档”，不会重新发布或开放给用户。',
    okText: '撤销删除',
  }
}

export default function QuizLibraries() {
  const [publicationLibrary, setPublicationLibrary] = useState<number>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const requestedView = params.get('library_view')
  // 回收站/归档已统一迁移到一级菜单「回收站」页；旧深链在渲染末尾重定向
  const legacyTrashView = requestedView === 'archived' || requestedView === 'trash'
  const view: QuizLibraryView = 'working'
  const [record, setRecord] = useState<QuizLibrary | null>(null)
  const [now, setNow] = useState(Date.now)
  const canManage = usePermission('quiz_library_manage')
  const canBind = usePermission('course_quiz_bind')
  const isSuperAdmin = useAuthStore((s) => s.admin?.role === 'super_admin')
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const [convertTarget, setConvertTarget] = useState<QuizLibrary | null>(null)
  const [convertMode, setConvertMode] = useState<QuizLibraryAccessMode | undefined>(undefined)
  const [convertPrice, setConvertPrice] = useState<number>()
  const [convertError, setConvertError] = useState('')
  const [converting, setConverting] = useState(false)
  const convertLock = useRef(false)
  const saveLock = useRef(false)
  const [saving, setSaving] = useState(false)
  const [libraries, setLibraries] = useState<QuizLibrary[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<QuizLibraryFilter>({})
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QuizLibrary | null>(null)
  const [form] = Form.useForm()
  const [bindingLibrary, setBindingLibrary] = useState<QuizLibrary | null>(null)
  const [bindings, setBindings] = useState<QuizCourseBinding[]>([])
  const [courses, setCourses] = useState<QuizCourseOption[]>([])
  const [bindingCourseId, setBindingCourseId] = useState<number>()
  const [bindingLoading, setBindingLoading] = useState(false)
  const [codeLibrary, setCodeLibrary] = useState<QuizLibrary | null>(null)
  const [codes, setCodes] = useState<PageData<QuizActivationCode> | null>(null)
  const [codeStatus, setCodeStatus] = useState<QuizActivationCodeStatus | undefined>(undefined)
  const [codePage, setCodePage] = useState(1)
  const [codesLoading, setCodesLoading] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<QuizActivationCodeGenerateResponse | null>(null)
  const [generateForm] = Form.useForm<{ generateMode: 'random' | 'custom'; quantity: number; validityDays: QuizActivationValidityDays; note?: string; customCode?: string }>()
  const validityDays = Form.useWatch('validityDays', generateForm)
  const generateMode = Form.useWatch('generateMode', generateForm)
  const codeRequest = useRef<AbortController>()
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
      const result = await quizService.listLibraries({ ...nextFilter, view, status: view === 'working' ? nextFilter.status : undefined, count_schema: 2 }, next.signal)
      if (!next.signal.aborted) setLibraries(result)
    } catch (error) {
      if (!next.signal.aborted) message.error(errorText(error))
    } finally {
      if (!next.signal.aborted) setLoading(false)
    }
  }, [filter, view])
  const loadCurrent = useRef(load)
  loadCurrent.current = load

  useEffect(() => {
    void load(filter)
    return () => controller.current?.abort()
  }, [filter, load])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ access_mode: 'access_mode_pending', vendor_tag: 'none', sort_order: 0, price_cents: 0 })
    setModalOpen(true)
  }

  const openEdit = (library: QuizLibrary) => {
    setEditing(library)
    form.resetFields()
    form.setFieldsValue({
      name: library.name,
      description: library.description ?? undefined,
      cover_url: library.cover_url ?? undefined,
      details: library.details ?? undefined,
      access_mode: library.access_mode,
      vendor_tag: library.vendor_tag,
      price_cents: library.price_cents ?? 0,
      sort_order: library.sort_order,
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (saveLock.current) return
    saveLock.current = true
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (!editing) {
        const payload: QuizLibraryCreate = {
          name: values.name.trim(),
          description: values.description?.trim() || null,
          cover_url: values.cover_url?.trim() || null,
          details: values.details?.trim() || null,
          access_mode: values.access_mode,
          price_cents: values.access_mode === 'paid' ? values.price_cents : 0,
          vendor_tag: values.vendor_tag ?? 'none',
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
        if (values.access_mode === 'paid' && values.price_cents !== editing.price_cents) payload.price_cents = values.price_cents
        if (values.vendor_tag !== editing.vendor_tag) payload.vendor_tag = values.vendor_tag
        if ((values.sort_order ?? 0) !== editing.sort_order) payload.sort_order = values.sort_order ?? 0
        if (Object.keys(payload).length === 1) { setModalOpen(false); return }
        await quizService.updateLibrary(editing.id, payload)
        message.success('题库资料已更新')
      }
      setModalOpen(false)
      await load(filter)
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      if (isConflictError(error) && editing) {
        try { openEdit(await quizService.getLibrary(editing.id)); message.warning('题库已更新，已加载最新资料，请核对后重新修改') }
        catch { setModalOpen(false); message.warning('无法加载最新题库，请刷新列表后重新编辑') }
        await load(filter)
      }
      else if (isNotFoundError(error)) { setModalOpen(false); await load(filter); message.warning('题库不存在，列表已刷新') }
      else message.error(errorText(error))
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }

  const archiveBlocked = (library: QuizLibrary, reason: string) => Modal.warning({
    title: '暂不能归档', content: reason, okText: '前往停用题目',
    onOk: () => navigate(`/admin/quiz/questions?tab=content&library_id=${library.id}&status=published`),
  })
  const transition = async (library: QuizLibrary, action: QuizLibraryLifecycleAction) => {
    const copy = lifecycleCopy(library, action)
    if (action === 'publish' || action === 'restore') { setPublicationLibrary(library.id); return }
    if (action === 'archive') {
      try {
        const questions = await quizService.listV2Questions({ library_id: library.id, status: 'published', page: 1, page_size: 1 })
        if (questions.total) { archiveBlocked(library, `还有 ${questions.total} 道已发布题目，请到内容工作台批量停用后再归档。`); return }
      } catch (error) { message.error(errorText(error)); return }
    }
    Modal.confirm({
      title: copy.title,
      width: 620,
      okText: copy.okText,
      okButtonProps: { danger: ['suspend', 'archive', 'delete'].includes(action) },
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>{copy.body}</div>
          <div style={{ color: '#8c8c8c' }}>执行时服务端会按最新版本和数据库状态重新校验。</div>
        </Space>
      ),
      onOk: async () => {
        try {
          const updated = await quizService.transitionLibrary(library.id, action, library.lock_version)
          await loadCurrent.current()
          if (action === 'reconcile_migration') {
            setMigrationLibrary(updated)
            setMigrationReport(await quizService.getMigrationReport())
            message.success(updated.open_migration_issue_count ? `检查完成，仍有 ${updated.open_migration_issue_count} 个问题` : '迁移问题已全部关闭')
          } else {
            message.success(
              action === 'undo_delete'
                ? updated.status === 'draft' ? '已撤销删除，题库已恢复为草稿' : '已撤销删除，题库已移回归档'
                : action === 'delete' ? '题库已移入回收站'
                : action === 'archive' ? '题库已归档'
                : '题库状态已更新',
            )
          }
        } catch (error) {
          if (action === 'archive' && errorText(error).includes('停用全部已发布题目')) { archiveBlocked(library, errorText(error)); return }
          if (isConflictError(error)) { await loadCurrent.current(); message.warning('题库版本已变化，列表已刷新') }
          else message.error(errorText(error))
          throw error
        }
      },
    })
  }

  const toggleV2 = (library: QuizLibrary, enabled: boolean) => {
    if (enabled) { setPublicationLibrary(library.id); return }
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

  const loadCodesFor = async (library: QuizLibrary, page: number, status?: QuizActivationCodeStatus) => {
    codeRequest.current?.abort()
    const request = new AbortController()
    codeRequest.current = request
    setCodesLoading(true)
    try {
      const result = await quizService.listActivationCodes(library.id, { page, page_size: 10, status }, request.signal)
      if (!request.signal.aborted) setCodes(result)
    } catch (error) {
      if (!request.signal.aborted) message.error(errorText(error))
    } finally {
      if (!request.signal.aborted) setCodesLoading(false)
    }
  }

  const loadCodes = (page: number, status?: QuizActivationCodeStatus) =>
    codeLibrary ? loadCodesFor(codeLibrary, page, status) : undefined

  const openCodes = (library: QuizLibrary) => {
    setCodeLibrary(library)
    setCodes(null)
    setGeneratedCodes(null)
    setCodeStatus(undefined)
    setCodePage(1)
    void loadCodesFor(library, 1)
  }

  const submitGenerateCodes = async () => {
    if (!codeLibrary || generating) return
    const values = await generateForm.validateFields().catch(() => undefined)
    if (!values) return
    const customMode = values.generateMode === 'custom'
    const customCode = customMode ? values.customCode?.trim() : undefined
    if (customMode && !customCode) {
      message.error('请输入自定义激活码内容')
      return
    }
    setGenerating(true)
    try {
      const result = await quizService.generateActivationCodes(
        codeLibrary.id,
        values.quantity,
        values.note?.trim() || null,
        values.validityDays,
        customMode ? customCode : null,
      )
      setGeneratedCodes(result)
      setGenerateOpen(false)
      generateForm.resetFields()
      setCodePage(1)
      await loadCodes(1, codeStatus)
      message.success(`已生成 ${result.codes.length} 个激活码`)
    } catch (error) {
      message.error(errorText(error))
    } finally {
      setGenerating(false)
    }
  }

  const revokeActivationCode = async (code: QuizActivationCode) => {
    try {
      await quizService.revokeActivationCode(code.id)
      message.success('激活码已作废')
      await loadCodes(codePage, codeStatus)
    } catch (error) {
      message.error(errorText(error))
    }
  }

  const downloadCodesCsv = async () => {
    if (!codeLibrary) return
    try {
      const blob = await quizService.exportActivationCodesCsv(codeLibrary.id, codeStatus)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quiz_activation_codes_${codeLibrary.id}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      message.error(errorText(error))
    }
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
    setConvertPrice(library.price_cents || undefined)
    setConvertError('')
  }

  const doConvert = async () => {
    if (!convertTarget || !convertMode || convertLock.current) return
    if (convertMode === 'paid' && (!Number.isInteger(convertPrice) || !convertPrice || convertPrice < 1 || convertPrice > 2147483647)) {
      setConvertError('请填写大于0的整数价格（分）')
      return
    }
    convertLock.current = true
    setConverting(true)
    setConvertError('')
    try {
      const token = await ensureReauthenticated()
      if (!token) { setConverting(false); return }
      const result = await quizService.convertAccessMode(convertTarget.id, convertTarget.lock_version, convertMode, token, undefined, convertMode === 'paid' ? convertPrice : undefined)
      message.success(`访问模式已转换为「${accessLabels[result.library.access_mode]}」${result.sessions_affected ? `，${result.sessions_affected} 个进行中的练习会话已同步` : ''}`)
      setConvertTarget(null)
      setConvertMode(undefined)
      await load(filter)
    } catch (error) {
      if (isConflictError(error)) {
        setConvertMode(undefined)
        try {
          const latest = await quizService.getLibrary(convertTarget.id)
          setConvertTarget(latest); setConvertPrice(latest.price_cents || undefined)
          setConvertError('题库已更新，已加载最新资料，请重新选择目标模式并确认')
        } catch { setConvertTarget(null); message.warning('无法加载最新题库，请刷新列表后重试') }
        await load(filter)
      }
      else if (isNotFoundError(error)) { setConvertTarget(null); await load(filter); message.warning('题库不存在，列表已刷新') }
      else setConvertError(errorText(error))
    } finally {
      convertLock.current = false
      setConverting(false)
    }
  }

  const actions = (library: QuizLibrary) => {
    if (library.status === 'archived' || library.status === 'deleted') {
      const recoverable = Boolean(library.restore_until && Date.parse(library.restore_until) > now)
      return <Space wrap>
        <Button type="link" size="small" onClick={() => setRecord(library)}>{library.status === 'deleted' ? '查看记录' : '查看详情'}</Button>
        {canManage && library.status === 'archived' && <Button type="link" size="small" danger onClick={() => void transition(library, 'delete')}>移入回收站</Button>}
        {canManage && library.status === 'deleted' && <Button type="link" size="small" disabled={!recoverable} onClick={() => void transition(library, 'undo_delete')}>撤销删除</Button>}
      </Space>
    }
    const buttons = []
    if (canManage && !['archived', 'deleted'].includes(library.status)) buttons.push(<Button key="edit" type="link" size="small" onClick={() => openEdit(library)}>编辑</Button>)
    if (library.access_mode === 'course_entitlement') buttons.push(<Button key="binding" type="link" size="small" icon={<LinkOutlined />} onClick={() => void openBindings(library)}>课程绑定</Button>)
    if (canManage && library.access_mode === 'activation_code') buttons.push(<Button key="codes" aria-label="激活码" type="link" size="small" icon={<KeyOutlined />} onClick={() => void openCodes(library)}>激活码</Button>)
    if (isSuperAdmin && ALLOWED_TRANSITIONS[library.access_mode]?.length) buttons.push(<Button key="convert" type="link" size="small" icon={<SwapOutlined />} onClick={() => openConvertModal(library)}>转换模式</Button>)
    if (canManage && library.status === 'draft') buttons.push(<Button key="publish" type="link" size="small" onClick={() => transition(library, 'publish')}>发布</Button>)
    if (canManage && library.status === 'draft') buttons.push(<Button key="trash" type="link" size="small" danger onClick={() => void transition(library, 'delete')}>移入回收站</Button>)
    if (canManage && library.status === 'published') buttons.push(<Button key="suspend" type="link" size="small" danger onClick={() => transition(library, 'suspend')}>停用</Button>)
    if (canManage && library.status === 'suspended') buttons.push(<Button key="restore" type="link" size="small" onClick={() => transition(library, 'restore')}>恢复</Button>)
    if (canManage && ['published', 'suspended'].includes(library.status)) buttons.push(<Button key="archive" type="link" size="small" danger onClick={() => transition(library, 'archive')}>归档</Button>)
    return <Space size={0} wrap>{buttons}</Space>
  }

  const columns: ColumnsType<QuizLibrary> = [
    { title: '题库', key: 'library', width: 240, render: (_, item) => <Space direction="vertical" size={0}><strong>{item.name}</strong><span style={{ color: '#8c8c8c' }}>{item.library_code}</span></Space> },
    { title: '访问模式', dataIndex: 'access_mode', width: 140, render: (value: QuizLibraryAccessMode) => <Tag color={value === 'free' ? 'green' : value === 'course_entitlement' ? 'blue' : value === 'activation_code' ? 'orange' : 'default'}>{accessLabels[value]}</Tag> },
    { title: '厂商标签', dataIndex: 'vendor_tag', width: 110, render: (value: QuizLibrary['vendor_tag']) => <Tag color={value === 'none' ? 'default' : 'geekblue'}>{vendorLabels[value]}</Tag> },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: QuizLibrary['status']) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag> },
    { title: 'V2 用户入口', key: 'v2', width: 130, render: (_, item) => <Tooltip title={item.status !== 'published' ? '入口未开放，仅已发布题库可以开启' : !item.v2_enabled ? '入口未开放' : undefined}><Switch checked={item.v2_enabled} disabled={!canManage || (item.status !== 'published' && !item.v2_enabled)} onChange={(checked) => toggleV2(item, checked)} /></Tooltip> },
    { title: '内容', key: 'content', width: 225, render: (_, item) => {
      const counts = item.practice_counts
      return (
        <Space direction="vertical" size={2}>
          <Tooltip title={counts && `待发布 ${counts.unpublished} · 已停用 ${counts.disabled} · 归属不可用 ${counts.unavailable_ownership} · 当前发布版本异常 ${counts.invalid_revision}`}>
            <span>总计 {item.question_count} 题 · 可练习 {counts?.practicable ?? '—'} 题</span>
          </Tooltip>
          <Typography.Text type="secondary">{item.module_count} 模块 / {item.knowledge_point_count} 知识点</Typography.Text>
        </Space>
      )
    } },
    { title: '迁移问题', dataIndex: 'open_migration_issue_count', width: 110, render: (value: number, item) => value ? <Button type="link" danger size="small" onClick={() => void openMigrationReport(item)}>{value} 项</Button> : <Tag color="success">无</Tag> },
    { title: '更新时间', dataIndex: 'updated_at', width: 170, render: (value: string) => formatDate(value) },
    { title: '操作', key: 'actions', width: 330, fixed: 'right', render: (_, item) => actions(item) },
  ]

  const timeColumn = (title: string, dataIndex: 'archived_at' | 'deleted_at' | 'restore_until'): ColumnsType<QuizLibrary>[number] => ({
    title, dataIndex, width: 180, render: (value: string | null) => value ? formatDate(value) : '—',
  })
  const historyColumns: ColumnsType<QuizLibrary> = [
    columns[0], columns[columns.length - 1],
  ]
  const visibleLibraries = libraries.filter(item => !['archived', 'deleted'].includes(item.status))
  if (legacyTrashView) {
    return <Navigate to="/admin/recycle-bin" replace />
  }
  return (
    <PageContainer
      title="题库"
      extra={canManage && view === 'working' ? <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建题库</Button> : undefined}
    >

      <Space wrap style={{ marginBottom: 8 }}>
        <Tabs activeKey="working" items={[{ key: 'working', label: '题库列表' }]} />
      </Space>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} onPressEnter={() => setFilter((current) => ({ ...current, keyword: keyword.trim() || undefined }))} allowClear prefix={<SearchOutlined />} placeholder="题库名称或编码" style={{ width: 240 }} />
        {view === 'working' && <Select allowClear placeholder="状态" value={filter.status} onChange={(status) => setFilter((current) => ({ ...current, status }))} options={Object.entries(statusLabels).filter(([value]) => !['archived', 'deleted'].includes(value)).map(([value, label]) => ({ value, label }))} style={{ width: 130 }} />}
        <Select allowClear placeholder="访问模式" value={filter.access_mode} onChange={(access_mode) => setFilter((current) => ({ ...current, access_mode }))} options={Object.entries(accessLabels).map(([value, label]) => ({ value, label }))} style={{ width: 170 }} />
        <Button type="primary" onClick={() => setFilter((current) => ({ ...current, keyword: keyword.trim() || undefined }))}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={() => void load(filter)}>刷新</Button>
      </Space>
      <Table rowKey="id" loading={loading} columns={view === 'working' ? columns : historyColumns} dataSource={visibleLibraries} scroll={{ x: view === 'working' ? 1280 : 780 }} pagination={false} />

      <Drawer title={record ? `题库记录 · ${record.name}` : '题库记录'} open={!!record} onClose={() => setRecord(null)}>
        {record && <Space direction="vertical" style={{ width: '100%' }}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="编码">{record.library_code}</Descriptions.Item>
            <Descriptions.Item label="状态">{statusLabels[record.status]}</Descriptions.Item>
            <Descriptions.Item label="归档时间">{record.archived_at ? formatDate(record.archived_at) : '—'}</Descriptions.Item>
            {record.deleted_at && <Descriptions.Item label="删除时间">{formatDate(record.deleted_at)}</Descriptions.Item>}
            {record.restore_until && <Descriptions.Item label="恢复截止时间">{formatDate(record.restore_until)}</Descriptions.Item>}
            <Descriptions.Item label="题目数">{record.question_count}</Descriptions.Item>
          </Descriptions>
          <Button onClick={() => navigate(`/admin/quiz/questions?tab=content&library_id=${record.id}`)}>查看历史内容</Button>
        </Space>}
      </Drawer>
      <Drawer
        title={migrationLibrary ? `迁移问题 · ${migrationLibrary.name}` : '迁移问题'}
        open={Boolean(migrationLibrary)}
        onClose={() => { setMigrationLibrary(null); setMigrationReport(null) }}
        width={860}
        extra={migrationLibrary && <Space>
          <Button onClick={() => navigate(`/admin/quiz/questions?tab=content&library_id=${migrationLibrary.id}`)}>前往内容工作台</Button>
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

      <Modal title={editing ? `编辑题库「${editing.name}」` : '新建题库'} open={modalOpen} onOk={save} confirmLoading={saving} cancelButtonProps={{ disabled: saving }} onCancel={() => { if (!saveLock.current) setModalOpen(false) }} width={680} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="题库名称" rules={[{ required: true, message: '请输入题库名称' }, { max: 128 }]}><Input autoFocus /></Form.Item>
          <Form.Item name="description" label="简介" rules={[{ max: 512 }]}><Input.TextArea rows={2} showCount maxLength={512} /></Form.Item>
          <Form.Item name="cover_url" label="题库封面">
            <ImageUpload
              purpose="quiz"
              crop={{ width: 560, height: 440, title: '题库封面' }}
              hint={'题库列表小封面\n固定裁剪输出：560 × 440 px（约 1.27 : 1）\n上传后可拖动/缩放调整裁剪区域\n输出 JPG，单张 ≤ 5MB'}
            />
          </Form.Item>
          <Form.Item name="details" label="详细说明" rules={[{ max: 10000 }]}><Input.TextArea rows={5} showCount maxLength={10000} /></Form.Item>
          <Form.Item name="access_mode" label="访问模式" rules={[{ required: true }]}>
            <Select options={Object.entries(accessLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="vendor_tag" label="厂商标签" tooltip="小程序练习助手按厂商标签筛选题库；未匹配厂商的题库归入「其他」">
            <Select options={Object.entries(vendorLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.access_mode !== cur.access_mode}>
              {({ getFieldValue }) => getFieldValue('access_mode') === 'paid' ? (
                <Form.Item name="price_cents" label="价格（分）" rules={[{ required: true, message: '付费题库必须设置价格' }, { type: 'integer', min: 1, max: 2147483647, message: '请输入大于0的整数价格（分）' }]} extra="用于题库商品参考价；实际兑换积分在积分商城配置。">
                  <InputNumber min={1} max={2147483647} precision={0} style={{ width: '100%' }} placeholder="如 4900 = ¥49" />
                </Form.Item>
              ) : null}
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

      <Drawer
        title={codeLibrary ? `激活码 · ${codeLibrary.name}` : '激活码'}
        open={Boolean(codeLibrary)}
        onClose={() => { codeRequest.current?.abort(); setCodeLibrary(null); setGeneratedCodes(null) }}
        width={860}
        extra={canManage && codeLibrary && <Space>
          <Button icon={<DownloadOutlined />} onClick={() => void downloadCodesCsv()}>导出 CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setGenerateOpen(true)}>生成激活码</Button>
        </Space>}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="激活码仅可兑换一次，本身无兑换截止；学生激活后按所选天数有效（自兑换时刻起算）。"
        />
        {generatedCodes && (
          <Alert
            type="success"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            message={`已生成 ${generatedCodes.codes.length} 个激活码，请复制或导出后交发放方`}
            description={<Space direction="vertical" style={{ width: '100%' }} size={4}>
              <Typography.Text>激活后有效 {generatedCodes.validity_days} 天（自兑换时刻起算）</Typography.Text>
              {generatedCodes.codes.map((code) => <Typography.Text key={code} copyable>{code}</Typography.Text>)}
            </Space>}
          />
        )}
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="状态"
            value={codeStatus}
            style={{ width: 140 }}
            onChange={(status) => { setCodeStatus(status); setCodePage(1); void loadCodes(1, status) }}
            options={(Object.entries(activationCodeStatusLabels) as Array<[QuizActivationCodeStatus, string]>).map(([value, label]) => ({ value, label }))}
          />
        </Space>
        <Table<QuizActivationCode>
          scroll={{ x: 1120 }}
          rowKey="id"
          loading={codesLoading}
          dataSource={codes?.items ?? []}
          pagination={{
            current: codePage,
            pageSize: 10,
            total: codes?.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 个`,
            onChange: (page) => { setCodePage(page); void loadCodes(page, codeStatus) },
          }}
          columns={[
            { title: '激活码', dataIndex: 'code', width: 200, render: (value: string) => <Typography.Text copyable>{value}</Typography.Text> },
            { title: '状态', dataIndex: 'status', width: 90, render: (status: QuizActivationCodeStatus) => <Tag color={status === 'redeemed' ? 'success' : status === 'revoked' ? 'default' : 'processing'}>{activationCodeStatusLabels[status]}</Tag> },
            { title: '兑换用户', key: 'redeemed_by', width: 160, render: (_, item) => item.redeemed_by ? `#${item.redeemed_by}${item.redeemed_by_phone ? ` / ${item.redeemed_by_phone}` : ''}` : '-' },
            { title: '兑换时间', dataIndex: 'redeemed_at', width: 170, render: (value: string | null) => value ? formatDate(value) : '-' },
            { title: '有效期', dataIndex: 'validity_days', width: 140, render: (value: number | null) => value != null ? `激活后 ${value} 天` : '激活后永久' },
            { title: '备注', dataIndex: 'note', ellipsis: true, render: (value: string | null) => value || '-' },
            { title: '创建时间', dataIndex: 'created_at', width: 170, render: (value: string) => formatDate(value) },
            { title: '操作', width: 90, render: (_, item) => canManage && item.status === 'issued' ? <Button type="link" size="small" danger onClick={() => Modal.confirm({ title: `作废激活码「${item.code}」？`, content: '作废后该码无法被兑换，已生成的码列表中仍会保留记录。', okText: '确认作废', okButtonProps: { danger: true }, onOk: () => revokeActivationCode(item) })}>作废</Button> : null },
          ]}
        />
      </Drawer>

      <Modal
        title={codeLibrary ? `生成激活码 · ${codeLibrary.name}` : '生成激活码'}
        open={generateOpen}
        okText="确认生成"
        okButtonProps={{ loading: generating }}
        onCancel={() => { setGenerateOpen(false); generateForm.resetFields() }}
        onOk={() => void submitGenerateCodes()}
        destroyOnClose
      >
        <Form form={generateForm} initialValues={{ generateMode: 'random', quantity: 20, validityDays: 30 }} layout="vertical">
          <Form.Item name="generateMode" label="生成方式" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'random', label: '随机批量生成' },
                { value: 'custom', label: '自定义码内容' },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>
          {generateMode === 'custom' ? (
            <Form.Item
              name="customCode"
              label="激活码内容"
              rules={[
                { required: true, message: '请输入激活码内容' },
                { pattern: /^[2-9A-HJ-NP-Za-hj-np-z0-9-]{4,24}$/, message: '4-24 位字母或数字（自动去分隔符并转大写）' },
              ]}
              extra="仍是一码一用；适合给班级/渠道起一个好记的码"
            >
              <Input maxLength={32} placeholder="如：SCSA-BAN-01" allowClear />
            </Form.Item>
          ) : (
            <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入生成数量' }]} extra="一次最多 500 个">
              <InputNumber min={1} max={500} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item
            name="validityDays"
            label="激活后有效期"
            rules={[{ required: true, message: '请选择激活后有效期' }]}
            extra={validityDays ? `学生激活后可用 ${validityDays} 天（自兑换时刻起算），激活码本身无兑换截止` : '效期自学生兑换时起算'}
          >
            <Select options={activationValidityOptions} />
          </Form.Item>
          <Form.Item name="note" label="备注（可选）" rules={[{ max: 512, message: '备注最多 512 字' }]}>
            <Input.TextArea rows={2} placeholder="如：2026 年 11 月首批发放" />
          </Form.Item>
        </Form>
      </Modal>
      {convertTarget && (
        <Modal
          title={`转换「${convertTarget.name}」的访问模式`}
          open
          okText="确认转换"
          okButtonProps={{ danger: true, loading: converting, disabled: !convertMode }}
          cancelButtonProps={{ disabled: converting }}
          onCancel={() => { if (!convertLock.current) { setConvertTarget(null); setConvertMode(undefined) } }}
          onOk={() => void doConvert()}
          width={560}
          destroyOnClose
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>当前模式：<Tag color={convertTarget.access_mode === 'free' ? 'green' : convertTarget.access_mode === 'course_entitlement' ? 'blue' : convertTarget.access_mode === 'activation_code' ? 'orange' : 'default'}>{accessLabels[convertTarget.access_mode]}</Tag></div>
            <div>
              目标模式：
              <Select
                style={{ width: 200 }}
                placeholder="选择目标模式"
                value={convertMode}
                onChange={(mode) => { setConvertMode(mode); setConvertError('') }}
                options={
                  (ALLOWED_TRANSITIONS[convertTarget.access_mode] ?? [])
                    .map((mode) => ({ value: mode, label: accessLabels[mode] }))
                }
              />
            </div>
            {convertMode === 'paid' && <Form.Item label="价格（分）" required style={{ marginBottom: 0 }}>
              <InputNumber aria-label="转换价格（分）" min={1} max={2147483647} precision={0} value={convertPrice} onChange={(value) => setConvertPrice(value ?? undefined)} placeholder="如 4900 = ¥49" style={{ width: '100%' }} />
            </Form.Item>}
            {convertError && <div role="alert" style={{ color: '#ff4d4f' }}>{convertError}</div>}
            {convertMode && <Alert type="warning" showIcon message={convertWarning(convertTarget.access_mode, convertMode)} />}
          </Space>
        </Modal>
      )}
      {publicationLibrary && <PublicationDialog libraryId={publicationLibrary} onClose={() => setPublicationLibrary(undefined)} onChanged={() => void load(filter)} />}
      {reauthDialog}
    </PageContainer>
  )
}
