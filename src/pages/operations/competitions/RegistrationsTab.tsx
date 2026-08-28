import { useState } from 'react'
import { Button, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { competitionAdminService } from '@/services/competition'
import { formatDate } from '@/utils/format'
import type { Competition, CompetitionRegistration } from '@/types/competition'
import type { PageData } from '@/types/api'

const { Text } = Typography

interface RegistrationsTabProps {
  competitions: Competition[]
}

const emptyPage: PageData<CompetitionRegistration> = {
  items: [], total: 0, page: 1, page_size: 20,
}

export default function RegistrationsTab({ competitions }: RegistrationsTabProps) {
  const [competitionId, setCompetitionId] = useState<number | null>(null)
  const [trackId, setTrackId] = useState<number | null>(null)

  const selected = competitions.find((c) => c.id === competitionId)

  const { data, loading, pagination, refresh } = usePagination(
    (page) =>
      competitionId
        ? competitionAdminService.listRegistrations(competitionId, {
            track_id: trackId ?? undefined,
            ...page,
          })
        : Promise.resolve(emptyPage),
    [competitionId, trackId],
  )

  const columns: ColumnsType<CompetitionRegistration> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '姓名', dataIndex: 'real_name', width: 110, render: (v: string | null) => v || '-' },
    { title: '学校', dataIndex: 'school', ellipsis: true },
    { title: '手机号', dataIndex: 'phone', width: 130, render: (v: string | null) => v || '-' },
    { title: '赛道', dataIndex: 'track', width: 130, render: (v: string | null) => v || '-' },
    { title: '报名时间', dataIndex: 'created_at', width: 170, render: (t: string | null) => (t ? formatDate(t) : '-') },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Select
            placeholder='选择赛事'
            style={{ width: 260 }}
            showSearch
            optionFilterProp='label'
            value={competitionId ?? undefined}
            onChange={(v) => { setCompetitionId(v ?? null); setTrackId(null) }}
            options={competitions.map((c) => ({ label: c.name, value: c.id }))}
            allowClear
          />
          <Select
            placeholder='全部赛道'
            style={{ width: 180 }}
            value={trackId ?? undefined}
            onChange={setTrackId}
            options={(selected?.tracks ?? []).map((t) => ({
              label: `${t.name}（${t.enrolled}人）`,
              value: t.id,
            }))}
            allowClear
            disabled={!competitionId}
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh} disabled={!competitionId}>
            刷新
          </Button>
        </Space>
        <Text type='secondary'>共 {data?.total ?? 0} 条报名</Text>
      </div>
      <Table<CompetitionRegistration>
        rowKey='id'
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={competitionId ? pagination : false}
        locale={{ emptyText: competitionId ? '暂无报名记录' : '请先选择赛事' }}
      />
    </>
  )
}
