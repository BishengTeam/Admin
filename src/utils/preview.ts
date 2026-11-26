/**
 * OSS 默认域名对预签名 URL 强制加 Content-Disposition: attachment（x-oss-force-download），
 * iframe 内嵌会被浏览器判为下载型响应并拦截。先取回字节再生成同源 blob: URL，PDF 才能内联渲染。
 * 注意：该请求是简单 GET，不带 Range；依赖 OSS CORS 白名单已包含 admin 源（现配置已包含）。
 */
export async function previewBlobUrl(url: string, contentType = 'application/pdf'): Promise<string> {
  // 已经是同源 blob:/data: 的地址无需再取一次（例如后端 content 接口本身返回 Blob）
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('预览加载失败，请检查网络或当前环境的跨域配置')
  }
  if (!response.ok) throw new Error(`预览加载失败（HTTP ${response.status}），请重试`)
  const blob = new Blob([await response.arrayBuffer()], { type: contentType })
  return URL.createObjectURL(blob)
}
