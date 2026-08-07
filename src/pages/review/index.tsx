import { Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PageContainer } from '@/components/PageContainer'
import { usePagination } from '@/hooks/usePagination'
import { userService } from '@/services/users'
import type { ReviewRecord } from '@/types/user'
import { formatDate } from '@/utils/format'

const TARGET_LABELS: Record<string, string> = {
  identity: '实名',
  student: '学生',
  enterprise: '历史企业审核',
  order: '历史订单审核',
}

const ACTION_MAP: Record<string, { text: string; color: string }> = {
  approve: { text: '通过', color: 'green' },
  reject: { text: '驳回', color: 'red' },
}

const columns: ColumnsType<ReviewRecord> = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '时间', dataIndex: 'created_at', width: 180, render: (value: string) => formatDate(value) },
  {
    title: '对象',
    dataIndex: 'target_type',
    width: 130,
    render: (value: string) => <Tag>{TARGET_LABELS[value] ?? value}</Tag>,
  },
  { title: '对象 ID', dataIndex: 'target_id', width: 100 },
  { title: '审核人', dataIndex: 'reviewer_id', width: 100 },
  {
    title: '结果',
    dataIndex: 'action',
    width: 90,
    render: (value: string) => {
      const config = ACTION_MAP[value]
      return <Tag color={config?.color}>{config?.text ?? value}</Tag>
    },
  },
  { title: '备注', dataIndex: 'comment', ellipsis: true, render: (value: string | null) => value || '-' },
]

export default function ReviewList() {
  const { data, loading, pagination } = usePagination(
    (page) => userService.reviewHistory(page),
    [],
  )

  return (
    <PageContainer title="审核历史">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
      />
    </PageContainer>
  )
}
