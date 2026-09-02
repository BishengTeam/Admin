import { useState } from 'react'
import type { Key } from 'react'
import { Table, Button, Tag, Space, Modal, Input, Typography, message } from 'antd'
import { PlusOutlined, ImportOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { classroomService } from '@/services/classroom'
import { formatDate } from '@/utils/format'
import type { Classroom, ClassroomQuestion } from '@/types/classroom'

const { TextArea } = Input
const { Text } = Typography

const TYPE_LABELS: Record<string, string> = {
  single: '单选', multiple: '多选', judge: '判断', blank: '填空', short: '简答',
}
const TYPE_COLORS: Record<string, string> = {
  single: 'blue', multiple: 'geekblue', judge: 'green', blank: 'orange', short: 'purple',
}

const SAMPLE_JSON = `[
  {"type": "single", "stem": "题干", "options": ["A", "B", "C", "D"], "answer": "1", "score": 2},
  {"type": "judge", "stem": "题干", "answer": "true", "score": 1},
  {"type": "blank", "stem": "___ 是什么", "answer": "标准答案", "score": 2},
  {"type": "short", "stem": "简答题干", "score": 10}
]`

export default function QuestionsTab({ classroom }: { classroom: Classroom }) {
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [selected, setSelected] = useState<number[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)

  const { data, loading, pagination, refresh } = usePagination(
    (page) => classroomService.listQuestions(classroom.id, { status, ...page }),
    [status],
  )

  const publish = async () => {
    if (!selected.length) return
    const { published } = await classroomService.publishQuestions(classroom.id, selected)
    message.success(`已发布 ${published} 题`)
    setSelected([])
    refresh()
  }

  const remove = async (qid: number) => {
    await classroomService.deleteQuestion(classroom.id, qid)
    message.success('已删除')
    refresh()
  }

  const doImport = async () => {
    try {
      const questions = JSON.parse(importText)
      if (!Array.isArray(questions) || !questions.length) throw new Error('空数组')
      setImporting(true)
      const { imported } = await classroomService.importQuestions(classroom.id, questions)
      message.success(`成功导入 ${imported} 题（草稿状态），发布后才能用于测验`)
      setImportOpen(false)
      setImportText('')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? `JSON 格式错误：${error.message}` : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  const columns: ColumnsType<ClassroomQuestion> = [
    {
      title: '题型', dataIndex: 'type', width: 80,
      render: (v: string) => <Tag color={TYPE_COLORS[v]}>{TYPE_LABELS[v] ?? v}</Tag>,
    },
    { title: '题干', dataIndex: 'stem', ellipsis: true },
    { title: '分值', dataIndex: 'score', width: 70, align: 'center' },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => v === 'published' ? <Tag color='green'>已发布</Tag> : <Tag>草稿</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
    {
      title: '操作', width: 80,
      render: (_, r) => (
        <Button type='link' size='small' danger onClick={() => remove(r.id)}>删除</Button>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type='primary' icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>导入题目</Button>
        <Button disabled={!selected.length} onClick={publish}>发布选中（{selected.length}）</Button>
        <Button
          type={status === 'draft' ? 'primary' : 'default'}
          onClick={() => setStatus(status === 'draft' ? undefined : 'draft')}
        >
          只看草稿
        </Button>
        <Text type='secondary'>共 {data?.total ?? 0} 题</Text>
      </Space>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
        rowSelection={{ selectedRowKeys: selected, onChange: (keys: Key[]) => setSelected(keys as number[]) }}
      />

      <Modal
        title='导入题目（JSON 数组）'
        open={importOpen}
        onOk={doImport}
        onCancel={() => setImportOpen(false)}
        confirmLoading={importing}
        width={640}
        destroyOnClose
      >
        <Text type='secondary' style={{ display: 'block', marginBottom: 8 }}>
          单选/多选 answer 为选项序号（从 0 开始，多选逗号分隔）；判断 answer 为 true/false；填空 answer 为标准答案；简答无 answer，批改时给分。
        </Text>
        <TextArea
          rows={12}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={SAMPLE_JSON}
        />
      </Modal>
    </>
  )
}
