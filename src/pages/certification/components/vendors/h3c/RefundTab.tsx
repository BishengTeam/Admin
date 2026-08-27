import {
  Button,
  Popconfirm,
  Space,
  Table,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { h3cService } from '@/services/h3c'
import { formatDate, formatPrice } from '@/utils/format'
import type { CertType } from '../type-registry'
import type { H3cRefund } from '@/types/h3c'

export default function RefundTab(_props: { type: CertType }) {
  const { data, loading, pagination, refresh } = usePagination(
    (page) => h3cService.listRefunds({ ...page, status: 'requested' }),
    [],
  )
  const { ensureReauthenticated, reauthDialog } = useReauthentication()
  const confirm = async (id: number) => {
    const token = await ensureReauthenticated()
    if (!token) throw new Error('请重新验证管理员密码')
    await h3cService.confirmRefund(id, token)
    message.success('退款已确认提交')
    refresh()
  }
  const columns: ColumnsType<H3cRefund> = [
    { title: '报名', dataIndex: 'registration_id', width: 90 },
    { title: '订单', dataIndex: 'order_id', width: 90 },
    { title: '原因', dataIndex: 'reason_code', width: 170 },
    { title: '金额', dataIndex: 'amount_cents', width: 110, render: (value: number) => formatPrice(value) },
    { title: '状态', dataIndex: 'status', width: 100 },
    { title: '创建时间', dataIndex: 'created_at', width: 165, render: (value: string) => formatDate(value) },
    {
      title: '操作',
      width: 120,
      render: (_, row) => row.status === 'requested' || row.status === 'failed' ? (
        <Popconfirm title='确认发起全额退款？' onConfirm={() => confirm(row.id)}>
          <Button size='small' danger type='primary'>确认退款</Button>
        </Popconfirm>
      ) : '-',
    },
  ]
  return (
    <>
      <Button icon={<ReloadOutlined />} style={{ marginBottom: 16 }} onClick={refresh}>刷新</Button>
      <Table rowKey='id' columns={columns} dataSource={data?.items ?? []} loading={loading} pagination={pagination} />
      {reauthDialog}
    </>
  )
}
