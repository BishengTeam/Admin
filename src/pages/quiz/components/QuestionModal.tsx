import React, { useEffect } from 'react'
import { Modal, Form, Input, TreeSelect, Radio, Checkbox, Button, Space, message } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { quizService } from '@/services/quiz'
import { requiredRule, requiredSelectRule } from '@/utils/validator'
import type { Question, Category, QuestionType } from '@/types/quiz'

interface QuestionModalProps {
  open: boolean
  question: Question | null
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}

interface TreeSelectNode {
  title: string
  value: number
  children?: TreeSelectNode[]
}

function categoryToTreeSelect(categories: Category[]): TreeSelectNode[] {
  return categories.map((cat) => {
    const node: TreeSelectNode = { title: cat.name, value: cat.id }
    if (cat.children && cat.children.length > 0) {
      node.children = categoryToTreeSelect(cat.children)
    }
    return node
  })
}

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

interface CheckboxChildProps {
  value?: string
  checked?: boolean
  onChange?: () => void
  children?: React.ReactNode
}

function CheckboxGroup({ value, onChange, children }: { value?: string[]; onChange?: (v: string[]) => void; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        const val = (child.props as CheckboxChildProps).value
        if (val === undefined) return child
        const checked = value?.includes(val) ?? false
        return React.cloneElement(child as React.ReactElement<CheckboxChildProps>, {
          checked,
          onChange: () => {
            const next = checked ? value?.filter((v) => v !== val) : [...(value || []), val]
            onChange?.(next || [])
          },
        })
      })}
    </div>
  )
}

export default function QuestionModal({ open, question, categories, onClose, onSuccess }: QuestionModalProps) {
  const [form] = Form.useForm()
  const isEdit = !!question
  const questionType = Form.useWatch('type', form) as QuestionType | undefined

  useEffect(() => {
    if (open) {
      if (question) {
        form.setFieldsValue({
          category_id: question.category_id,
          type: question.type,
          content: question.content,
          options: question.options.map((o) => ({ label: o.label, content: o.content })),
          correct_answer: question.correct_answer,
          explanation: question.explanation,
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, question, form])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const options = values.options.map((item: { label?: string; content: string }, idx: number) => ({
      label: item.label || LABELS[idx],
      content: item.content,
    }))

    const data = {
      category_id: values.category_id,
      category_name: '',
      type: values.type,
      content: values.content,
      options,
      correct_answer: Array.isArray(values.correct_answer) ? values.correct_answer : [values.correct_answer],
      explanation: values.explanation || '',
    }

    if (isEdit) {
      await quizService.updateQuestion(question!.id, data)
      message.success('更新成功')
    } else {
      await quizService.createQuestion(data)
      message.success('添加成功')
    }
    onSuccess()
  }

  return (
    <Modal
      title={isEdit ? '编辑题目' : '新增题目'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ type: 'single' }}>
        <Form.Item name="category_id" label="所属分类" rules={[requiredSelectRule('分类')]}>
          <TreeSelect
            treeData={categoryToTreeSelect(categories)}
            placeholder="选择分类"
            treeDefaultExpandAll
          />
        </Form.Item>

        <Form.Item name="type" label="题型" rules={[requiredSelectRule('题型')]}>
          <Radio.Group>
            <Radio value="single">单选题</Radio>
            <Radio value="multi">多选题</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="content" label="题目内容" rules={[requiredRule('题目内容')]}>
          <Input.TextArea rows={3} placeholder="请输入题目内容" />
        </Form.Item>

        <Form.List name="options" rules={[{ validator: async (_, value) => {
          if (!value || value.length < 2) {
            return Promise.reject(new Error('至少需要2个选项'))
          }
        }}]}>
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <span style={{ width: 24, fontWeight: 600 }}>{LABELS[name]}</span>
                  <Form.Item {...restField} name={[name, 'content']} style={{ marginBottom: 0 }} rules={[requiredRule('选项内容')]}>
                    <Input placeholder={`选项${LABELS[name]}内容`} style={{ width: 480 }} />
                  </Form.Item>
                  {fields.length > 2 && (
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                  )}
                </Space>
              ))}
              {fields.length < 6 && (
                <Button type="dashed" onClick={() => add({ content: '' })} icon={<PlusOutlined />} block>
                  添加选项
                </Button>
              )}
              <span style={{ color: '#ff4d4f', fontSize: 12 }}>{errors}</span>
            </>
          )}
        </Form.List>

        <Form.Item name="correct_answer" label="正确选项" rules={[requiredSelectRule('正确选项')]}>
          {questionType === 'multi' ? (
            <CheckboxGroup>
              {LABELS.slice(0, 6).map((l) => (
                <Checkbox key={l} value={l}>{l}</Checkbox>
              ))}
            </CheckboxGroup>
          ) : (
            <Radio.Group>
              {LABELS.slice(0, 6).map((l) => (
                <Radio key={l} value={l}>{l}</Radio>
              ))}
            </Radio.Group>
          )}
        </Form.Item>

        <Form.Item name="explanation" label="答案解析">
          <Input.TextArea rows={2} placeholder="请输入答案解析（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
