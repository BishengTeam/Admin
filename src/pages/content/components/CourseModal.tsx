import { useEffect } from 'react'
import { Modal, Form, Input, Select, InputNumber, Button, DatePicker, TimePicker, Space, message } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { contentService } from '@/services/content'
import { COURSE_CATEGORIES, STATUS_OPTIONS } from '@/core/constants'
import { requiredRule } from '@/utils/validator'
import type { Course } from '@/types/content'

interface CourseModalProps {
  open: boolean
  course: Course | null
  onClose: () => void
  onSuccess: () => void
}

interface ScheduleFormValues {
  class_date?: dayjs.Dayjs
  start_time?: dayjs.Dayjs
  end_time?: dayjs.Dayjs
  price?: number
  location?: string
}

export default function CourseModal({ open, course, onClose, onSuccess }: CourseModalProps) {
  const [form] = Form.useForm()
  const isEdit = !!course

  useEffect(() => {
    if (open) {
      if (course) {
        form.setFieldsValue({
          name: course.name,
          category: course.category,
          price: course.price,
          teacher_name: course.teacher_name,
          teacher_contact: course.teacher_contact,
          status: course.status,
          schedules: course.schedules?.map((s) => ({
            ...s,
            class_date: s.class_date ? dayjs(s.class_date) : undefined,
            start_time: s.start_time ? dayjs(s.start_time, 'HH:mm') : undefined,
            end_time: s.end_time ? dayjs(s.end_time, 'HH:mm') : undefined,
          })),
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ status: 'online', schedules: [] })
      }
    }
  }, [open, course, form])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      price: values.price,
      schedules: (values.schedules || []).map((s: ScheduleFormValues) => ({
        class_date: s.class_date?.format('YYYY-MM-DD') || '',
        start_time: s.start_time?.format('HH:mm') || '',
        end_time: s.end_time?.format('HH:mm') || '',
        price: s.price,
        location: s.location,
      })),
      class_count: (values.schedules || []).length,
    }

    if (isEdit) {
      await contentService.updateCourse(course!.id, data)
      message.success('更新成功')
    } else {
      await contentService.createCourse(data)
      message.success('添加成功')
    }
    onSuccess()
  }

  return (
    <Modal
      title={isEdit ? '编辑课程' : '新增课程'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      width={800}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="name" label="课程名称" rules={[requiredRule('课程名称')]} style={{ flex: 1 }}>
            <Input placeholder="请输入课程名称" />
          </Form.Item>
          <Form.Item name="category" label="类别" rules={[requiredRule('类别')]} style={{ width: 150 }}>
            <Select options={COURSE_CATEGORIES} placeholder="选择类别" />
          </Form.Item>
        </Space>

        <Space size={16}>
          <Form.Item name="price" label="价格（分）" rules={[requiredRule('价格')]}>
            <InputNumber min={0} placeholder="价格（单位：分）" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="teacher_name" label="讲师姓名" rules={[requiredRule('讲师姓名')]}>
            <Input placeholder="讲师姓名" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="teacher_contact" label="联系方式">
            <Input placeholder="手机号" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={STATUS_OPTIONS} style={{ width: 100 }} />
          </Form.Item>
        </Space>

        <h4 style={{ marginBottom: 8 }}>班次配置</h4>
        <Form.List name="schedules">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} style={{ marginBottom: 8, padding: 12, background: '#fafafa', borderRadius: 6 }}>
                  <Space wrap align="start">
                    <Form.Item {...restField} name={[name, 'class_date']} label="日期" rules={[requiredRule('日期')]} style={{ marginBottom: 0 }}>
                      <DatePicker />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'start_time']} label="开始时间" rules={[requiredRule('开始时间')]} style={{ marginBottom: 0 }}>
                      <TimePicker format="HH:mm" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'end_time']} label="结束时间" rules={[requiredRule('结束时间')]} style={{ marginBottom: 0 }}>
                      <TimePicker format="HH:mm" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'price']} label="价格(分)" style={{ marginBottom: 0 }}>
                      <InputNumber min={0} style={{ width: 130 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'location']} label="地点" style={{ marginBottom: 0 }}>
                      <Input placeholder="教室/线上" style={{ width: 130 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', marginTop: 8 }} />
                  </Space>
                </div>
              ))}
              <Button type="dashed" onClick={() => add({})} icon={<PlusOutlined />} block>
                添加班次
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  )
}
