import { useState } from 'react'
import {
  Button, Card, Descriptions, Drawer, Input, Modal,
  Select, Space, Table, Tag, Typography, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { usePagination } from '@/hooks/usePagination'
import { nispService } from '@/services/nisp'
import type { NispRegistration } from '@/services/nisp'
import { formatPrice, formatDate } from '@/utils/format'

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  pending_payment: { text: '待支付', color: 'orange' },
  pending_review: { text: '待审核', color: 'blue' },
  rejected_awaiting_resubmission: { text: '待补交材料', color: 'red' },
  approved: { text: '审核通过', color: 'green' },
  cancelled: { text: '已取消', color: 'default' },
}

const LEVEL_LABELS: Record<string, string> = {
  '1': '一级',
  '2': '二级',
}

const FIELD_LABELS: Record<string, string> = {
  name: '姓名', pinyin: '拼音', major: '专业', school: '学校/单位',
  id_card: '身份证号', phone: '手机号码', email: '邮箱', province: '报考省份',
  training_type: '培训种类', gender: '性别', age: '年龄', education: '最高学历',
  address: '地址', zip_code: '邮编', institution: '培训机构',
}

export default function NispReviewTab() {
  const [statusFilter, setStatusFilter] = useState<string>('pending_review')
  const [selected, setSelected] = useState<NispRegistration | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const { data, loading, pagination, refresh } = usePagination(
    (page) => nispService.listRegistrations({ ...page, status: statusFilter || undefined }),
    [statusFilter],
  )

  const approve = async (reg: NispRegistration) => {
    try {
      await nispService.reviewRegistration(reg.id, { decision: 'approved' })
      message.success('已通过')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const reject = async () => {
    if (!selected || !rejectReason.trim()) return
    try {
      await nispService.reviewRegistration(selected.id, {
        decision: 'rejected',
        reason_detail: rejectReason.trim(),
      })
      message.success('已驳回')
      setRejectOpen(false)
      setRejectReason('')
      setSelected(null)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const columns: ColumnsType<NispRegistration> = [
    { title: '报名编号', dataIndex: 'registration_no', width: 160 },
    {
      title: '级别',
      dataIndex: 'level',
      width: 70,
      render: (v: string) => <Tag color={v === '1' ? 'blue' : 'purple'}>{LEVEL_LABELS[v]}</Tag>,
    },
    {
      title: '姓名',
      width: 100,
      render: (_, row) => String(row.candidate_snapshot?.name ?? '-'),
    },
    {
      title: '学校',
      width: 160,
      ellipsis: true,
      render: (_, row) => String(row.candidate_snapshot?.school ?? '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v] ?? { text: v, color: 'default' }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    { title: '金额', dataIndex: 'price_cents', width: 90, render: (v: number) => formatPrice(v) },
    { title: '报名时间', dataIndex: 'created_at', width: 110, render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作',
      width: 160,
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' onClick={() => setSelected(row)}>详情</Button>
          {row.status === 'pending_review' && (
            <>
              <Button size='small' type='primary' onClick={() => approve(row)}>通过</Button>
              <Button size='small' danger onClick={() => { setSelected(row); setRejectOpen(true) }}>驳回</Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            allowClear
            placeholder="筛选状态"
            options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.text }))}
          />
        </Space>
        <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />
      </Card>

      <Drawer
        title={`报名详情 - ${selected?.registration_no ?? ''}`}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={480}
      >
        {selected && (
          <>
            <Descriptions title="状态" column={1} bordered size='small'>
              <Descriptions.Item label="级别">{LEVEL_LABELS[selected.level]}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_CONFIG[selected.status]?.color}>
                  {STATUS_CONFIG[selected.status]?.text ?? selected.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="金额">{formatPrice(selected.price_cents)}</Descriptions.Item>
              <Descriptions.Item label="补交次数">{selected.resubmission_count}</Descriptions.Item>
            </Descriptions>
            <Descriptions title="报名信息" column={1} bordered size='small' style={{ marginTop: 16 }}>
              {Object.entries(selected.candidate_snapshot)
                .filter(([key]) => FIELD_LABELS[key])
                .map(([key, value]) => (
                  <Descriptions.Item key={key} label={FIELD_LABELS[key]}>
                    {String(value ?? '-')}
                  </Descriptions.Item>
                ))}
            </Descriptions>
            {selected.latest_review && (
              <Descriptions title="最新审核" column={1} bordered size='small' style={{ marginTop: 16 }}>
                <Descriptions.Item label="结果">
                  {selected.latest_review.decision === 'approved' ? '通过' : '驳回'}
                </Descriptions.Item>
                {selected.latest_review.reason_detail && (
                  <Descriptions.Item label="原因">{selected.latest_review.reason_detail}</Descriptions.Item>
                )}
              </Descriptions>
            )}
          </>
        )}
      </Drawer>

      <Modal
        title="驳回报名"
        open={rejectOpen}
        onCancel={() => { setRejectOpen(false); setRejectReason('') }}
        onOk={reject}
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请填写驳回原因（用户可见）"
          maxLength={2000}
        />
      </Modal>
    </>
  )
}
