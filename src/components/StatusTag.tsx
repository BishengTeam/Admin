import { Tag } from 'antd'

interface StatusTagProps {
  status: boolean | string
  map?: Record<string, { color: string; text: string }>
}

export function StatusTag({ status, map }: StatusTagProps) {
  const key = String(status)
  const config = map?.[key]
  if (!config) {
    return <Tag>{key || '未知'}</Tag>
  }
  return <Tag color={config.color}>{config.text}</Tag>
}
