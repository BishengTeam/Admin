import { useState, useEffect, useCallback } from 'react'
import { Row, Col, Modal, Form, Input, TreeSelect, message } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import type { Category, QuestionFilter } from '@/types/quiz'
import { arrayToTree, buildTreeSelectData } from '@/utils/tree'
import CategoryTree from './components/CategoryTree'
import QuestionTable from './components/QuestionTable'

export default function QuizManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()
  const [keyword, setKeyword] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form] = Form.useForm()

  const loadCategories = useCallback(() => {
    quizService.listCategories().then((data) => {
      // 后端返回平级数组，需转为嵌套树结构供 CategoryTree 渲染
      setCategories(arrayToTree(data as any) as unknown as Category[])
    })
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleCategorySelect = useCallback((id: number | undefined) => {
    setSelectedCategory(id)
  }, [])

  const handleCreate = () => {
    setEditingCategory(null)
    form.resetFields()
    form.setFieldsValue({ parent_id: selectedCategory || undefined })
    setModalOpen(true)
  }

  const handleRename = (cat: Category) => {
    setEditingCategory(cat)
    form.setFieldsValue({ name: cat.name, parent_id: cat.parent_id })
    setModalOpen(true)
  }

  const handleDelete = async (cat: Category) => {
    await quizService.deleteCategory(cat.id)
    message.success('分类已删除')
    if (selectedCategory === cat.id) setSelectedCategory(undefined)
    loadCategories()
  }

  const handleModalOk = async () => {
    const values = await form.validateFields()
    if (editingCategory) {
      await quizService.updateCategory(editingCategory.id, values)
      message.success('分类已更新')
    } else {
      await quizService.createCategory(values)
      message.success('分类已创建')
    }
    setModalOpen(false)
    loadCategories()
  }

  const filters: QuestionFilter = {
    category_id: selectedCategory,
    keyword: keyword || undefined,
  }

  return (
    <PageContainer title="题库管理">
      <Row gutter={24}>
        <Col span={6}>
          <CategoryTree
            categories={categories}
            selectedKey={selectedCategory}
            onSelect={handleCategorySelect}
            onCreate={handleCreate}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </Col>
        <Col span={18}>
          <QuestionTable
            filters={filters}
            categories={categories}
            keyword={keyword}
            onKeywordChange={setKeyword}
          />
        </Col>
      </Row>

      <Modal
        title={editingCategory ? '重命名分类' : '新增分类'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="如：H3CNE" />
          </Form.Item>
          <Form.Item name="parent_id" label="父分类">
            <TreeSelect
              placeholder="留空则为顶级分类"
              treeData={buildTreeSelectData(categories)}
              allowClear
              treeDefaultExpandAll
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
