import { useState } from 'react'
import { Button, Select, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { activityService } from '@/services/activity'
import { formatDate } from '@/utils/format'
import type { PageData } from '@/types/api'
import type { ActivityRegistration } from '@/types/activity'

const { Text } = Typography

interface RegistrationsTabProps {
  activities: { id: number; title: string; max_participants: number }[]
}

export default function RegistrationsTab({ activities }: RegistrationsTabProps) {
  const [activityId, setActivityId] = useState<number | null>(null)

  const empty: PageData<ActivityRegistration> = {
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
  }

  const { data, loading, pagination, refresh } = usePagination(
    (page) =>
      activityId
        ? activityService.listRegistrations(activityId, page)
        : Promise.resolve(empty),
    [activityId],
  )

  const columns: ColumnsType<ActivityRegistration> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '姓名', dataIndex: 'name', width: 120 },
    { title: '电话', dataIndex: 'phone', width: 140 },
    { title: '备注', dataIndex: 'remark', ellipsis: true, render: (v: string | null) => v || '-' },
    { title: '报名时间', dataIndex: 'created_at', width: 170, render: (t: string) => formatDate(t) },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="选择活动查看报名"
            style={{ width: 280 }}
            showSearch
            optionFilterProp='label'
            value={activityId ?? undefined}
            onChange={setActivityId}
            options={activities.map((a) => ({ label: a.title, value: a.id }))}
            allowClear
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh} disabled={!activityId}>刷新</Button>
        </Space>
        <Text type='secondary'>
          已报 {data?.total ?? 0} 人
          {(() => {
            const act = activities.find((a) => a.id === activityId)
            if (!act || act.max_participants <= 0) return ' · 不限名额'
            const full = (data?.total ?? 0) >= act.max_participants
            return ` / 上限 ${act.max_participants}${full ? '（已满）' : ''}`
          })()}
        </Text>
      </div>
      <Table<ActivityRegistration>
        rowKey='id'
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={activityId ? pagination : false}
        locale={{ emptyText: activityId ? '暂无报名记录' : '请先选择活动' }}
      />
    </>
  )
}
