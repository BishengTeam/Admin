import { useEffect } from 'react'
import { Button, Checkbox, Form, Input, message, Modal, Radio, Select, Space } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { ImageUpload } from '@/components/ImageUpload'
import { MultiImageUpload } from '@/components/MultiImageUpload'
import { toAbsoluteMediaUrl } from '@/utils/mediaUrl'
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
import { countFillBlankPlaceholders } from '@/types/quiz'
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

interface OptionValue { content?: string; image_url?: string }

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
  const questionText = Form.useWatch('question_text', form) as string | undefined
  const isChoiceType = type === 'single_choice' || type === 'multiple_choice' || type === 'judge' || !type
  const blankCount = countFillBlankPlaceholders(String(questionText ?? ''))

  useEffect(() => {
    if (!open) return
    if (!question) {
      form.resetFields()
      form.setFieldsValue({ knowledge_point_id: defaultPointId, question_type: 'single_choice', options: [{ content: '' }, { content: '' }, { content: '' }], image_urls: [] })
      return
    }
    form.setFieldsValue({
      knowledge_point_id: question.knowledge_point_id,
      question_type: question.question_type,
      question_text: question.question_text,
      options: question.question_type === 'judge'
        ? [{ content: '正确' }, { content: '错误' }]
        : Object.entries(stableOptions(question.options)).map(([key, content]) => ({ content, image_url: question.option_image_urls?.[key] ?? '' })),
      correct_answer: question.question_type === 'multiple_choice' ? answerToArray(question.correct_answer) : question.correct_answer,
      fill_answers: question.question_type === 'fill_blank' && Array.isArray(question.correct_answer)
        ? (question.correct_answer as string[][]).map((group) => ({ candidates: [...group] }))
        : undefined,
      explanation: question.explanation ?? undefined,
      image_urls: question.image_urls ?? [],
    })
  }, [defaultPointId, form, open, question])

  const handleTypeChange = (next: QuestionType) => {
    if (next === 'fill_blank' || next === 'essay') {
      form.setFieldsValue({ options: undefined, correct_answer: undefined, fill_answers: next === 'fill_blank' ? [{ candidates: [''] }] : undefined })
      return
    }
    if (type === 'fill_blank' || type === 'essay') {
      form.setFieldsValue({ fill_answers: undefined, correct_answer: undefined, options: [{ content: '' }, { content: '' }, { content: '' }] })
      return
    }
    if (next === 'judge') form.setFieldsValue({ options: [{ content: '正确' }, { content: '错误' }], correct_answer: undefined })
    else if (type === 'judge') form.setFieldsValue({ options: [{ content: '' }, { content: '' }, { content: '' }], correct_answer: undefined })
    else if (next !== type) form.setFieldValue('correct_answer', undefined)
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const questionType = values.question_type as QuestionType
      const optionRecord: Record<string, string> = {}
      const optionImages: Record<string, string> = {}
      ;((values.options ?? []) as OptionValue[]).slice(0, 4).forEach((item, index) => {
        const content = String(item?.content ?? '').trim()
        const imageUrl = String(item?.image_url ?? '').trim()
        if (content || imageUrl) {
          optionRecord[QUESTION_OPTION_KEYS[index]] = content
          if (imageUrl) optionImages[QUESTION_OPTION_KEYS[index]] = toAbsoluteMediaUrl(imageUrl)
        }
      })
      if (questionType === 'judge') { optionRecord.A = '正确'; optionRecord.B = '错误' }
      let answer = answerToPayload(values.correct_answer, questionType)
      if (questionType === 'fill_blank') {
        const groups = ((values.fill_answers ?? []) as Array<{ candidates?: string[] }>).map((group) =>
          (group.candidates ?? []).map((candidate) => String(candidate ?? '')).filter((candidate) => candidate.trim()),
        ).filter((group) => group.length > 0)
        const placeholders = countFillBlankPlaceholders(String(values.question_text ?? ''))
        if (placeholders < 1 || placeholders > 5) throw new Error('填空题题干必须包含 1 至 5 个空位（____）')
        if (groups.length !== placeholders) throw new Error(`题干有 ${placeholders} 个空位，请填写 ${placeholders} 组答案`)
        answer = groups
      }
      if (questionType === 'essay') {
        const reference = String(values.correct_answer ?? '').trim()
        if (!reference) throw new Error('问答题必须填写参考答案（阅卷依据）')
        answer = reference
      }
      const questionText = String(values.question_text).trim()
      const imageUrls: string[] = (values.image_urls ?? []).map(toAbsoluteMediaUrl)
      if (!question) {
        const payload: QuizV2QuestionCreate = {
          knowledge_point_id: values.knowledge_point_id,
          question_type: questionType,
          question_text: questionText,
          options: Object.keys(optionRecord).length ? optionRecord : null,
          correct_answer: answer,
          explanation: values.explanation?.trim() || null,
          image_urls: imageUrls,
          option_image_urls: Object.keys(optionImages).length ? optionImages : undefined,
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
      if (!sameValue(imageUrls, question.image_urls ?? [])) payload.image_urls = imageUrls
      if (!sameValue(optionImages, question.option_image_urls ?? {})) payload.option_image_urls = optionImages
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
        <Form.Item name="question_type" label="题型" rules={[{ required: true }]}><Radio.Group onChange={(event) => handleTypeChange(event.target.value)}><Radio value="single_choice">单选题</Radio><Radio value="multiple_choice">多选题</Radio><Radio value="judge">判断题</Radio><Radio value="fill_blank">填空题</Radio><Radio value="essay">问答题</Radio></Radio.Group></Form.Item>
        <Form.Item
          name="question_text"
          label={type === 'fill_blank' ? <span>题干（用连续下划线 <code>____</code> 标记空位，当前 {blankCount} 空）</span> : '题干'}
          rules={[{ required: true, message: '请输入题干' }, { max: 1024 }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="image_urls" label="题干图片（最多 9 张）"><MultiImageUpload purpose='quiz' /></Form.Item>
        {type === 'fill_blank' && (
          <Form.List name="fill_answers">
            {(fields, { add, remove }) => (
              <div>
                <div style={{ marginBottom: 8 }}>每空答案（第 N 组对应题干第 N 个空位；每组可填多个候选，学生答案与任一候选完全一致即得分）</div>
                {fields.map(({ key, name, ...rest }, index) => (
                  <div key={key} style={{ border: '1px dashed #d9d9d9', padding: '8px 12px', marginBottom: 8 }}>
                    <Space style={{ marginBottom: 4 }}>
                      <strong>空 {index + 1}</strong>
                      {fields.length > 1 && <Button type="link" size="small" onClick={() => remove(name)}>删除该空</Button>}
                    </Space>
                    <Form.List name={[name, 'candidates']}>
                      {(candidateFields, { add: addCandidate, remove: removeCandidate }) => (
                        <div>
                          {(candidateFields as Array<{ key: number; name: number }>).map(({ key: cKey, name: cName }) => (
                            <Space key={cKey} align="baseline" style={{ display: 'flex', marginBottom: 4 }}>
                              <Form.Item name={cName} style={{ marginBottom: 0 }} rules={[{ required: true, message: '候选答案不能为空' }, { max: 200, message: '候选答案不超过 200 字' }]}>
                                <Input style={{ width: 420 }} placeholder={`空 ${index + 1} 的候选答案`} />
                              </Form.Item>
                              {candidateFields.length > 1 && <MinusCircleOutlined onClick={() => removeCandidate(cName)} />}
                            </Space>
                          ))}
                          {candidateFields.length < 5 && <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addCandidate('')}>添加候选</Button>}
                        </div>
                      )}
                    </Form.List>
                  </div>
                ))}
                {fields.length < 5 && <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ candidates: [''] })}>添加空</Button>}
                {fields.length !== blankCount && <div style={{ color: '#d46b08', marginTop: 8 }}>题干检测到 {blankCount} 个空位，当前已配置 {fields.length} 组答案，两者必须一致。</div>}
              </div>
            )}
          </Form.List>
        )}
        {type === 'essay' && (
          <Form.Item name="correct_answer" label="参考答案（必填，阅卷时管理员对照打分的依据）" rules={[{ required: true, message: '请填写参考答案' }, { max: 5000, message: '参考答案不超过 5000 字' }]}>
            <Input.TextArea rows={6} maxLength={5000} showCount placeholder="参考答案与评分要点" />
          </Form.Item>
        )}
        {isChoiceType && (
          <>
            <Form.List name="options">
              {(fields, { add, remove }) => <div>
                <div style={{ marginBottom: 8 }}>选项（A-D）</div>
                {fields.slice(0, 4).map(({ key, name, ...rest }) => <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                  <strong style={{ width: 22 }}>{QUESTION_OPTION_KEYS[name]}</strong>
                  <Form.Item {...rest} name={[name, 'content']} style={{ marginBottom: 0 }}><Input disabled={type === 'judge'} style={{ width: 360 }} /></Form.Item>
                  {type !== 'judge' && <Form.Item {...rest} name={[name, 'image_url']} style={{ marginBottom: 0 }}><ImageUpload purpose='quiz' /></Form.Item>}
                  {type !== 'judge' && fields.length > 2 && <MinusCircleOutlined onClick={() => remove(name)} />}
                </Space>)}
                {type !== 'judge' && optionCount < 4 && <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ content: '' })}>添加选项</Button>}
              </div>}
            </Form.List>
            <Form.Item name="correct_answer" label="正确答案">{type === 'multiple_choice' ? <Checkbox.Group options={keys.map((value) => ({ value, label: value }))} /> : <Radio.Group options={keys.map((value) => ({ value, label: value }))} />}</Form.Item>
          </>
        )}
        <Form.Item name="explanation" label="解析"><Input.TextArea rows={3} maxLength={1024} showCount /></Form.Item>
      </Form>
    </Modal>
  )
}
