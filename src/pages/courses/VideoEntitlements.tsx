import { useCallback, useEffect, useState } from 'react'
import { Button, Drawer, Input, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { ConfirmButton } from '@/components/ConfirmButton'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { videoWebService, type VideoWebEntitlement, type VideoWebLearner } from '@/services/videoWebService'

const COURSE_STATUS: Record<string, { text: string; color: string }> = {
  published: { text: '已发布', color: 'green' },
  offline: { text: '已下线', color: 'orange' },
  archived: { text: '已归档', color: 'red' },
  draft: { text: '草稿', color: 'default' },
}

export default function VideoEntitlementsPage() {
  const canWrite = usePermission('course:write')
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState<string | undefined>(undefined)
  const [detail, setDetail] = useState<VideoWebLearner | null>(null)
  const [entitlements, setEntitlements] = useState<VideoWebEntitlement[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const { data, loading, pagination, refresh } = usePagination(
    (page, signal) => videoWebService.listLearners({ keyword: query, ...page }),
    [query],
  )

  const openDetail = useCallback(async (row: VideoWebLearner) => {
    setDetail(row)
    setDetailLoading(true)
    try {
      setEntitlements(await videoWebService.listEntitlements(row.user_id))
    } catch (reason) {
      message.error(reason instanceof Error ? reason.message : '授权清单加载失败')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!detail) setEntitlements([])
  }, [detail])

  const columns: ColumnsType<VideoWebLearner> = [
    {
      title: '用户',
      width: 220,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Link onClick={() => void openDetail(row)}>{row.display_name}</Typography.Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>#{row.user_id}</Typography.Text>
        </Space>
      ),
    },
    { title: '手机号', dataIndex: 'phone', width: 140, render: value => value || '-' },
    { title: '注册时间', dataIndex: 'created_at', width: 180 },
    { title: '有效授权', dataIndex: 'entitlement_count', width: 100, align: 'right' },
    {
      title: '最后学习',
      dataIndex: 'last_learned_at',
      width: 180,
      render: value => value || '-',
    },
    {
      title: '视频站',
      width: 110,
      render: (_, row) => (
        row.access_disabled_at
          ? <Tag color="red">已禁用</Tag>
          : <Tag color="green">正常</Tag>
      ),
    },
    {
      title: '操作',
      width: 190,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0} wrap>
          <Button type="link" size="small" onClick={() => void openDetail(row)}>授权清单</Button>
          {canWrite && (row.access_disabled_at ? (
            <ConfirmButton
              title="启用视频站访问"
              description="启用后该用户可立即恢复访问课程内容。"
              type="link"
              size="small"
              onConfirm={async () => {
                await videoWebService.setAccess(row.user_id, true)
                message.success('已启用视频站访问')
                refresh()
              }}
            >
              启用
            </ConfirmButton>
          ) : (
            <ConfirmButton
              title="禁用视频站访问"
              description="仅禁止访问视频站（目录/播放/兑换），课程授权数据保持不变，可随时启用恢复。"
              danger
              type="link"
              size="small"
              onConfirm={async () => {
                await videoWebService.setAccess(row.user_id, false)
                message.success('已禁用视频站访问')
                refresh()
              }}
            >
              禁用
            </ConfirmButton>
          ))}
        </Space>
      ),
    },
  ]

  const entitlementColumns: ColumnsType<VideoWebEntitlement> = [
    { title: '课程', dataIndex: 'course_title', ellipsis: true },
    {
      title: '课程状态',
      dataIndex: 'course_status',
      width: 110,
      render: value => {
        const meta = COURSE_STATUS[value]
        return <Tag color={meta?.color ?? 'default'}>{meta?.text ?? value}</Tag>
      },
    },
    {
      title: '授权',
      width: 110,
      render: (_, row) => row.learning_access
        ? <Tag color="green">有效</Tag>
        : <Tag>已回收</Tag>,
    },
    { title: '来源', dataIndex: 'source', width: 90, render: value => value || '-' },
    { title: '授予时间', dataIndex: 'access_granted_at', width: 180, render: value => value || '-' },
    { title: '回收时间', dataIndex: 'access_revoked_at', width: 180, render: value => value || '-' },
  ]

  return (
    <PageContainer title="学习授权">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
          onPressEnter={() => setQuery(keyword.trim() || undefined)}
          placeholder="手机号 / 姓名 / 昵称"
          style={{ width: 260 }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => setQuery(keyword.trim() || undefined)}>
          查询
        </Button>
        <Button onClick={() => { setKeyword(''); setQuery(undefined) }}>重置</Button>
      </Space>

      <Table
        rowKey="user_id"
        loading={loading}
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={pagination}
        scroll={{ x: 1120 }}
      />

      <Drawer
        title={detail ? `${detail.display_name} 的授权清单` : '授权清单'}
        open={!!detail}
        width={860}
        onClose={() => setDetail(null)}
      >
        <Table
          rowKey="enrollment_id"
          loading={detailLoading}
          columns={entitlementColumns}
          dataSource={entitlements}
          pagination={false}
          size="small"
          locale={{ emptyText: '该用户暂无课程授权' }}
        />
      </Drawer>
    </PageContainer>
  )
}
