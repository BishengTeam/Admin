import { useEffect, useState } from 'react'
import { Table, Button, Input, Switch, Space, Modal, Form, DatePicker, InputNumber, Row, Col, Divider, Select, Tag, Typography, message } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import dayjs from 'dayjs'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { usePagination } from '@/hooks/usePagination'
import { activityService } from '@/services/activity'
import { certificationService } from '@/services/certification'
import { courseManagementService } from '@/services/courseManagement'
import { formatDate } from '@/utils/format'
import { requiredRule } from '@/utils/validator'
import type { Activity } from '@/types/activity'

const { RangePicker } = DatePicker
const { Text } = Typography

export default function ActivityTab() {
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Activity | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [certOptions, setCertOptions] = useState<{ label: string; value: number }[]>([])
  const [courseOptions, setCourseOptions] = useState<{ label: string; value: number }[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    certificationService
      .list({ page: 1, page_size: 100 })
      .then((res) => setCertOptions(
        res.items
          .filter((c) => c.is_active)
          .map((c) => ({ label: `${c.chinese_name}（${c.code}）`, value: c.id })),
      ))
      .catch(() => setCertOptions([]))
    courseManagementService
      .listCourses({ page: 1, page_size: 100 })
      .then((res) => setCourseOptions(res.items.map((c) => ({ label: c.title, value: c.id }))))
      .catch(() => setCourseOptions([]))
  }, [])

  const { data, loading, pagination, refresh } = usePagination(
    (page) => activityService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, max_participants: 0 })
    setModalOpen(true)
  }

  const handleEdit = (item: Activity) => {
    setEditingItem(item)
    form.setFieldsValue({
      title: item.title,
      cover_url: item.cover_url || '',
      description: item.description || '',
      location: item.location || '',
      max_participants: item.max_participants,
      is_active: item.is_active,
      live_url: item.live_url || '',
      group_qrcode_url: item.group_qrcode_url || '',
      registration_deadline: item.registration_deadline ? dayjs(item.registration_deadline) : undefined,
      related_cert_id: item.related_cert_id ?? undefined,
      related_course_id: item.related_course_id ?? undefined,
      time_range: [
        item.start_time ? dayjs(item.start_time) : null,
        item.end_time ? dayjs(item.end_time) : null,
      ],
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await activityService.delete(id)
    message.success('已删除')
    setSelectedRowKeys((prev) => prev.filter((k) => k !== id))
    refresh()
  }

  const handleBatchDelete = async () => {
    await Promise.all(selectedRowKeys.map((id) => activityService.delete(id)))
    message.success(`已删除 ${selectedRowKeys.length} 个活动`)
    setSelectedRowKeys([])
    refresh()
  }

  const rowSelection: TableRowSelection<Activity> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys as number[]),
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const [start, end] = values.time_range || []
    const payload = {
      title: values.title,
      description: values.description,
      cover_url: values.cover_url || null,
      location: values.location || null,
      start_time: start ? start.toISOString() : null,
      end_time: end ? end.toISOString() : null,
      max_participants: values.max_participants ?? 0,
      is_active: values.is_active,
      live_url: values.live_url?.trim() || null,
      group_qrcode_url: values.group_qrcode_url || null,
      registration_deadline: values.registration_deadline
        ? values.registration_deadline.toISOString()
        : null,
      related_cert_id: values.related_cert_id ?? null,
      related_course_id: values.related_course_id ?? null,
    }

    if (editingItem) {
      await activityService.update(editingItem.id, payload)
      message.success('更新成功')
    } else {
      await activityService.create(payload)
      message.success('添加成功')
    }
    setModalOpen(false)
    refresh()
  }

  const handleToggleStatus = async (id: number, checked: boolean) => {
    await activityService.update(id, { is_active: checked })
    message.success(checked ? '已上架' : '已下架')
    refresh()
  }

  const columns: ColumnsType<Activity> = [
    { title: '活动名称', dataIndex: 'title', width: 200, ellipsis: true },
    { title: '地点', dataIndex: 'location', width: 140 },
    {
      title: '时间',
      width: 220,
      render: (_, r) => {
        const s = r.start_time?.slice(0, 16) || '-'
        const e = r.end_time?.slice(0, 16) || '-'
        return `${s} ~ ${e}`
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (is_active: boolean, record) => (
        <Switch
          checked={is_active}
          onChange={(checked) => handleToggleStatus(record.id, checked)}
          checkedChildren="上架"
          unCheckedChildren="下架"
        />
      ),
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <ConfirmButton
            title="删除活动"
            description="确认删除此活动？"
            danger
            type="link"
            size="small"
            onConfirm={() => handleDelete(record.id)}
          >
            删除
          </ConfirmButton>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增活动</Button>
      </Space>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索活动..."
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 240 }}
          onPressEnter={() => setSearchText(keyword)}
          allowClear
        />
        <Button type="primary" onClick={() => setSearchText(keyword)}>查询</Button>
        <Button onClick={() => { setKeyword(''); setSearchText(''); }}>重置</Button>
        {selectedRowKeys.length > 0 && (
          <ConfirmButton
            title="批量删除"
            description={`确认删除选中的 ${selectedRowKeys.length} 个活动？`}
            danger
            icon={<DeleteOutlined />}
            onConfirm={handleBatchDelete}
          >
            删除 ({selectedRowKeys.length})
          </ConfirmButton>
        )}
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={pagination}
        rowSelection={rowSelection}
      />

      <Modal
        title={editingItem ? '编辑活动' : '新增活动'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }} requiredMark='optional'>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '4px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>活动信息</Text>
          </Divider>

          <Form.Item name="title" label="活动名称" rules={[requiredRule('名称')]}>
            <Input placeholder="请输入活动名称" />
          </Form.Item>
          <Form.Item name="cover_url" label="封面图">
            <ImageUpload />
          </Form.Item>
          <Form.Item name="description" label="活动介绍">
            <Input.TextArea rows={3} placeholder="活动内容、亮点、嘉宾等" maxLength={2000} showCount />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '8px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>时间与名额</Text>
          </Divider>

          <Form.Item name="time_range" label="活动时间">
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="registration_deadline" label='报名截止'
                tooltip='截止后用户无法继续报名；不填则持续到活动结束'
              >
                <DatePicker showTime style={{ width: '100%' }} placeholder="不填则不限" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="max_participants"
                label="名额上限"
                tooltip="0 表示不限人数；满员后用户无法继续报名"
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0 为不限" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '8px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>参与方式（线上营销）</Text>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="live_url" label='直播/会议链接'
                tooltip='视频号直播、腾讯会议等链接；详情页展示"进入直播"按钮，点击复制'
              >
                <Input placeholder="https:// 或会议链接" maxLength={512} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="group_qrcode_url" label='答疑群二维码'
                tooltip='详情页展示二维码图片，用户长按识别进群'
              >
                <ImageUpload />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '8px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>转化目标</Text>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="related_cert_id" label='关联认证'
                tooltip='详情页显示"立即报名认证"按钮，直达该认证报名表单'
              >
                <Select
                  placeholder="搜索选择认证"
                  options={certOptions}
                  showSearch
                  optionFilterProp='label'
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="related_course_id" label='关联课程'
                tooltip='详情页显示"查看课程"按钮，直达课程详情页'
              >
                <Select
                  placeholder="搜索选择课程"
                  options={courseOptions}
                  showSearch
                  optionFilterProp='label'
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="is_active" label="状态" valuePropName="checked">
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>

          <Text type='secondary' style={{ fontSize: 12 }}>
            配置转化目标后，活动详情页将展示对应 CTA 按钮，引导用户报名认证或购买课程。
          </Text>
        </Form>
      </Modal>
    </>
  )
}