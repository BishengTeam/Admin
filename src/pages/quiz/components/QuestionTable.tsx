import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, Tag, Input, message } from 'antd'
import { ConfirmButton } from '@/components/ConfirmButton'
import { PlusOutlined, SearchOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import { usePagination } from '@/hooks/usePagination'
import { quizService } from '@/services/quiz'
import type { Question, QuestionFilter, Category } from '@/types/quiz'
import QuestionModal from './QuestionModal'

interface QuestionTableProps {
  filters: QuestionFilter
  categories: Category[]
  keyword: string
  onKeywordChange: (kw: string) => void
}

export default function QuestionTable({
  filters,
  categories,
  keyword,
  onKeywordChange,
}: QuestionTableProps) {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const { data, loading, pagination, refresh } = usePagination(
    (page) => quizService.listQuestions({ ...filters, ...page }),
    [filters],
  )

  const handleAdd = () => {
    setEditingQuestion(null)
    setModalOpen(true)
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setModalOpen(true)
  }

  const handleDelete = useCallback(async (id: number) => {
    await quizService.deleteQuestion(id)
    message.success('删除成功')
    refresh()
  }, [refresh])

  const handleBatchDelete = async () => {
    await quizService.deleteQuestions(selectedRowKeys as number[])
    message.success(`成功删除 ${selectedRowKeys.length} 道题目`)
    setSelectedRowKeys([])
    refresh()
  }

  const rowSelection: TableRowSelection<Question> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingQuestion(null)
  }

  const columns: ColumnsType<Question> = [
    {
      title: '题目内容',
      dataIndex: 'question_text',
      ellipsis: true,
    },
    {
      title: '题型',
      dataIndex: 'question_type',
      width: 80,
      render: (t: string) => <Tag color={t === 'single' ? 'blue' : 'orange'}>{t === 'single' ? '单选' : '多选'}</Tag>,
    },
    {
      title: '分类',
      dataIndex: 'category_name',
      width: 130,
      render: (n: string) => <Tag>{n}</Tag>,
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <ConfirmButton
            title="删除题目"
            description="此操作不可撤销，确认删除此题目？"
            danger
            type="link"
            size="small"
            onConfirm={() => handleDelete(record.id)}
          >
            删除
          </ConfirmButton>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input
          placeholder="搜索题目..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Space>
          {selectedRowKeys.length > 0 && (
            <ConfirmButton
              title="批量删除"
              description={`确认删除选中的 ${selectedRowKeys.length} 道题目？此操作不可撤销。`}
              danger
              icon={<DeleteOutlined />}
              onConfirm={handleBatchDelete}
            >
              删除 ({selectedRowKeys.length})
            </ConfirmButton>
          )}
          <Button icon={<UploadOutlined />} onClick={() => navigate('/admin/quiz/import')}>
            批量导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增题目
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
        size="middle"
        rowSelection={rowSelection}
      />

      <QuestionModal
        open={modalOpen}
        question={editingQuestion}
        categories={categories}
        onClose={handleModalClose}
        onSuccess={() => {
          handleModalClose()
          refresh()
        }}
      />
    </div>
  )
}
