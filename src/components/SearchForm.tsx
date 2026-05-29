import type { ReactNode } from 'react'
import { Form, Row, Col, Button, Space } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'

export interface SearchField {
  name: string
  label: string
  type?: 'input' | 'select' | 'dateRange'
  placeholder?: string
  options?: { label: string; value: string | number }[]
  render?: () => ReactNode
  span?: number
}

interface SearchFormProps {
  fields: SearchField[]
  onSearch: (values: Record<string, unknown>) => void
  onReset: () => void
}

export function SearchForm({ fields, onSearch, onReset }: SearchFormProps) {
  const [form] = Form.useForm()

  const handleReset = () => {
    form.resetFields()
    onReset()
  }

  return (
    <Form form={form} onFinish={onSearch} style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="top">
        {fields.map((field) => (
          <Col key={field.name} span={field.span ?? 6}>
            <Form.Item name={field.name} label={field.label} style={{ marginBottom: 0 }}>
              {field.render ? field.render() : null}
            </Form.Item>
          </Col>
        ))}
        <Col>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              查询
            </Button>
            <Button onClick={handleReset} icon={<ReloadOutlined />}>
              重置
            </Button>
          </Space>
        </Col>
      </Row>
    </Form>
  )
}
