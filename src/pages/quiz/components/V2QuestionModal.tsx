import { useEffect } from 'react'
import { Button, Checkbox, Form, Input, message, Modal, Radio, Select, Space } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { quizService } from '@/services/quiz'
import type {
  QuizKnowledgePoint,
  QuizModule,
  QuizV2Question,
  QuizV2QuestionCreate,
  QuizV2QuestionUpdate,
  QuestionType,
} from '@/types/quiz'
import { answerToArray, answerToPayload, QUESTION_OPTION_KEYS } from '@/types/quiz'
import { ApiError, isConflictError, isNotFoundError, isValidationError } from '@/core/request'

interface Props {
  open: boolean
  question: QuizV2Question | null
  modules: QuizModule[]
  defaultPointId?: number
  onClose: () => void
  onSaved: (question: QuizV2Question) => void
  onConflict: () => void
  onNotFound: () => void
}

interface OptionValue { content?: string }

function stableOptions(value: Record<string, string> | null | undefined) {
  return QUESTION_OPTION_KEYS.reduce<Record<string, string>>((result, key) => {
    if (value?.[key] !== undefined) result[key] = value[key]
    return result
  }, {})
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function V2QuestionModal({ open, question, modules, defaultPointId, onClose, onSaved, onConflict, onNotFound }: Props) {
  const [form] = Form.useForm()
  const type = Form.useWatch('question_type', form) as QuestionType | undefined
  const options = Form.useWatch('options', form) as OptionValue[] | undefined

  useEffect(() => {
    if (!open) return
    if (!question) {
      form.resetFields()
      form.setFieldsValue({ knowledge_point_id: defaultPointId, question_type: 'single_choice', options: [{ content: '' }, { content: '' }, { content: '' }] })
      return
    }
    form.setFieldsValue({
      knowledge_point_id: question.knowledge_point_id,
      question_type: question.question_type,
      question_text: question.question_text,
      options: question.question_type === 'judge'
        ? [{ content: '正确' }, { content: '错误' }]
        : Object.entries(stableOptions(question.options)).map(([, content]) => ({ content })),
      correct_answer: question.question_type === 'multiple_choice' ? answerToArray(question.correct_answer) : question.correct_answer,
      explanation: question.explanation ?? undefined,
    })
  }, [defaultPointId, form, open, question])

  const handleTypeChange = (next: QuestionType) => {
    if (next === 'judge') form.setFieldsValue({ options: [{ content: '正确' }, { content: '错误' }], correct_answer: undefined })
    else if (type === 'judge') form.setFieldsValue({ options: [{ content: '' }, { content: '' }, { content: '' }], correct_answer: undefined })
    else if (next !== type) form.setFieldValue('correct_answer', undefined)
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const questionType = values.question_type as QuestionType
      const optionRecord: Record<string, string> = {}
      ;((values.options ?? []) as OptionValue[]).slice(0, 4).forEach((item, index) => {
        const content = String(item?.content ?? '').trim()
        if (content) optionRecord[QUESTION_OPTION_KEYS[index]] = content
      })
      if (questionType === 'judge') { optionRecord.A = '正确'; optionRecord.B = '错误' }
      const answer = answerToPayload(values.correct_answer, questionType)
      const questionText = String(values.question_text).trim()
      if (!question) {
        const payload: QuizV2QuestionCreate = {
          knowledge_point_id: values.knowledge_point_id,
          question_type: questionType,
          question_text: questionText,
          options: Object.keys(optionRecord).length ? optionRecord : null,
          correct_answer: answer,
          explanation: values.explanation?.trim() || null,
        }
        onSaved(await quizService.createV2Question(payload))
        return
      }
      const payload: QuizV2QuestionUpdate = { lock_version: question.lock_version }
      if (values.knowledge_point_id !== question.knowledge_point_id) payload.knowledge_point_id = values.knowledge_point_id
      if (questionType !== question.question_type) payload.question_type = questionType
      if (questionText !== question.question_text) payload.question_text = questionText
      const normalizedOptions = Object.keys(optionRecord).length ? optionRecord : null
      if (!sameValue(stableOptions(question.options), stableOptions(normalizedOptions))) payload.options = normalizedOptions
      if (!sameValue(answer, question.correct_answer)) payload.correct_answer = answer
      const explanation = values.explanation?.trim() || null
      if (explanation !== question.explanation) payload.explanation = explanation
      if (Object.keys(payload).length === 1) { onClose(); return }
      onSaved(await quizService.updateV2Question(question.id, payload))
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      if (error instanceof ApiError && isConflictError(error)) { onConflict(); return }
      if (error instanceof ApiError && isNotFoundError(error)) { onNotFound(); return }
      if (error instanceof ApiError && isValidationError(error)) {
        const fields = error.fields.map((item) => ({ name: item.field?.split('.') ?? item.loc?.map(String) ?? [], errors: [item.reason || item.msg || item.message || error.message] })).filter((item) => item.name.length)
        if (fields.length) form.setFields(fields)
        else message.warning(error.message)
        return
      }
      message.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  const points = modules.flatMap((module) => module.knowledge_points.map((point: QuizKnowledgePoint) => ({
    value: point.id,
    label: `${module.name} / ${point.name}${module.status !== 'active' || point.status !== 'active' ? '（不可写）' : ''}`,
    disabled: module.status !== 'active' || point.status !== 'active',
  })))
  const optionCount = options?.length ?? 0
  const keys = type === 'judge' ? ['A', 'B'] : QUESTION_OPTION_KEYS.slice(0, Math.min(optionCount, 4))

  return (
    <Modal title={question ? '编辑题目并创建待发布修订' : '新增题目草稿'} open={open} onOk={save} onCancel={onClose} width={760} destroyOnClose>
      {question?.ever_published && <div style={{ marginBottom: 16, color: '#d46b08' }}>已发布题目的内容编辑会创建新的待发布修订，当前线上版本保持不变，需再次点击“发布修订”才会切换未来会话。</div>}
      <Form form={form} layout="vertical">
        <Form.Item name="knowledge_point_id" label="所属知识点" rules={[{ required: true, message: '请选择知识点；模块和题库不能直接挂题' }]}><Select showSearch optionFilterProp="label" options={points} /></Form.Item>
        <Form.Item name="question_type" label="题型" rules={[{ required: true }]}><Radio.Group onChange={(event) => handleTypeChange(event.target.value)}><Radio value="single_choice">单选题</Radio><Radio value="multiple_choice">多选题</Radio><Radio value="judge">判断题</Radio></Radio.Group></Form.Item>
        <Form.Item name="question_text" label="题干" rules={[{ required: true, message: '请输入题干' }, { max: 1024 }]}><Input.TextArea rows={4} /></Form.Item>
        <Form.List name="options">
          {(fields, { add, remove }) => <div>
            <div style={{ marginBottom: 8 }}>选项（A-D）</div>
            {fields.slice(0, 4).map(({ key, name, ...rest }) => <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
              <strong style={{ width: 22 }}>{QUESTION_OPTION_KEYS[name]}</strong>
              <Form.Item {...rest} name={[name, 'content']} style={{ marginBottom: 0 }}><Input disabled={type === 'judge'} style={{ width: 560 }} /></Form.Item>
              {type !== 'judge' && fields.length > 2 && <MinusCircleOutlined onClick={() => remove(name)} />}
            </Space>)}
            {type !== 'judge' && optionCount < 4 && <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ content: '' })}>添加选项</Button>}
          </div>}
        </Form.List>
        <Form.Item name="correct_answer" label="正确答案">{type === 'multiple_choice' ? <Checkbox.Group options={keys.map((value) => ({ value, label: value }))} /> : <Radio.Group options={keys.map((value) => ({ value, label: value }))} />}</Form.Item>
        <Form.Item name="explanation" label="解析"><Input.TextArea rows={3} maxLength={1024} showCount /></Form.Item>
      </Form>
    </Modal>
  )
}
