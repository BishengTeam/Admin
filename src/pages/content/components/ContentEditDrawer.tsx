import { useEffect } from 'react'
import { Drawer, Form, Input, Select, InputNumber, Button, Switch, message } from 'antd'
import { contentService } from '@/services/content'
import { ImageUpload } from '@/components/ImageUpload'
import { ZONE_OPTIONS } from '@/core/constants'
import { requiredRule, urlRule } from '@/utils/validator'
import type { ContentItem } from '@/types/content'

interface ContentEditDrawerProps {
  open: boolean
  item: ContentItem | null
  onClose: () => void
  onSuccess: () => void
}

export default function ContentEditDrawer({ open, item, onClose, onSuccess }: ContentEditDrawerProps) {
  const [form] = Form.useForm()
  const isEdit = !!item

  useEffect(() => {
    if (open) {
      if (item) {
        form.setFieldsValue({ ...item })
      } else {
        form.resetFields()
        form.setFieldsValue({ is_active: true, sort_order: 0 })
      }
    }
  }, [open, item, form])

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (isEdit) {
      await contentService.update(item!.id, values)
      message.success('更新成功')
    } else {
      await contentService.create(values)
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

        <Form.Item name="is_active" label="状态" valuePropName="checked">
          <Switch checkedChildren="上架" unCheckedChildren="下架" />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
