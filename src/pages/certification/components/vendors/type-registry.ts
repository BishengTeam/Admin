/**
 * 系统级认证类型枚举 — 新增厂商只改此文件
 */
export const CERT_TYPES = ['h3c', 'renshe'] as const
export type CertType = (typeof CERT_TYPES)[number]

export const CERT_TYPE_META: Record<
  CertType,
  { label: string; icon: string; color: string }
> = {
  h3c: { label: '新华三', icon: 'H', color: '#1677ff' },
  renshe: { label: '人社', icon: '人', color: '#52c41a' },
}
