import { useState } from 'react'
import type { Key } from 'react'
import { Table, Button, Tag, Space, Modal, Typography, Upload, Divider, message } from 'antd'
import { DownloadOutlined, ImportOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { classroomService } from '@/services/classroom'
import { readClassroomQuestionImportFile, downloadTemplate, type ParsedQuestion } from '@/utils/classroomQuestionImport'
import { formatDate } from '@/utils/format'
import type { Classroom, ClassroomQuestion } from '@/types/classroom'

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
  const [importFile, setImportFile] = useState<File | null>(null)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv')
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
    if (!parsedQuestions.length) return message.warning('请先选择文件')
    setImporting(true)
    try {
      const { imported } = await classroomService.importQuestions(classroom.id, parsedQuestions)
      message.success(`成功导入 ${imported} 题（草稿状态），发布后才能用于测验`)
      setImportOpen(false)
      setImportFile(null)
      setParsedQuestions([])
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  const handleImportFileSelect = async (file: File) => {
    try {
      const { questionCount, questions, format } = await readClassroomQuestionImportFile(file)
      setImportFile(file)
      setParsedQuestions(questions)
      setImportFormat(format)
      message.success(`已解析 ${questionCount} 道题目，请预览确认后导入`)
    } catch (error) {
      setImportFile(null)
      setParsedQuestions([])
      message.error(error instanceof Error ? error.message : '文件解析失败')
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
        title='导入题目'
        open={importOpen}
        onOk={doImport}
        onCancel={() => { setImportOpen(false); setImportFile(null); setParsedQuestions([]) }}
        okText={`导入 ${parsedQuestions.length || ''} 题`}
        okButtonProps={{ disabled: !parsedQuestions.length }}
        confirmLoading={importing}
        width={720}
        destroyOnClose
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Upload
            maxCount={1}
            accept='.csv,.json'
            beforeUpload={(f) => { handleImportFileSelect(f); return false }}
            onRemove={() => { setImportFile(null); setParsedQuestions([]) }}
            fileList={importFile ? [{ uid: '-1', name: importFile.name } as never] : []}
          >
            <Button icon={<UploadOutlined />} type='primary' ghost>
              选择 CSV / JSON 文件
            </Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate()}>
            下载 CSV 模板
          </Button>
        </div>

        <Text type='secondary' style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          支持 CSV（推荐 Excel/WPS 直接编辑）和 JSON 两种格式。CSV 列：题型（单选/多选/判断/填空/简答）、题干、选项A-D、答案（A/B/C/D 或 对/错）、分值、解析。
        </Text>

        {parsedQuestions.length > 0 && (
          <>
            <Divider orientation='left' orientationMargin={0}>
              <Text type='secondary' style={{ fontSize: 13 }}>预览（{parsedQuestions.length} 题 · {importFormat.toUpperCase()} 格式）</Text>
            </Divider>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {parsedQuestions.slice(0, 20).map((q, i) => (
                <div key={i} style={{ padding: '8px 12px', background: i % 2 ? '#fafafa' : '#fff', borderRadius: 6, marginBottom: 4 }}>
                  <Space size={8}>
                    <Tag color={TYPE_COLORS[q.type]}>{TYPE_LABELS[q.type]}</Tag>
                    <Text style={{ fontSize: 13 }}>{q.stem.slice(0, 60)}{q.stem.length > 60 ? '…' : ''}</Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>{q.score} 分</Text>
                    {q.answer && <Text type='secondary' style={{ fontSize: 12 }}>答案: {q.answer}</Text>}
                  </Space>
                </div>
              ))}
              {parsedQuestions.length > 20 && (
                <Text type='secondary' style={{ display: 'block', textAlign: 'center', padding: 8, fontSize: 12 }}>
                  …还有 {parsedQuestions.length - 20} 题未展示
                </Text>
              )}
            </div>
          </>
        )}
    </Modal>
    </>
  )
}
