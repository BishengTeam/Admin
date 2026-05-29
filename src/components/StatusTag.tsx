import { Tag } from 'antd'

interface StatusTagProps {
  status: string
  map?: Record<string, { color: string; text: string }>
}

export function StatusTag({ status, map }: StatusTagProps) {
  const config = map?.[status]
  if (!config) {
    return <Tag>{status || '未知'}</Tag>
  }
  return <Tag color={config.color}>{config.text}</Tag>
}
