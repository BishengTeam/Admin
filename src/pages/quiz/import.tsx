import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TreeSelect, Input, Modal, Form, message, Alert, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { quizService } from '@/services/quiz'
import type { Category } from '@/types/quiz'

interface ParsedQuestion {
  question_text: string
  options: Record<string, string>
  answer: string
  question_type: 'single' | 'multi'
}

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function parseTxt(text: string): ParsedQuestion[] {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim())
  const questions: ParsedQuestion[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter((l) => l)
    if (lines.length < 3) continue

    const answerIdx = lines.findIndex((l) => /^[\[【]答案[\]】]\s*[:：]?\s*/.test(l))
    const optionLines = answerIdx >= 0 ? lines.slice(0, answerIdx) : lines
    const answerLine = answerIdx >= 0 ? lines[answerIdx] : ''

    const stemIdx = optionLines.findIndex((l) => !/^[A-H][.、．]\s/.test(l))
    const stem = stemIdx >= 0 ? optionLines[stemIdx] : optionLines[0]

    const options: Record<string, string> = {}
    for (const line of optionLines) {
      const match = line.match(/^([A-H])[.、．]\s*(.+)/)
      if (match) {
        options[match[1]] = match[2]
      }
    }

    const answerMatch = answerLine.match(/[\[【]答案[\]】]\s*[:：]?\s*([A-H]+)/i)
    const answerStr = answerMatch ? answerMatch[1].toUpperCase() : ''
    const answer = answerStr.split('').filter((c) => LABELS.includes(c)).join('')

    if (!stem || Object.keys(options).length === 0 || answer.length === 0) continue

    questions.push({
      question_text: stem,
      options,
      answer,
      question_type: answer.length > 1 ? 'multi' : 'single',
    })
  }

  return questions
}

function buildCategoryTree(categories: Category[]): { title: string; value: number; children?: unknown[] }[] {
  return categories.map((cat) => ({
    title: cat.name,
    value: cat.id,
    children: cat.children ? buildCategoryTree(cat.children) : undefined,
  }))
}

export default function QuizImport() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createForm] = Form.useForm()

  useEffect(() => {
    quizService.listCategories().then(setCategories)
  }, [])

  const parsed = parseTxt(text)
  const validCount = parsed.length

  const handleImport = async () => {
    if (!categoryId || parsed.length === 0) return
    setImporting(true)
    try {
      await quizService.importQuestions({ category_id: categoryId, questions: parsed })
      message.success(`成功导入 ${parsed.length} 道题目`)
      navigate('/admin/quiz')
    } catch {
      setImporting(false)
    }
  }

  const handleCreateCategory = async () => {
    const values = await createForm.validateFields()
    await quizService.createCategory(values)
    message.success('分类创建成功')
    setCreateModalOpen(false)
    createForm.resetFields()
    const cats = await quizService.listCategories()
    setCategories(cats)
  }

  return (
    <PageContainer title="批量导入">
      <div style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <TreeSelect
            style={{ flex: 1 }}
            placeholder="选择题目分类"
            treeData={buildCategoryTree(categories)}
            value={categoryId}
            onChange={(v) => setCategoryId(v)}
            treeDefaultExpandAll
          />
          <Button icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            新增分类
          </Button>
        </div>

        <Alert
          type="info"
          message="导入格式说明"
          description={
            <div>
              <p>每道题目用<strong>空行</strong>隔开，格式如下：</p>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 13, marginTop: 8 }}>
{`题干内容（第一行）
A. 选项A
B. 选项B
C. 选项C
D. 选项D
[答案]: C`}
              </pre>
              <p style={{ marginTop: 8, color: '#666' }}>
                支持 A-H 共 8 个选项，单选题答案如 <code>C</code>，多选题答案如 <code>ABC</code>
              </p>
            </div>
          }
          style={{ marginBottom: 16 }}
        />

        <Input.TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`在此粘贴题目内容...\n\n示例：\nOSPF的默认管理距离是？\nA. 10\nB. 20\nC. 30\nD. 40\n[答案]: A\n\n以下属于路由协议的是？\nA. OSPF\nB. HTTP\nC. BGP\nD. FTP\n[答案]: AC`}
          rows={16}
          style={{ fontFamily: 'monospace', fontSize: 14, marginBottom: 16 }}
        />

        {text.trim() && (
          <Alert
            type={validCount > 0 ? 'success' : 'warning'}
            message={validCount > 0 ? `识别到 ${validCount} 道题目` : '未能识别到有效题目，请检查格式'}
            style={{ marginBottom: 16 }}
          />
        )}

        <Space>
          <Button onClick={() => navigate('/admin/quiz')}>取消</Button>
          <Button
            type="primary"
            disabled={!categoryId || validCount === 0}
            loading={importing}
            onClick={handleImport}
          >
            导入{validCount > 0 ? ` (${validCount} 题)` : ''}
          </Button>
        </Space>

        <Modal
          title="新增分类"
          open={createModalOpen}
          onOk={handleCreateCategory}
          onCancel={() => setCreateModalOpen(false)}
          destroyOnClose
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
              <Input placeholder="如：H3CNE" />
            </Form.Item>
            <Form.Item name="parent_id" label="父分类">
              <TreeSelect
                placeholder="留空则为顶级分类"
                treeData={buildCategoryTree(categories)}
                allowClear
                treeDefaultExpandAll
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  )
}
