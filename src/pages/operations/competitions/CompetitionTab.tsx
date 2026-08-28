import { useState } from 'react'
import {
  Table, Button, Input, Switch, Space, Modal, Form, DatePicker, InputNumber,
  Row, Col, Divider, Tag, Typography, message,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined, SearchOutlined, TrophyOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ImageUpload } from '@/components/ImageUpload'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { competitionAdminService } from '@/services/competition'
import { formatDate } from '@/utils/format'
import { requiredRule } from '@/utils/validator'
import type { Competition } from '@/types/competition'

const { RangePicker } = DatePicker
const { Text } = Typography

type FormValues = {
  name?: string
  description?: string
  cover_url?: string
  time_range?: [dayjs.Dayjs | null, dayjs.Dayjs | null]
  registration_deadline?: dayjs.Dayjs | null
  is_active?: boolean
  tracks?: { name: string; max_participants: number; sort_order: number }[]
}

export default function CompetitionTab() {
  const canWrite = usePermission('competition:write')
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Competition | null>(null)
  const [form] = Form.useForm<FormValues>()

  const { data, loading, pagination, refresh } = usePagination(
    (page) => competitionAdminService.list({ keyword: searchText || undefined, ...page }),
    [searchText],
  )

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, tracks: [{ name: '', max_participants: 0, sort_order: 0 }] })
    setModalOpen(true)
  }

  const handleEdit = (item: Competition) => {
    setEditingItem(item)
    form.setFieldsValue({
      name: item.name,
      description: item.description ?? '',
      cover_url: item.cover_url ?? '',
      time_range: [
        item.start_time ? dayjs(item.start_time) : null,
        item.end_time ? dayjs(item.end_time) : null,
      ],
      registration_deadline: item.registration_deadline ? dayjs(item.registration_deadline) : undefined,
      is_active: item.is_active,
      tracks: item.tracks.map((t) => ({
        name: t.name,
        max_participants: t.max_participants,
        sort_order: t.sort_order,
      })),
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await competitionAdminService.remove(id)
    message.success('已删除')
    refresh()
  }

  const handleToggle = async (id: number, checked: boolean) => {
    await competitionAdminService.update(id, { is_active: checked })
    message.success(checked ? '已发布' : '已下架')
    refresh()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const [start, end] = values.time_range || []
    const payload = {
      name: values.name ?? '',
      description: values.description || null,
      cover_url: values.cover_url || null,
      start_time: start ? start.toISOString() : null,
      end_time: end ? end.toISOString() : null,
      registration_deadline: values.registration_deadline
        ? values.registration_deadline.toISOString()
        : null,
      is_active: values.is_active ?? true,
      tracks: (values.tracks ?? []).map((t, i) => ({
        name: t.name,
        max_participants: t.max_participants ?? 0,
        sort_order: t.sort_order ?? i,
      })),
    }
    if (editingItem) {
      await competitionAdminService.update(editingItem.id, payload)
      message.success('更新成功')
    } else {
      await competitionAdminService.create(payload)
      message.success('创建成功')
    }
    setModalOpen(false)
    refresh()
  }

  const columns: ColumnsType<Competition> = [
    {
      title: '赛事', dataIndex: 'name', ellipsis: true,
      render: (v: string, r) => (
        <Space>
          <TrophyOutlined style={{ color: '#FA8C16' }} />
          <span>{v}</span>
          {!r.is_active && <Tag>未发布</Tag>}
        </Space>
      ),
    },
    {
      title: '赛道', width: 240,
      render: (_, r) => (
        <Space wrap size={4}>
          {r.tracks.length === 0 && <Text type='secondary'>未配置</Text>}
          {r.tracks.map((t) => (
            <Tag key={t.id} color='orange'>
              {t.name} {t.enrolled}/{t.max_participants || '∞'}
            </Tag>
          ))}
        </Space>
      ),
    },
    { title: '已报名', dataIndex: 'total_enrolled', width: 80, align: 'center' },
    {
      title: '比赛时间', width: 220,
      render: (_, r) => {
        const s = r.start_time?.slice(0, 10) || '-'
        const e = r.end_time?.slice(0, 10) || '-'
        return `${s} ~ ${e}`
      },
    },
    {
      title: '发布', dataIndex: 'is_active', width: 90,
      render: (v: boolean, r) => (
        <Switch
          checked={v}
          disabled={!canWrite}
          onChange={(c) => handleToggle(r.id, c)}
          checkedChildren='发布'
          unCheckedChildren='下架'
        />
      ),
    },
    {
      title: '操作', width: 120,
      render: (_, r) => (
        <Space>
          {canWrite && <Button type='link' size='small' onClick={() => handleEdit(r)}>编辑</Button>}
          {canWrite && (
            <ConfirmButton
              title='删除赛事'
              description='将同时删除其赛道配置，确认删除？'
              danger type='link' size='small'
              onConfirm={() => handleDelete(r.id)}
            >
              删除
            </ConfirmButton>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder='搜索赛事名称...'
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 220 }}
          onPressEnter={() => setSearchText(keyword)}
          allowClear
        />
        <Button type='primary' onClick={() => setSearchText(keyword)}>查询</Button>
        <Button onClick={() => { setKeyword(''); setSearchText(''); }}>重置</Button>
        {canWrite && (
          <Button type='primary' icon={<PlusOutlined />} onClick={handleAdd}>新增赛事</Button>
        )}
      </Space>

      <Table rowKey='id' columns={columns} dataSource={data?.items} loading={loading} pagination={pagination} />

      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ color: '#FA8C16' }} />
            <span>{editingItem ? `编辑赛事 · ${editingItem.name}` : '新增赛事'}</span>
          </Space>
        }
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editingItem ? '保存' : '创建'}
        cancelText='取消'
        destroyOnClose
        width={680}
      >
        <Form form={form} layout='vertical' style={{ marginTop: 20 }} requiredMark='optional'>
          <Divider orientation='left' orientationMargin={0} style={{ margin: '4px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>赛事信息</Text>
          </Divider>

          <Form.Item name='name' label='赛事名称' rules={[requiredRule('名称')]}>
            <Input placeholder='如：网络技术大赛' maxLength={128} />
          </Form.Item>
          <Form.Item name='cover_url' label='封面图'>
            <ImageUpload />
          </Form.Item>
          <Form.Item name='description' label='赛事介绍'>
            <Input.TextArea rows={3} placeholder='赛事说明、参赛要求等' maxLength={2000} showCount />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '8px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>时间设置</Text>
          </Divider>

          <Form.Item name='time_range' label='比赛时间'>
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name='registration_deadline' label='报名截止'
            tooltip='截止后用户无法继续报名；不填则持续到比赛结束'
          >
            <DatePicker showTime style={{ width: '100%' }} placeholder='不填则不限' />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '8px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>赛道配置</Text>
          </Divider>

          <Form.List name='tracks'>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row key={key} gutter={12} align='middle'>
                    <Col span={9}>
                      <Form.Item
                        name={[name, 'name']}
                        rules={[{ required: true, message: '赛道名' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <Input placeholder='赛道名称，如：网络赛道' maxLength={64} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name={[name, 'max_participants']}
                        style={{ marginBottom: 12 }}
                      >
                        <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder='名额 0 不限' />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name={[name, 'sort_order']}
                        style={{ marginBottom: 12 }}
                      >
                        <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder='排序' />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Button
                        type='text' danger icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                        disabled={fields.length <= 1}
                      />
                    </Col>
                  </Row>
                ))}
                <Button
                  type='dashed' icon={<PlusOutlined />} block
                  onClick={() => add({ name: '', max_participants: 0, sort_order: fields.length })}
                >
                  添加赛道
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item name='is_active' label='发布状态' valuePropName='checked' initialValue={true} style={{ marginTop: 16 }}>
            <Switch checkedChildren='发布' unCheckedChildren='下架' />
          </Form.Item>

          <Text type='secondary' style={{ fontSize: 12 }}>
            发布后赛事展示在小程序竞赛专区；用户按赛道报名，赛道名额满后自动截止。
          </Text>
        </Form>
      </Modal>
    </>
  )
}
