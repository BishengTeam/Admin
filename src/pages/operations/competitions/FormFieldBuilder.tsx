import { useEffect, useState } from 'react'
import {
  Button, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Switch,
  Table, Tag, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ArrowDownOutlined, ArrowUpOutlined, EditOutlined, MinusCircleOutlined,
  PlusOutlined, SettingOutlined,
} from '@ant-design/icons'

const { Text } = Typography;

export interface FormField {
  key: string
  label: string
  type: string
  required: boolean
  placeholder?: string | null
  max_length?: number | null
  options?: string[] | null
  sort_order: number
}

const TYPE_OPTIONS = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'select', label: '下拉选择' },
  { value: 'radio', label: '单选' },
  { value: 'checkbox', label: '多选' },
  { value: 'date', label: '日期' },
  { value: 'phone', label: '手机号' },
  { value: 'email', label: '邮箱' },
  { value: 'idcard', label: '身份证号' },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map(o => [o.value, o.label])
)

const TYPE_COLORS: Record<string, string> = {
  text: 'blue', textarea: 'cyan', number: 'geekblue',
  select: 'purple', radio: 'magenta', checkbox: 'orange',
  date: 'green', phone: 'volcano', email: 'gold', idcard: 'red',
}

// Preset fields that admins can quickly add
const PRESET_FIELDS: FormField[] = [
  { key: 'student_id', label: '学号', type: 'text', required: true, placeholder: '请输入学号', max_length: 20, sort_order: 0 },
  { key: 'grade', label: '年级', type: 'select', required: true, options: ['大一', '大二', '大三', '大四', '研究生'], sort_order: 0 },
  { key: 'major', label: '专业', type: 'text', required: true, placeholder: '请输入专业', max_length: 64, sort_order: 0 },
  { key: 'idcard', label: '身份证号', type: 'idcard', required: false, placeholder: '18位身份证号', sort_order: 0 },
  { key: 'email', label: '邮箱', type: 'email', required: false, placeholder: '用于接收通知', sort_order: 0 },
  { key: 'team_name', label: '队伍名称', type: 'text', required: true, placeholder: '团队参赛必填', max_length: 64, sort_order: 0 },
  { key: 'team_size', label: '团队人数', type: 'number', required: true, placeholder: '如：3', sort_order: 0 },
  { key: 'gender', label: '性别', type: 'radio', required: true, options: ['男', '女'], sort_order: 0 },
  { key: 'birth_date', label: '出生日期', type: 'date', required: false, sort_order: 0 },
  { key: 'address', label: '通信地址', type: 'textarea', required: false, placeholder: '省市区街道', max_length: 256, sort_order: 0 },
  { key: 'emergency_contact', label: '紧急联系人', type: 'text', required: false, placeholder: '姓名及电话', max_length: 64, sort_order: 0 },
  { key: 'skills', label: '技能标签', type: 'checkbox', required: false, options: ['前端', '后端', '运维', '安全', '算法', '测试', '产品设计'], sort_order: 0 },
]

interface FormFieldBuilderProps {
  value?: FormField[]
  onChange?: (fields: FormField[]) => void
}

export default function FormFieldBuilder({ value = [], onChange }: FormFieldBuilderProps) {
  const [editing, setEditing] = useState<FormField | null>(null)
  const [editIndex, setEditIndex] = useState<number>(-2)
  const [editOpen, setEditOpen] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)

  const emitChange = (fields: FormField[]) => {
    onChange?.(fields.map((f, i) => ({ ...f, sort_order: i })))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...value]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    emitChange(next)
  }

  const moveDown = (index: number) => {
    if (index === value.length - 1) return
    const next = [...value]
    ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
    emitChange(next)
  }

  const remove = (index: number) => {
    const next = value.filter((_, i) => i !== index)
    emitChange(next)
  }

  const addPreset = (preset: FormField) => {
    // Check if key already exists
    if (value.some(f => f.key === preset.key)) {
      message.warning(`字段「${preset.label}」已存在`)
      return
    }
    emitChange([...value, { ...preset }])
    setPresetOpen(false)
  }

  const columns: ColumnsType<FormField> = [
    {
      title: '字段名', dataIndex: 'label', width: 120,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '键名', dataIndex: 'key', width: 120,
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: '类型', dataIndex: 'type', width: 90,
      render: (v: string) => (
        <Tag color={TYPE_COLORS[v] || 'default'}>{TYPE_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: '必填', dataIndex: 'required', width: 60,
      render: (v: boolean) => v ? <Tag color='red'>必填</Tag> : <Tag>选填</Tag>,
    },
    {
      title: '选项', dataIndex: 'options', ellipsis: true,
      render: (v: string[] | null) => v ? v.join('、') : '-',
    },
    {
      title: '操作', width: 120,
      render: (_, __, index) => (
        <Space size={0}>
          <Button type='text' size='small' icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => moveUp(index)} />
          <Button type='text' size='small' icon={<ArrowDownOutlined />} disabled={index === value.length - 1} onClick={() => moveDown(index)} />
          <Button type='text' size='small' icon={<EditOutlined />} onClick={() => { setEditing(value[index]); setEditIndex(index); setEditOpen(true) }} />
          <Button type='text' danger size='small' icon={<MinusCircleOutlined />} onClick={() => remove(index)} />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text type='secondary' style={{ fontSize: 12 }}>
          固定字段（姓名、学校、手机号）始终显示，无需配置。以下为自定义字段：
        </Text>
        <Space>
          <Button size='small' icon={<SettingOutlined />} onClick={() => setPresetOpen(true)}>
            预设字段
          </Button>
          <Button size='small' type='primary' ghost icon={<PlusOutlined />} onClick={() => { setEditing(null); setEditIndex(-1); setEditOpen(true) }}>
            自定义字段
          </Button>
        </Space>
      </div>

      {value.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', background: '#fafafa', borderRadius: 8, border: '1px dashed #d9d9d9' }}>
          <Text type='secondary'>暂无自定义字段，用户报名时只需填写固定字段</Text>
          <br />
          <Button size='small' type='link' onClick={() => setPresetOpen(true)}>从预设字段快速添加</Button>
        </div>
      ) : (
        <Table
          rowKey='key'
          columns={columns}
          dataSource={value}
          pagination={false}
          size='small'
        />
      )}

      <FieldEditModal
        open={editOpen}
        field={editing}
        existingKeys={value.map(f => f.key)}
        onCancel={() => { setEditing(null); setEditIndex(-2); setEditOpen(false) }}
        onSave={(field) => {
          const next = [...value]
          if (editIndex >= 0) {
            next[editIndex] = field
          } else {
            next.push(field)
          }
          emitChange(next)
          setEditing(null)
          setEditIndex(-2)
          setEditOpen(false)
        }}
      />

      <Modal
        title="预设字段库"
        open={presetOpen}
        onCancel={() => setPresetOpen(false)}
        footer={null}
        width={560}
      >
        <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
          点击快速添加常用字段到表单：
        </Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESET_FIELDS.map(preset => {
            const exists = value.some(f => f.key === preset.key)
            return (
              <Button
                key={preset.key}
                size='small'
                disabled={exists}
                onClick={() => addPreset(preset)}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Tag color={TYPE_COLORS[preset.type]} style={{ marginRight: 0 }}>{TYPE_LABELS[preset.type]}</Tag>
                {preset.label}
                {exists && <Tag style={{ marginLeft: 4 }}>已添加</Tag>}
              </Button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}

// ── Field Edit Modal ──

interface FieldEditModalProps {
  open: boolean
  field: FormField | null
  existingKeys: string[]
  onCancel: () => void
  onSave: (field: FormField) => void
}

function FieldEditModal({ open, field, existingKeys, onCancel, onSave }: FieldEditModalProps) {
  const [form] = Form.useForm()
  const fieldType = Form.useWatch('type', form)
  const needsOptions = ['select', 'radio', 'checkbox'].includes(fieldType || '')

  useEffect(() => {
    if (open) {
      if (field) {
        form.setFieldsValue({
          ...field,
          options: field.options?.join('\n') || '',
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ type: 'text', required: true })
      }
    }
  }, [open, field])

  const handleSave = async () => {
    const values = await form.validateFields()
    const options = values.options
      ? (values.options as string).split('\n').map(s => s.trim()).filter(Boolean)
      : null

    const saved: FormField = {
      key: values.key,
      label: values.label,
      type: values.type,
      required: values.required ?? false,
      placeholder: values.placeholder || null,
      max_length: values.max_length || null,
      options,
      sort_order: 0,
    }
    onSave(saved)
    form.resetFields()
  }

  return (
    <Modal
      title={field ? `编辑字段 · ${field.label}` : '添加自定义字段'}
      open={open}
      onOk={handleSave}
      onCancel={() => { form.resetFields(); onCancel() }}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout='vertical'>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name='label' label='字段名称'
              rules={[{ required: true, message: '必填' }]}
            >
              <Input placeholder='如：学号' maxLength={32} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='key' label='字段键名'
              rules={[
                { required: true, message: '必填' },
                { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头，仅含字母数字下划线' },
              ]}
              tooltip='存储用键名，如 student_id'
            >
              <Input placeholder='如：student_id' maxLength={64} disabled={!!field} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name='type' label='字段类型' rules={[{ required: true }]}>
              <Select options={TYPE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='required' label='是否必填' valuePropName='checked'>
              <Switch checkedChildren='必填' unCheckedChildren='选填' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name='placeholder' label='占位提示'>
          <Input placeholder='输入框内的提示文字' maxLength={64} />
        </Form.Item>

        {['text', 'textarea'].includes(fieldType || '') && (
          <Form.Item name='max_length' label='最大长度'>
            <InputNumber min={1} max={500} style={{ width: '100%' }} placeholder='默认 128' />
          </Form.Item>
        )}

        {needsOptions && (
          <Form.Item
            name='options' label='选项列表（每行一个）'
            rules={[{ required: true, message: '请填写选项' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder={'每行一个选项，如：\n大一\n大二\n大三'}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
