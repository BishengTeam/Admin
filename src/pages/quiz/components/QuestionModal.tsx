import { useEffect } from 'react'
import { Button, Checkbox, Form, Input, message, Modal, Radio, Space, TreeSelect } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { ImageUpload } from '@/components/ImageUpload'
import { MultiImageUpload } from '@/components/MultiImageUpload'
import type { Category, Question, QuestionCreate, QuestionType, QuestionUpdate } from '@/types/quiz'
import { answerToArray, answerToPayload, QUESTION_OPTION_KEYS } from '@/types/quiz'
import { buildCategoryTree, isCategoryEffectivelyDisabled } from './CategoryTree'
import { quizService } from '@/services/quiz'
import { ApiError, isConflictError, isNotFoundError, isValidationError } from '@/core/request'

interface QuestionModalProps {
  open: boolean
  question: Question | null
  categories: Category[]
  canWrite: boolean
  onClose: () => void
  onSaved: (question: Question) => void
  onConflict: () => void
  onNotFound: () => void
}

interface OptionValue { content?: string; image_url?: string }

function categoryNodes(categories: Category[], all: Category[]): Array<{ title: string; value: number; disabled?: boolean; children?: ReturnType<typeof categoryNodes> }> {
  return categories.map((category) => ({
    title: `${category.name}${category.status === 'disabled' ? '（停用）' : ''}${isCategoryEffectivelyDisabled(all, category.id) && category.status === 'active' ? '（继承停用）' : ''}`,
    value: category.id,
    disabled: isCategoryEffectivelyDisabled(all, category.id),
    children: category.children?.length ? categoryNodes(category.children, all) : undefined,
  }))
}

function stableOptions(value: Record<string, string> | null | undefined) {
  return QUESTION_OPTION_KEYS.reduce<Record<string, string>>((result, key) => {
    if (value?.[key] !== undefined) result[key] = value[key]
    return result
  }, {})
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}


export default function QuestionModal({ open, question, categories, canWrite, onClose, onSaved, onConflict, onNotFound }: QuestionModalProps) {
  const [form] = Form.useForm()
  const type = Form.useWatch('question_type', form) as QuestionType | undefined
  const options = Form.useWatch('options', form) as OptionValue[] | undefined
  const isEdit = Boolean(question)

  useEffect(() => {
    if (!open) return
    if (!question) {
      form.resetFields()
      form.setFieldsValue({ question_type: 'single_choice', options: [{ content: '' }, { content: '' }, { content: '' }], image_urls: [] })
      return
    }
    form.setFieldsValue({
      category_id: question.category_id,
      question_type: question.question_type,
      question_text: question.question_text,
      options: question.question_type === 'judge'
        ? [{ content: '正确' }, { content: '错误' }]
        : Object.entries(stableOptions(question.options)).map(([key, content]) => ({ content, image_url: question.option_image_urls?.[key] ?? '' })),
      correct_answer: question.question_type === 'multiple_choice' ? answerToArray(question.correct_answer) : question.correct_answer,
      explanation: question.explanation ?? undefined,
      image_urls: question.image_urls ?? [],
    })
  }, [form, open, question])

  const handleTypeChange = (next: QuestionType) => {
    if (next === 'judge') {
      form.setFieldsValue({ options: [{ content: '正确' }, { content: '错误' }], correct_answer: undefined })
    } else if (type === 'judge') {
      form.setFieldsValue({ options: [{ content: '' }, { content: '' }, { content: '' }], correct_answer: undefined })
    } else if (next !== type) {
      // Single- and multiple-choice answers use different wire shapes.  Do
      // not retain a string in Checkbox.Group or an array in Radio.Group when
      // the administrator changes the question type.
      form.setFieldValue('correct_answer', undefined)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const questionType = values.question_type as QuestionType
      const questionText = String(values.question_text).trim()
      if (!questionText) { form.setFields([{ name: 'question_text', errors: ['请输入题干'] }]); return }
      const optionValues = (values.options ?? []) as OptionValue[]
      const optionRecord: Record<string, string> = {}
      const optionImages: Record<string, string> = {}
      optionValues.slice(0, 4).forEach((item, index) => {
        const content = String(item?.content ?? '').trim()
        const imageUrl = String(item?.image_url ?? '').trim()
        if (content || imageUrl) {
          optionRecord[QUESTION_OPTION_KEYS[index]] = content
          if (imageUrl) optionImages[QUESTION_OPTION_KEYS[index]] = imageUrl
        }
      })
      if (questionType === 'judge') {
        optionRecord.A = '正确'
        optionRecord.B = '错误'
      }
      const answer = answerToPayload(values.correct_answer, questionType)
      const imageUrls: string[] = values.image_urls ?? []
      if (!isEdit) {
        const payload: QuestionCreate = {
          category_id: values.category_id,
          question_type: questionType,
          question_text: questionText,
          ...(Object.keys(optionRecord).length ? { options: optionRecord } : {}),
          ...(answer ? { correct_answer: answer } : {}),
          ...(values.explanation?.trim() ? { explanation: values.explanation.trim() } : {}),
          image_urls: imageUrls,
          ...(Object.keys(optionImages).length ? { option_image_urls: optionImages } : {}),
        }
        const created = await quizService.createQuestion(payload)
        onSaved(created)
        return
      }

      const update: QuestionUpdate = { lock_version: question!.lock_version }
      if (values.category_id !== question!.category_id) update.category_id = values.category_id
      if (questionType !== question!.question_type) update.question_type = questionType
      if (questionText !== question!.question_text) update.question_text = questionText
      const normalizedOptions = Object.keys(optionRecord).length ? optionRecord : null
      if (!sameValue(stableOptions(question!.options), stableOptions(normalizedOptions))) update.options = normalizedOptions
      if (!sameValue(answer, question!.correct_answer)) update.correct_answer = answer
      const explanation = values.explanation?.trim() || null
      if (explanation !== question!.explanation) update.explanation = explanation
      if (!sameValue(imageUrls, question!.image_urls ?? [])) update.image_urls = imageUrls
      if (!sameValue(optionImages, question!.option_image_urls ?? {})) update.option_image_urls = optionImages
      if (Object.keys(update).length === 1) {
        onClose()
        return
      }
      const updated = await quizService.updateQuestion(question!.id, update)
      onSaved(updated)
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return
      if (error instanceof ApiError && isConflictError(error)) {
        onConflict()
        return
      }
      if (error instanceof ApiError && isNotFoundError(error)) {
        onNotFound()
        return
      }
      if (error instanceof ApiError && isValidationError(error)) {
        const fieldErrors = error.fields
          .filter((field) => field.loc?.length || field.field)
          .map((field) => {
            const rawPath = field.field?.split('.')
              ?? (field.loc?.map(String) ?? ['question_text'])
            const name = rawPath.map((part) => /^\d+$/.test(part) ? Number(part) : part)
            return { name, errors: [field.msg || field.reason || field.message || error.message] }
          })
        if (fieldErrors.length) form.setFields(fieldErrors)
        else message.warning(error.message)
        return
      }
      if (!(error instanceof ApiError && (error.status == null || error.status >= 500))) message.error(error instanceof Error ? error.message : '请求失败')
    }
  }

  const currentOptionsCount = options?.length ?? 0
  const selectableOptionKeys = type === 'judge'
    ? ['A', 'B']
    : QUESTION_OPTION_KEYS.slice(0, Math.min(currentOptionsCount, QUESTION_OPTION_KEYS.length))
  const tree = buildCategoryTree(categories)

  return (
    <Modal
      title={isEdit ? '编辑题目' : '新增题目'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okButtonProps={{ disabled: !canWrite }}
      width={760}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="category_id" label="所属分类" rules={[{ required: true, message: '请选择分类' }]}>
          <TreeSelect treeData={categoryNodes(tree, tree)} treeDefaultExpandAll showSearch placeholder="选择有效分类" />
        </Form.Item>
        <Form.Item name="question_type" label="题型" rules={[{ required: true, message: '请选择题型' }]}>
          <Radio.Group onChange={(event) => handleTypeChange(event.target.value)}>
            <Radio value="single_choice">单选题</Radio>
            <Radio value="multiple_choice">多选题</Radio>
            <Radio value="judge">判断题</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="question_text" label="题干" rules={[{ required: true, message: '请输入题干' }, { max: 1024, message: '题干不能超过 1024 个字符' }]}>
          <Input.TextArea rows={4} placeholder="草稿允许暂不填写选项，发布时会执行完整校验" />
        </Form.Item>
        <Form.Item name="image_urls" label="题干图片（最多 9 张）">
          <MultiImageUpload />
        </Form.Item>
        <Form.List name="options">
          {(fields, { add, remove }) => (
            <div>
              <div style={{ marginBottom: 8 }}>选项（仅 A-D）</div>
              {fields.slice(0, 4).map(({ key, name, ...rest }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <strong style={{ width: 22 }}>{QUESTION_OPTION_KEYS[name]}</strong>
                  <Form.Item {...rest} name={[name, 'content']} style={{ marginBottom: 0 }} rules={[{ max: 1024, message: '选项不能超过 1024 个字符' }]}>
                    <Input disabled={type === 'judge'} placeholder={`选项 ${QUESTION_OPTION_KEYS[name]}`} style={{ width: 360 }} />
                  </Form.Item>
                  {type !== 'judge' && (
                    <Form.Item {...rest} name={[name, 'image_url']} style={{ marginBottom: 0 }}>
                      <ImageUpload />
                    </Form.Item>
                  )}
                  {type !== 'judge' && fields.length > 2 && <MinusCircleOutlined onClick={() => remove(name)} />}
                </Space>
              ))}
              {type !== 'judge' && currentOptionsCount < 4 && <Button type="dashed" onClick={() => add({ content: '' })} icon={<PlusOutlined />}>添加选项</Button>}
            </div>
          )}
        </Form.List>
        <Form.Item name="correct_answer" label="正确答案">
          {type === 'multiple_choice' ? (
            <Checkbox.Group options={selectableOptionKeys.map((value) => ({ label: value, value }))} />
          ) : (
            <Radio.Group options={type === 'judge' ? [{ label: 'A（正确）', value: 'A' }, { label: 'B（错误）', value: 'B' }] : selectableOptionKeys.map((value) => ({ label: value, value }))} />
          )}
        </Form.Item>
        <Form.Item name="explanation" label="答案解析"><Input.TextArea rows={3} maxLength={1024} showCount /></Form.Item>
      </Form>
    </Modal>
  )
}
