/**
 * OSS 默认域名对预签名 URL 强制加 Content-Disposition: attachment（x-oss-force-download），
 * iframe 内嵌会被浏览器判为下载型响应并拦截。先取回字节再生成同源 blob: URL，PDF 才能内联渲染。
 *
 * 只对绝对 http(s) 地址做转换：
 * - 同源相对路径（后端代理/自有 nginx）本身不带强制下载头，直连即可；
 * - 已经是 blob:/data: 的地址同样直接复用。
 */
export async function previewBlobUrl(url: string, contentType = 'application/pdf'): Promise<string> {
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (!/^https?:\/\//i.test(url)) return url
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
