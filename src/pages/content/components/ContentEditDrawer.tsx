import { useEffect } from 'react'
import { Drawer, Form, Input, Select, InputNumber, Button, Switch, DatePicker, message } from 'antd'
import dayjs from 'dayjs'
import { contentService } from '@/services/content'
import { ImageUpload } from '@/components/ImageUpload'
import { ZONE_OPTIONS } from '@/core/constants'
import { requiredRule, urlRule } from '@/utils/validator'
import type { ContentItem } from '@/types/content'

interface ContentEditDrawerProps {
  open: boolean
  item: ContentItem | null
  defaultValues?: Partial<ContentItem>
  onClose: () => void
  onSuccess: () => void
}

export default function ContentEditDrawer({ open, item, defaultValues, onClose, onSuccess }: ContentEditDrawerProps) {
  const [form] = Form.useForm()
  const isEdit = !!item

  useEffect(() => {
    if (open) {
      if (item) {
        form.setFieldsValue({
          ...item,
          time_range: [
            item.start_time ? dayjs(item.start_time) : null,
            item.end_time ? dayjs(item.end_time) : null,
          ],
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ is_active: true, sort_order: 0, is_banner: false, ...defaultValues })
      }
    }
  }, [open, item, form])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const [start, end] = values.time_range || []
    const payload = {
      ...values,
      start_time: start ? start.toISOString() : null,
      end_time: end ? end.toISOString() : null,
      time_range: undefined,
    }
    delete payload.time_range
    if (isEdit) {
      await contentService.update(item!.id, payload)
      message.success('更新成功')
    } else {
      await contentService.create(payload)
      message.success('添加成功')
    }
    onSuccess()
  }

  return (
    <Drawer
      title={isEdit ? '编辑内容' : '新增内容'}
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
      extra={
        <Button type="primary" onClick={handleSubmit}>
          保存
        </Button>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="标题" rules={[requiredRule('标题')]}>
          <Input placeholder="请输入标题" />
        </Form.Item>

        <Form.Item name="cover_url" label="封面图">
          <ImageUpload />
        </Form.Item>

        <Form.Item name="zone_type" label="所属专区" rules={[requiredRule('专区')]}>
          <Select options={ZONE_OPTIONS} placeholder="选择专区" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="请输入描述" />
        </Form.Item>

        <Form.Item name="link_url" label="外链URL" rules={[urlRule]}>
          <Input placeholder="请输入外部链接" />
        </Form.Item>

        <Form.Item name="sort_order" label="排序权重">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="数字越大越靠前" />
        </Form.Item>

        <Form.Item name="is_banner" label="启用为Banner" valuePropName="checked" tooltip="启用后将在首页顶部 Banner 轮播展示">
          <Switch />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.is_banner !== cur.is_banner}>
          {({ getFieldValue }) =>
            getFieldValue('is_banner') ? (
              <Form.Item name="time_range" label="Banner有效期">
                <DatePicker.RangePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        <Form.Item name="is_active" label="状态" valuePropName="checked">
          <Switch checkedChildren="上架" unCheckedChildren="下架" />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
