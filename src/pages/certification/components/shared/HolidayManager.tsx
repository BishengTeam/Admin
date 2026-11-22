import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Checkbox, DatePicker, Form, Input, Popconfirm, Space, Table, Tag, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import request from '@/core/request'

interface Holiday {
  id: number
  name: string
  holiday_date: string
  is_annual: boolean
}

export default function HolidayManager() {
  const [rows, setRows] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await request.get('/admin/holidays')
      setRows(Array.isArray(payload) ? payload as Holiday[] : [])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '假期加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await request.post('/admin/holidays', {
        name: values.name.trim(),
        holiday_date: (values.holiday_date as Dayjs).format('YYYY-MM-DD'),
        is_annual: Boolean(values.is_annual),
      })
      message.success('假期已添加')
      form.resetFields()
      await load()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <Form form={form} layout='inline' style={{ marginBottom: 16, rowGap: 12 }}>
        <Form.Item name='name' rules={[{ required: true, message: '请输入假期名称' }]}>
          <Input maxLength={64} placeholder='假期名称，如：国庆节' style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name='holiday_date' rules={[{ required: true, message: '请选择日期' }]}>
          <DatePicker placeholder='假期日期' />
        </Form.Item>
        <Form.Item name='is_annual' valuePropName='checked'>
          <Checkbox>每年重复</Checkbox>
        </Form.Item>
        <Button type='primary' icon={<PlusOutlined />} loading={saving} onClick={() => void submit()}>添加假期</Button>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button>
      </Form>
      <Table
        rowKey='id'
        dataSource={rows}
        loading={loading}
        pagination={false}
        columns={[
          { title: '日期', dataIndex: 'holiday_date', width: 160 },
          { title: '名称', dataIndex: 'name' },
          { title: '类型', dataIndex: 'is_annual', width: 120, render: (value: boolean) => value ? <Tag color='blue'>每年重复</Tag> : <Tag>单次</Tag> },
          {
            title: '操作',
            width: 100,
            render: (_: unknown, row: Holiday) => (
              <Popconfirm
                title='删除该假期？'
                onConfirm={async () => {
                  try {
                    await request.delete(`/admin/holidays/${row.id}`)
                    message.success('已删除')
                    await load()
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : '删除失败')
                  }
                }}
              >
                <Button size='small' danger type='link'>删除</Button>
              </Popconfirm>
            ),
          },
        ]}
        locale={{ emptyText: '暂无假期' }}
      />
      <Space style={{ marginTop: 12 }}>
        <Tag color='orange'>提示</Tag>
        <span style={{ color: '#5f6b7a' }}>假期仅用于 H3C 预约日期预览与人社批次保存提示，不影响已预约考生。</span>
      </Space>
    </Card>
  )
}
