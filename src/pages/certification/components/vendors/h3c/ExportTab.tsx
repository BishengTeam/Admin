import { Button, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { h3cService } from '@/services/h3c'
import { formatDate } from '@/utils/format'
import type { CertType } from '../type-registry'
import type { H3cExportJob, H3cRegistrationType } from '@/types/h3c'

const TYPE_LABELS: Record<H3cRegistrationType, string> = {
  coupon: '考券报名',
  student: '学生报名',
  full: '全额报名',
}

export default function ExportTab(_props: { type: CertType }) {
  const navigate = useNavigate()
  const { data, loading, pagination, refresh } = usePagination(
    (page) => h3cService.listExports(page),
    [],
  )
  const { ensureReauthenticated, reauthDialog } = useReauthentication()

  const download = async (id: number) => {
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      const result = await h3cService.getExportUrl(id, token)
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取下载链接失败')
    }
  }

  const columns: ColumnsType<H3cExportJob> = [
    { title: '任务', dataIndex: 'id', width: 80 },
    { title: '批次', dataIndex: 'batch_id', width: 90 },
    {
      title: '类型',
      dataIndex: 'registration_type',
      width: 100,
      render: (value: string) => value === 'mixed' ? '混合' : TYPE_LABELS[value as H3cRegistrationType],
    },
    {
      title: '产物',
      dataIndex: 'artifact_type',
      width: 110,
      render: (value: string) => (
        value === 'full_package' ? '完整资料包' : value === 'embedded_xlsx' ? '内嵌 Excel' : '图片 ZIP'
      ),
    },
    { title: '数量', dataIndex: 'registration_count', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => {
        const map: Record<string, { text: string; color: string }> = {
          queued: { text: '排队中', color: 'orange' },
          running: { text: '生成中', color: 'processing' },
          succeeded: { text: '已完成', color: 'green' },
          failed: { text: '失败', color: 'red' },
        }
        const item = map[value] ?? { text: value, color: 'default' }
        return <Tag color={item.color}>{item.text}</Tag>
      },
    },
    {
      title: '完成时间',
      dataIndex: 'finished_at',
      width: 165,
      render: (value: string | null) => value ? formatDate(value) : '-',
    },
    {
      title: '操作',
      width: 190,
      render: (_, row) => (
        <Space>
          {row.status === 'succeeded' && row.storage_key && (
            <Button size='small' onClick={() => download(row.id)}>下载</Button>
          )}
          <Button
            size='small'
            type='primary'
            ghost
            onClick={() => navigate(`/admin/certification/h3c/export/${row.batch_id}`)}
          >
            报名与导出
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
      </Space>
      <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />
      {reauthDialog}
    </>
  )
}
