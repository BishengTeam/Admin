import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Col, Form, Input, InputNumber, message, Modal, Row, TreeSelect } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import { ApiError, isConflictError, isNotFoundError, isValidationError } from '@/core/request'
import { usePermission } from '@/hooks/usePermission'
import type { Category, CategoryCreate, CategoryUpdate, QuestionFilter } from '@/types/quiz'
import { QUIZ_IMPORT_SUCCEEDED_EVENT } from '@/utils/quizEvents'
import CategoryTree, { buildCategoryTree, flattenCategories, getCategoryPath } from './components/CategoryTree'
import QuestionTable from './components/QuestionTable'

function categoryTreeSelectData(tree: Category[], all: Category[], editingId?: number): Array<{ title: string; value: number; disabled?: boolean; children?: ReturnType<typeof categoryTreeSelectData> }> {
  const descendants = new Set<number>()
  const childrenByParent = new Map<number, number[]>()
  all.forEach((item) => { if (item.parent_id != null) childrenByParent.set(item.parent_id, [...(childrenByParent.get(item.parent_id) ?? []), item.id]) })
  const subtreeHeight = (id: number): number => Math.max(0, ...(childrenByParent.get(id) ?? []).map((childId) => 1 + subtreeHeight(childId)))
  if (editingId) {
    const visit = (parentId: number) => (childrenByParent.get(parentId) ?? []).forEach((childId) => { descendants.add(childId); visit(childId) })
    visit(editingId)
  }
  return tree.map((category) => ({
    title: category.name,
    value: category.id,
    disabled: category.id === editingId || descendants.has(category.id) || (editingId ? getCategoryPath(all, category.id).length + 1 + subtreeHeight(editingId) > 3 : getCategoryPath(all, category.id).length >= 3),
    children: category.children?.length ? categoryTreeSelectData(category.children, all, editingId) : undefined,
  }))
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '请求失败'
}

export default function QuizManagement() {
  const canWrite = usePermission('quiz:write')
  const canImport = usePermission('quiz:import')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number>()
  const [keywordInput, setKeywordInput] = useState('')
  const [filters, setFilters] = useState<QuestionFilter>({})
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [movingCategory, setMovingCategory] = useState<Category | null>(null)
  const [categoryForm] = Form.useForm()
  const [moveForm] = Form.useForm()
  const categoryController = useRef<AbortController | null>(null)

  const loadCategories = useCallback(async () => {
    categoryController.current?.abort()
    const controller = new AbortController()
    categoryController.current = controller
    try {
      const result = await quizService.listCategories({}, controller.signal)
      if (!controller.signal.aborted) setCategories(result)
    } catch (error) {
      if (!controller.signal.aborted) message.error(errorMessage(error))
    }
  }, [])

  useEffect(() => {
    loadCategories()
    return () => categoryController.current?.abort()
  }, [loadCategories])

  useEffect(() => {
    const refreshAfterImport = () => { void loadCategories() }
    window.addEventListener(QUIZ_IMPORT_SUCCEEDED_EVENT, refreshAfterImport)
    return () => window.removeEventListener(QUIZ_IMPORT_SUCCEEDED_EVENT, refreshAfterImport)
  }, [loadCategories])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, keyword: keywordInput.trim() || undefined }))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [keywordInput])

  const tree = useMemo(() => buildCategoryTree(categories), [categories])
  const openCreateCategory = () => {
    setEditingCategory(null)
    categoryForm.resetFields()
    categoryForm.setFieldsValue({ parent_id: selectedCategory ?? undefined, sort_order: 0 })
    setCategoryModalOpen(true)
  }
  const openEditCategory = (category: Category) => {
    setEditingCategory(category)
    categoryForm.setFieldsValue({ name: category.name, description: category.description ?? undefined })
    setCategoryModalOpen(true)
  }
  const openMoveCategory = (category: Category) => {
    setMovingCategory(category)
    moveForm.setFieldsValue({ parent_id: category.parent_id ?? undefined, sort_order: category.sort_order })
    setMoveModalOpen(true)
  }

  const refreshMissingCategory = async () => {
    setCategoryModalOpen(false)
    setMoveModalOpen(false)
    setEditingCategory(null)
    setMovingCategory(null)
    await loadCategories()
    message.warning('分类不存在，列表已刷新')
  }

  const handleCategoryStatus = (category: Category) => {
    const next = category.status === 'active' ? 'disabled' : 'active'
    Modal.confirm({
      title: `${next === 'disabled' ? '停用' : '启用'}分类「${category.name}」？`,
      content: next === 'disabled' ? '子分类不会改变自身状态，但题目和树节点会显示继承停用。' : '确认恢复该分类的可用状态？',
      onOk: async () => {
        try { await quizService.updateCategoryStatus(category.id, { status: next, lock_version: category.lock_version }); await loadCategories(); message.success('分类状态已更新') }
        catch (error) {
          if (isConflictError(error)) { await loadCategories(); message.warning('分类版本已变化，数据已刷新') }
          else if (isNotFoundError(error)) await refreshMissingCategory()
          else message.error(errorMessage(error))
        }
      },
    })
  }

  const handleCategoryDelete = async (category: Category) => {
    if (category.ever_had_question || category.children?.length) { message.warning('仅允许删除从未包含题目且没有子分类的空分类'); return }
    try {
      await quizService.deleteCategory(category.id, category.lock_version)
      if (selectedCategory === category.id) { setSelectedCategory(undefined); setFilters((current) => ({ ...current, category_id: undefined })) }
      await loadCategories()
      message.success('分类已删除')
    } catch (error) {
      if (isConflictError(error)) { await loadCategories(); message.warning('分类版本已变化，数据已刷新') }
      else if (isNotFoundError(error)) await refreshMissingCategory()
      else message.error(errorMessage(error))
    }
  }

  const saveCategory = async () => {
    try {
      const values = await categoryForm.validateFields()
      if (!editingCategory) {
        const payload: CategoryCreate = { name: values.name.trim(), parent_id: values.parent_id ?? null, ...(values.description?.trim() ? { description: values.description.trim() } : {}), sort_order: values.sort_order ?? 0 }
        await quizService.createCategory(payload)
        message.success('分类已创建')
      } else {
        const payload: CategoryUpdate = { lock_version: editingCategory.lock_version }
        if (values.name.trim() !== editingCategory.name) payload.name = values.name.trim()
        const description = values.description?.trim() || null
        if (description !== editingCategory.description) payload.description = description
        if (Object.keys(payload).length === 1) { setCategoryModalOpen(false); return }
        await quizService.updateCategory(editingCategory.id, payload)
        message.success('分类已更新')
      }
      setCategoryModalOpen(false)
      await loadCategories()
    } catch (error) {
      if (error instanceof ApiError && isConflictError(error)) { await loadCategories(); message.warning('分类版本已变化，列表已刷新；当前输入仍保留，请关闭后重新打开并对比，再提交') }
      else if (isNotFoundError(error)) await refreshMissingCategory()
      else if (error instanceof ApiError && isValidationError(error)) {
        const fieldErrors = error.fields
          .map((field) => ({ name: field.field?.split('.') ?? field.loc?.map(String) ?? [], errors: [field.reason || field.msg || field.message || error.message] }))
          .filter((field) => field.name.length > 0)
        if (fieldErrors.length) categoryForm.setFields(fieldErrors)
        else message.warning(error.message)
      }
      else if (error && typeof error === 'object' && 'errorFields' in error) return
      else if (error instanceof Error && error.message) message.error(errorMessage(error))
    }
  }

  const saveCategoryMove = async () => {
    if (!movingCategory) return
    try {
      const values = await moveForm.validateFields()
      const parentId = values.parent_id ?? null
      const sortOrder = values.sort_order ?? 0
      if (parentId === movingCategory.parent_id && sortOrder === movingCategory.sort_order) {
        setMoveModalOpen(false)
        setMovingCategory(null)
        return
      }
      await quizService.updateCategory(movingCategory.id, {
        lock_version: movingCategory.lock_version,
        parent_id: parentId,
        sort_order: sortOrder,
      })
      setMoveModalOpen(false)
      setMovingCategory(null)
      await loadCategories()
      message.success('分类位置已更新')
    } catch (error) {
      if (error instanceof ApiError && isConflictError(error)) {
        await loadCategories()
        message.warning('分类版本已变化，列表已刷新；当前移动设置仍保留，请关闭后重新打开并对比，再提交')
      } else if (isNotFoundError(error)) {
        await refreshMissingCategory()
      } else if (error instanceof ApiError && isValidationError(error)) {
        const fieldErrors = error.fields
          .map((field) => ({ name: field.field?.split('.') ?? field.loc?.map(String) ?? [], errors: [field.reason || field.msg || field.message || error.message] }))
          .filter((field) => field.name.length > 0)
        if (fieldErrors.length) moveForm.setFields(fieldErrors)
        else message.warning(error.message)
      } else if (error && typeof error === 'object' && 'errorFields' in error) {
        return
      } else {
        message.error(errorMessage(error))
      }
    }
  }

  const handleSelectCategory = (id?: number) => {
    setSelectedCategory(id)
    setFilters((current) => ({ ...current, category_id: id, page: undefined }))
  }

  const flatCategories = flattenCategories(tree)

  return (
    <PageContainer title="题库管理">
      <Row gutter={20} align="top">
        <Col xs={24} lg={6}>
          <CategoryTree categories={categories} selectedKey={selectedCategory} canWrite={canWrite} onSelect={handleSelectCategory} onCreate={openCreateCategory} onEdit={openEditCategory} onMove={openMoveCategory} onStatus={handleCategoryStatus} onDelete={handleCategoryDelete} />
        </Col>
        <Col xs={24} lg={18}>
          <QuestionTable filters={filters} categories={categories} canWrite={canWrite} canImport={canImport} onKeywordChange={setKeywordInput} onFilterChange={(next) => setFilters((current) => ({ ...current, ...next, page: undefined }))} onRefreshCategories={loadCategories} />
        </Col>
      </Row>
      <Modal title={editingCategory ? '编辑分类' : '新增分类'} open={categoryModalOpen} onOk={saveCategory} onCancel={() => setCategoryModalOpen(false)} destroyOnClose>
        <Form form={categoryForm} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }, { max: 128, message: '名称不能超过 128 个字符' }]}><Input autoFocus /></Form.Item>
          {!editingCategory && <Form.Item name="parent_id" label="父分类"><TreeSelect allowClear treeDefaultExpandAll placeholder="留空则为顶级分类" treeData={categoryTreeSelectData(tree, flatCategories)} /></Form.Item>}
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} maxLength={256} showCount /></Form.Item>
          {!editingCategory && <Form.Item name="sort_order" label="排序"><InputNumber min={0} max={999999} precision={0} style={{ width: '100%' }} /></Form.Item>}
        </Form>
      </Modal>
      <Modal title={`移动/排序分类${movingCategory ? `「${movingCategory.name}」` : ''}`} open={moveModalOpen} onOk={saveCategoryMove} onCancel={() => { setMoveModalOpen(false); setMovingCategory(null) }} destroyOnClose>
        <Form form={moveForm} layout="vertical">
          <Form.Item name="parent_id" label="目标父分类"><TreeSelect allowClear treeDefaultExpandAll placeholder="留空则移动为顶级分类" treeData={categoryTreeSelectData(tree, flatCategories, movingCategory?.id)} /></Form.Item>
          <Form.Item name="sort_order" label="排序" rules={[{ required: true, message: '请输入排序值' }]}><InputNumber min={0} max={999999} precision={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
