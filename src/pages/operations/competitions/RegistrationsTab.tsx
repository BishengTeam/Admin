import { useMemo, useState } from 'react'
import { Button, Descriptions, Select, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { competitionAdminService } from '@/services/competition'
import { formatDate } from '@/utils/format'
import type { Competition, CompetitionRegistration } from '@/types/competition'
import type { PageData } from '@/types/api'

const { Text } = Typography

interface RegistrationsTabProps {
  competitions: Competition[]
}

/** Format custom field values for display */
function formatCustomFields(values: Record<string, unknown> | null | undefined): Array<{ key: string; value: string }> {
  if (!values) return []
  return Object.entries(values).map(([key, value]) => ({
    key,
    value: Array.isArray(value) ? value.join('、') : String(value ?? '-'),
  }))
}

const emptyPage: PageData<CompetitionRegistration> = {
  items: [], total: 0, page: 1, page_size: 20,
}

// Extend CompetitionRegistration to include custom fields
interface RegistrationWithCustom extends CompetitionRegistration {
  custom_field_values?: Record<string, unknown> | null
}

export default function RegistrationsTab({ competitions }: RegistrationsTabProps) {
  const [competitionId, setCompetitionId] = useState<number | null>(null)
  const [trackId, setTrackId] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  const selected = competitions.find((c) => c.id === competitionId)

  const { data, loading, pagination, refresh } = usePagination<RegistrationWithCustom>(
    (page) =>
      competitionId
        ? competitionAdminService.listRegistrations(competitionId, {
            track_id: trackId ?? undefined,
            ...page,
          }) as Promise<PageData<RegistrationWithCustom>>
        : Promise.resolve(emptyPage as PageData<RegistrationWithCustom>),
    [competitionId, trackId],
  )

  // Get custom field definitions from the selected competition
  const customFieldDefs = useMemo(() => {
    if (!selected) return []
    const raw = (selected as { custom_fields?: Array<{ key: string; label: string }> }).custom_fields
    return Array.isArray(raw) ? raw : []
  }, [selected])

  // Build columns: static + dynamic custom field columns
  const columns: ColumnsType<RegistrationWithCustom> = useMemo(() => {
    const staticCols: ColumnsType<RegistrationWithCustom> = [
      { title: 'ID', dataIndex: 'id', width: 70 },
      { title: '姓名', dataIndex: 'real_name', width: 110, render: (v: string | null) => v || '-' },
      { title: '学校', dataIndex: 'school', ellipsis: true },
      { title: '手机号', dataIndex: 'phone', width: 130, render: (v: string | null) => v || '-' },
      { title: '赛道', dataIndex: 'track', width: 130, render: (v: string | null) => v || '-' },
    ]

    // Generate a column for each custom field
    const customCols: ColumnsType<RegistrationWithCustom> = customFieldDefs.map((field) => ({
      title: field.label,
      key: `custom_${field.key}`,
      width: 120,
      ellipsis: true,
      render: (_: unknown, record: RegistrationWithCustom) => {
        const val = record.custom_field_values?.[field.key]
        if (val === undefined || val === null) return '-'
        return Array.isArray(val) ? val.join('、') : String(val)
      },
    }))

    const timeCol: ColumnsType<RegistrationWithCustom> = [
      { title: '报名时间', dataIndex: 'created_at', width: 170, render: (t: string | null) => (t ? formatDate(t) : '-') },
    ]

    return [...staticCols, ...customCols, ...timeCol]
  }, [customFieldDefs])

  const handleExport = async () => {
    if (!competitionId) return
    setExporting(true)
    try {
      const blob = await competitionAdminService.exportRegistrations(
        competitionId,
        trackId ?? undefined,
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      const trackLabel = selected?.tracks.find((t) => t.id === trackId)?.name
      link.href = url
      link.download = `竞赛报名_${selected?.name ?? competitionId}${trackLabel ? `_${trackLabel}` : ''}_${date}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      message.success('导出成功')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

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
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleExport}
            disabled={!competitionId}
          >
            导出 CSV
          </Button>
        </Space>
        <Text type='secondary'>共 {data?.total ?? 0} 条报名</Text>
      </div>
      <Table<RegistrationWithCustom>
        rowKey='id'
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={competitionId ? pagination : false}
        locale={{ emptyText: competitionId ? '暂无报名记录' : '请先选择赛事' }}
        expandable={{
          expandedRowRender: (record) => {
            const fields = formatCustomFields(record.custom_field_values)
            if (fields.length === 0) {
              return <Text type='secondary'>无自定义字段</Text>
            }
            return (
              <Descriptions
                title='自定义字段'
                size='small'
                column={3}
                bordered
                items={fields.map((f) => ({
                  key: f.key,
                  label: f.key,
                  children: f.value,
                }))}
              />
            )
          },
          rowExpandable: (record) => {
            const fields = formatCustomFields(record.custom_field_values)
            return fields.length > 0
          },
        }}
      />
    </>
  )
}
