/** Quiz image contracts require absolute http(s) URLs for mini-program playback. */
export function toAbsoluteMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  if (typeof window === 'undefined') return url
  return new URL(url, window.location.origin).toString()
}

/**
 * 微信公众平台图床（mmbiz.qpic.cn）带 Referer 反盗链：管理端页面 <img> 直连只会拿到
 * 「未经允许不可引用」占位图。改走后端无 Referer 代理（/api/media/thumb-proxy）取原图；
 * 其余地址（站内 /api/media/ 相对路径、其他 https 外链）原样返回。
 */
export function proxiedImageUrl(url: string | null | undefined): string {
  const trimmed = url?.trim() ?? ''
  if (!/^https:\/\/(mmbiz\.qpic\.cn|mmbiz\.qlogo\.cn)\//i.test(trimmed)) return trimmed
  return `/api/media/thumb-proxy?url=${encodeURIComponent(trimmed)}`
}
