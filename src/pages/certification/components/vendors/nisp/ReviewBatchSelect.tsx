import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Empty, Select, Space, Spin, Tooltip, Typography } from 'antd'
import { nispService, type NispReviewBatchOption } from '@/services/nisp'

const BATCH_STATUS: Record<string, string> = {
  draft: '草稿', published: '已发布', registration_closed: '报名关闭',
  cancelled: '已取消', finalized: '已结束', archived: '已归档',
}

export const nispLevelLabel = (level: '1' | '2') => level === '2' ? 'NISP二级' : 'NISP一级'
const batchLabel = (batch: NispReviewBatchOption) => `${batch.name || '未命名批次'} · ${nispLevelLabel(batch.level)} · #${batch.id}`
type BatchOption = { value: number; label: string; batch: NispReviewBatchOption }
type BatchValue = { value: number; label: string }

export default function ReviewBatchSelect({ value, onChange }: {
  value?: NispReviewBatchOption
  onChange: (batch: NispReviewBatchOption | undefined) => void
}) {
  const [items, setItems] = useState<NispReviewBatchOption[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const generation = useRef(0), page = useRef(0), inFlight = useRef(false)

  const load = useCallback(async (requestedPage: number, keyword: string, seq: number) => {
    if (seq !== generation.current) return
    inFlight.current = true; setLoading(true); setFailed(false)
    try {
      const result = await nispService.listReviewBatchOptions({ page: requestedPage, page_size: 20, keyword: keyword || undefined })
      if (seq !== generation.current) return
      setItems(previous => requestedPage === 1 ? result.items
        : [...new Map([...previous, ...result.items].map(item => [item.id, item])).values()])
      setTotal(result.total); page.current = result.page
    } catch {
      if (seq === generation.current) setFailed(true)
    } finally {
      if (seq === generation.current) { inFlight.current = false; setLoading(false) }
    }
  }, [])

  useEffect(() => {
    const seq = ++generation.current
    page.current = 0; inFlight.current = true
    setItems([]); setTotal(0); setFailed(false); setLoading(true)
    const timer = window.setTimeout(() => { void load(1, search.trim(), seq) }, search ? 300 : 0)
    return () => { window.clearTimeout(timer); generation.current++ }
  }, [search, load])

  return <Tooltip title={value ? batchLabel(value) : undefined}>
    <Select<BatchValue, BatchOption>
      aria-label='所属批次' placeholder='所属批次（全部）' allowClear showSearch labelInValue filterOption={false}
      listItemHeight={52} listHeight={312}
      style={{ width: 280, maxWidth: '100%' }} loading={loading} searchValue={search}
      value={value ? { value: value.id, label: batchLabel(value) } : undefined}
      options={items.map(batch => ({ value: batch.id, label: batchLabel(batch), batch }))}
      onSearch={text => setSearch(text.slice(0, 64))}
      onChange={(selection, option) => {
        onChange(selection && !Array.isArray(option) ? option?.batch : undefined)
        setSearch('')
      }}
      onPopupScroll={event => {
        const target = event.currentTarget
        if (!inFlight.current && !failed && page.current > 0 && items.length < total
          && target.scrollHeight - target.scrollTop - target.clientHeight < 32) {
          void load(page.current + 1, search.trim(), generation.current)
        }
      }}
      optionRender={option => <Space direction='vertical' size={0} style={{ width: '100%', height: 42, justifyContent: 'center' }}>
        <Typography.Text ellipsis title={option.data.batch.name}>{option.data.batch.name || `批次 #${option.data.batch.id}`}</Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          {nispLevelLabel(option.data.batch.level)} · 批次 #{option.data.batch.id} · {BATCH_STATUS[option.data.batch.status] || option.data.batch.status}
        </Typography.Text>
      </Space>}
      notFoundContent={loading ? <Spin size='small' /> : failed
        ? <Typography.Text type='danger'>批次加载失败，请重试</Typography.Text>
        : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无匹配批次' />}
      dropdownRender={menu => <>{menu}
        {failed && <div style={{ padding: 8 }} onMouseDown={event => event.preventDefault()}>
          {items.length > 0 && <Typography.Text type='danger'>批次加载失败，请重试</Typography.Text>}
          <Button type='link' size='small' onClick={() => void load(page.current + 1, search.trim(), generation.current)}>重试加载批次</Button>
        </div>}
        {loading && items.length > 0 && <Typography.Text type='secondary' style={{ display: 'block', padding: 8 }}>正在加载更多批次…</Typography.Text>}
      </>}
    />
  </Tooltip>
}
