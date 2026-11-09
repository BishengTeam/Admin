import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Segmented, Space, Table, Tabs, Tag, Tooltip, Typography, message } from 'antd'
import { ClearOutlined, RestOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import {
  recycleBinService,
  type RecycleBinItem,
  type RecycleBinState,
  type RecycleBinSummary,
} from '@/services/recycleBin'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/utils/format'
import { ConfirmButton } from '@/components/ConfirmButton'

const RESTORE_WINDOW_DAYS = 30

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后重试'
}

export default function RecycleBin() {
  const role = useAuthStore((state) => state.admin?.role)
  const isSuperAdmin = role === 'super_admin'
  const { ensureReauthenticated, reauthDialog } = useReauthentication()

  const [summary, setSummary] = useState<RecycleBinSummary[]>([])
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [state, setState] = useState<RecycleBinState>('deleted')
  const [keyword, setKeyword] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [mutating, setMutating] = useState(false)

  const moduleLabel = useCallback(
    (module: string) => summary.find((s) => s.module === module)?.label ?? module,
    [summary],
  )

  const loadSummary = useCallback(async () => {
    try {
      const rows = await recycleBinService.summary()
      setSummary(rows)
      setActiveModule((current) => {
        if (current && rows.some((r) => r.module === current)) return current
        return rows.length > 0 ? rows[0].module : null
      })
    } catch (error) {
      message.error(errorMessage(error))
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const {
    data,
    loading,
    pagination,
    refresh,
  } = usePagination<RecycleBinItem>(
    (params, signal) => {
      if (!activeModule) {
        return Promise.resolve({ items: [], total: 0, page: 1, page_size: params.page_size ?? 20 })
      }
      return recycleBinService.list({
        module: activeModule,
        state,
        keyword: keyword.trim() || undefined,
        ...params,
      }, signal)
    },
    [activeModule, state, keyword],
  )

  const items = data?.items ?? []
  const supportsArchived = ['course', 'quiz_library', 'plan', 'agreement_template'].includes(
    activeModule ?? '',
  )

  // 归档页签切到不支持的模块时回退到已删除态
  useEffect(() => {
    if (state === 'archived' && !supportsArchived) {
      setState('deleted')
    }
  }, [state, supportsArchived])

  useEffect(() => {
    setSelectedIds([])
  }, [activeModule, state, pagination.current, pagination.pageSize])

  const runRestore = useCallback(async (ids: number[]) => {
    if (!activeModule || ids.length === 0) return
    setMutating(true)
    try {
      const count = await recycleBinService.restore(activeModule, ids)
      message.success(`已恢复 ${count} 条`)
      setSelectedIds([])
      await refresh()
      await loadSummary()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setMutating(false)
    }
  }, [activeModule, refresh, loadSummary])

  const runPurge = useCallback(async (ids: number[]) => {
    if (!activeModule || ids.length === 0) return
    const token = await ensureReauthenticated()
    if (!token) return
    setMutating(true)
    try {
      const result = await recycleBinService.purge(activeModule, ids, token)
      message.success(`物理删除 ${result.physical} 条，墓碑化 ${result.tombstone} 条`)
      setSelectedIds([])
      await refresh()
      await loadSummary()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setMutating(false)
    }
  }, [activeModule, ensureReauthenticated, refresh, loadSummary])

  const canRestore = (row: RecycleBinItem) =>
    row.status === 'deleted' ? !row.expired : row.restorable

  const restoreTip = (row: RecycleBinItem) =>
    row.status === 'archived'
      ? row.restorable ? '从归档恢复' : '该模块归档为终态，请在原模块处理'
      : row.expired
        ? `已超过 ${RESTORE_WINDOW_DAYS} 天，无法恢复`
        : '恢复到原模块'

  const columns = useMemo(() => [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: state === 'deleted' ? '删除时间' : '归档状态',
      key: 'time',
      width: 220,
      render: (_: unknown, row: RecycleBinItem) =>
        row.status === 'deleted'
          ? row.deleted_at ? formatDate(row.deleted_at) : '—'
          : <Tag>已归档（不倒计时）</Tag>,
    },
    {
      title: '恢复截止',
      key: 'restore_until',
      width: 220,
      render: (_: unknown, row: RecycleBinItem) => {
        if (row.status !== 'deleted') return '—'
        if (row.expired) return <Tag color="red">已过期，待系统清除</Tag>
        return row.restore_until ? formatDate(row.restore_until) : '—'
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_: unknown, row: RecycleBinItem) => (
        <Space>
          <Tooltip title={restoreTip(row)}>
            <Button
              type="link"
              size="small"
              icon={<UndoOutlined />}
              disabled={!canRestore(row)}
              onClick={() => void runRestore([row.id])}
            >
              恢复
            </Button>
          </Tooltip>
          {activeModule === 'quiz_library' && row.status === 'archived' && row.restorable && (
            <ConfirmButton
              title="移入回收站"
              description={`已归档题库「${row.title}」将移入回收站（删除态），30 个自然日内可恢复，到期自动永久删除。确认移入？`}
              danger
              size="small"
              onConfirm={async () => {
                if (!activeModule) return
                try {
                  const count = await recycleBinService.archiveDelete(activeModule, [row.id])
                  message.success(`已移入回收站 ${count} 条`)
                  await refresh()
                  await loadSummary()
                } catch (error) {
                  message.error(errorMessage(error))
                }
              }}
            >
              移入回收站
            </ConfirmButton>
          )}
          {isSuperAdmin && row.status === 'deleted' && (
            <ConfirmButton
              title="立即彻底删除"
              description={`「${row.title}」将立即永久删除：无引用的物理删除，被学生数据引用过的转为墓碑（内容清空、历史保留）。此操作不可恢复，确认继续？`}
              danger
              size="small"
              onConfirm={() => runPurge([row.id])}
            >
              彻底删除
            </ConfirmButton>
          )}
        </Space>
      ),
    },
  ], [state, isSuperAdmin, runRestore, runPurge])

  if (summary.length === 0) {
    return (
      <Card>
        <Alert
          type="info"
          showIcon
          message="回收站为空或当前角色没有可查看的模块"
          description="删除和归档的内容会进入回收站，30 自然日内可恢复；归档条目不倒计时。"
        />
        {reauthDialog}
      </Card>
    )
  }

  const tabItems = summary.map((s) => ({
    key: s.module,
    label: (
      <span>
        {s.label}
        {(s.deleted_count > 0 || s.archived_count > 0) && (
          <Typography.Text type="secondary" style={{ marginLeft: 4 }}>
            ({s.deleted_count}
            {supportsArchived && s.archived_count > 0 ? `/${s.archived_count}` : ''})
          </Typography.Text>
        )}
      </span>
    ),
  }))

  return (
    <Card
      title={
        <Space>
          <RestOutlined />
          回收站
          <Typography.Text type="secondary" style={{ fontWeight: 400 }}>
            删除内容保留 {RESTORE_WINDOW_DAYS} 个自然日，过期自动永久删除；归档内容只陈列不清除
          </Typography.Text>
        </Space>
      }
    >
      <Tabs
        activeKey={activeModule ?? undefined}
        items={tabItems}
        onChange={(key) => setActiveModule(key)}
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Segmented
          value={state}
          onChange={(v) => setState(v as RecycleBinState)}
          options={[
            { label: '已删除', value: 'deleted' },
            ...(supportsArchived ? [{ label: '已归档', value: 'archived' }] : []),
          ]}
        />
        <Input
          allowClear
          placeholder="按标题搜索"
          prefix={<SearchOutlined />}
          style={{ width: 240 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {state === 'deleted' && (
          <>
            <Button
              icon={<UndoOutlined />}
              disabled={selectedIds.length === 0 || mutating}
              onClick={() => void runRestore(selectedIds)}
            >
              批量恢复 ({selectedIds.length})
            </Button>
            {isSuperAdmin && (
              <ConfirmButton
                title="批量彻底删除"
                description={`将对选中的 ${selectedIds.length} 条立即永久删除（无引用物理删、有引用转墓碑），不可恢复。确认继续？`}
                danger
                icon={<ClearOutlined />}
                disabled={selectedIds.length === 0 || mutating}
                onConfirm={() => runPurge(selectedIds)}
              >
                批量彻底删除 ({selectedIds.length})
              </ConfirmButton>
            )}
          </>
        )}
      </Space>
      <Table<RecycleBinItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={pagination}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
        }}
      />
      {reauthDialog}
    </Card>
  )
}
