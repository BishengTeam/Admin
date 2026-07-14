import { useEffect, useState } from 'react'
import { Table, Tag, Spin } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { userService } from '@/services/users'
import { formatDate } from '@/utils/format'
import type { ReviewRecord, ReviewTargetType } from '@/types/user'
import { fetchAllPages } from '@/utils/pagination'

const ACTION_MAP: Record<string, { text: string; color: string }> = {
  approve: { text: '通过', color: 'green' },
  reject: { text: '驳回', color: 'red' },
}

const TARGET_LABELS: Record<string, string> = {
  identity: '实名',
  student: '学生',
  enterprise: '企业',
  order: '订单',
}

const columns: ColumnsType<ReviewRecord> = [
  {
    title: '时间',
    dataIndex: 'created_at',
    width: 160,
    render: (t: string) => formatDate(t),
  },
  {
    title: '对象',
    dataIndex: 'target_type',
    width: 80,
    render: (t: string) => TARGET_LABELS[t] ?? t,
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: 70,
    render: (a: string) => {
      const cfg = ACTION_MAP[a]
      return <Tag color={cfg?.color}>{cfg?.text ?? a}</Tag>
    },
  },
  {
    title: '备注',
    dataIndex: 'comment',
    ellipsis: true,
    render: (c: string | null) => c || '-',
  },
]

interface ReviewHistoryProps {
  targetType: ReviewTargetType | ReviewTargetType[]
  targetId: number
}

export default function ReviewHistory({ targetType, targetId }: ReviewHistoryProps) {
  const [records, setRecords] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(false)

  const targetTypeKey = Array.isArray(targetType) ? targetType.join(',') : targetType

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const targetTypes = targetTypeKey.split(',') as ReviewTargetType[]

    Promise.all(
      targetTypes.map((type) =>
        fetchAllPages((page, pageSize) =>
          userService.reviewHistory({
            target_type: type,
            target_id: targetId,
            page,
            page_size: pageSize,
          }),
        ),
      ),
    )
      .then((groups) => {
        if (!cancelled) {
          setRecords(
            groups
              .flat()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          )
        }
      })
      .catch(() => {
        if (!cancelled) setRecords([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [targetTypeKey, targetId])

  if (loading) return <Spin size="small" style={{ marginBottom: 24, display: 'block' }} />

  if (records.length === 0) {
    return <Tag style={{ marginBottom: 24 }}>暂无审核记录</Tag>
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        pagination={false}
        size="small"
      />
    </div>
  )
}
