import { useEffect, useState } from 'react'
import { Table, Tag, Spin } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { userService } from '@/services/users'
import { formatDate } from '@/utils/format'
import type { ReviewRecord } from '@/types/user'

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
  targetType: string
  targetId: number
}

export default function ReviewHistory({ targetType, targetId }: ReviewHistoryProps) {
  const [records, setRecords] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    userService
      .reviewHistory({ target_type: targetType, target_id: targetId, page_size: 20 })
      .then((data) => {
        if (!cancelled) setRecords(data.items)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [targetType, targetId])

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
