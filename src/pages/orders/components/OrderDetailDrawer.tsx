import { Drawer, Descriptions, Space, Typography, Image } from 'antd'
import { FilePdfOutlined, FileImageOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import { ORDER_STATUS_MAP } from '@/core/constants'
import { formatDate, formatPrice } from '@/utils/format'
import type { OrderDetail } from '@/types/order'

const { Text, Link } = Typography

// ── extra_data 字段 → 中文标签 ──
const fieldLabelMap: Record<string, string> = {
  // 通用
  first_name: 'FirstName',
  last_name: 'LastName',
  education: '学历',
  gender: '性别',
  organization: '所在单位',
  exam_date: '考试日期',
  // 深信服
  email: '邮箱',
  exam_direction: '考试方向',
  mailing_address: '邮寄地址',
  // NISP
  pinyin: '姓名拼音',
  school: '学校',
  province: '省份',
  major: '专业',
  age: '年龄',
  address: '地址',
  zip_code: '邮编',
  // H3C
  country: '国别',
  language: '语言',
  // 人社
  branch: '分院',
}

// ── 各认证类型所需展示的字段顺序 ──
const certFieldOrder: Record<string, string[]> = {
  h3c: ['first_name', 'last_name', 'gender', 'education', 'organization', 'country', 'language', 'exam_date'],
  sangfor: ['first_name', 'last_name', 'email', 'exam_direction', 'exam_date', 'organization', 'mailing_address'],
  nisp1: ['pinyin', 'school', 'province', 'major'],
  nisp2: ['pinyin', 'school', 'gender', 'age', 'education', 'major', 'province', 'address', 'zip_code'],
  renshe: ['branch'],
}

// ── 附件类型判断 ──
function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url) || url.startsWith('data:image/')
}

function fileLabel(url: string): string {
  const name = url.split('/').pop() || url
  return name.length > 40 ? name.slice(0, 37) + '...' : name
}

interface OrderDetailDrawerProps {
  order: OrderDetail | null
  open: boolean
  onClose: () => void
}

export default function OrderDetailDrawer({ order, open, onClose }: OrderDetailDrawerProps) {
  if (!order) return null

  const extra = order.extra_data as Record<string, unknown> | null
  const fieldKeys = certFieldOrder[order.cert_type] ?? []
  const attachments = order.attachments ?? []

  return (
    <Drawer title="订单详情" open={open} onClose={onClose} width={560}>
      {/* 基本信息 */}
      <Descriptions column={2} size="small" bordered style={{ marginBottom: 24 }}>
        <Descriptions.Item label="订单号" span={2}>
          <Text code>{order.out_trade_no}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="用户">{order.candidate_name}</Descriptions.Item>
        <Descriptions.Item label="手机号">{order.candidate_phone}</Descriptions.Item>
        <Descriptions.Item label="认证类型">{order.cert_type}</Descriptions.Item>
        <Descriptions.Item label="金额">
          <Text strong>{formatPrice(order.price)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <StatusTag status={order.status} map={ORDER_STATUS_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="下单时间" span={2}>
          {formatDate(order.created_at)}
        </Descriptions.Item>
        {order.pay_time && (
          <Descriptions.Item label="支付时间" span={2}>
            {formatDate(order.pay_time)}
          </Descriptions.Item>
        )}
        {order.refund_time && (
          <>
            <Descriptions.Item label="退款时间" span={2}>
              {formatDate(order.refund_time)}
            </Descriptions.Item>
            <Descriptions.Item label="退款金额">
              <Text type="danger">{order.refund_amount != null ? formatPrice(order.refund_amount) : '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="退款原因">
              <Text type="secondary">{order.refund_reason || '-'}</Text>
            </Descriptions.Item>
          </>
        )}
      </Descriptions>

      {/* 报名信息 (extra_data) */}
      {fieldKeys.length > 0 && extra && (
        <>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>报名信息</Text>
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 24 }}>
            {fieldKeys.map((key) => {
              const value = extra[key]
              if (value == null || value === '') return null
              return (
                <Descriptions.Item key={key} label={fieldLabelMap[key] ?? key}>
                  {String(value)}
                </Descriptions.Item>
              )
            })}
          </Descriptions>
        </>
      )}

      {/* 附件 */}
      {attachments.length > 0 && (
        <>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>附件材料</Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            {attachments.map((url, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#fafafa',
                  borderRadius: 6,
                }}
              >
                <Space>
                  {isImageUrl(url) ? <FileImageOutlined /> : <FilePdfOutlined />}
                  <Text style={{ maxWidth: 280 }} ellipsis>
                    {fileLabel(url)}
                  </Text>
                </Space>
                <Space>
                  {isImageUrl(url) && <Image src={url} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} />}
                  <Link href={url} target="_blank" rel="noopener noreferrer">
                    下载
                  </Link>
                </Space>
              </div>
            ))}
          </Space>
        </>
      )}
    </Drawer>
  )
}
