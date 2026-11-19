/**
 * 富文本渲染前的前端白名单消毒。
 *
 * 服务端已在写入时消毒；这里对历史数据与接口异常再做一次防御，避免
 * `dangerouslySetInnerHTML` 直接渲染脚本/事件属性。解析使用惰性 DOMParser
 * 文档，不会执行脚本。
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's',
  'sub', 'sup', 'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'a', 'img',
])

const ALLOWED_STYLE_PROPERTIES = new Set([
  'color', 'background-color', 'text-align', 'text-indent',
  'font-size', 'font-weight', 'font-family', 'font-style',
  'text-decoration', 'line-height', 'letter-spacing',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'border', 'border-collapse', 'border-width', 'border-style', 'border-color',
  'vertical-align', 'white-space', 'width', 'height', 'max-width',
])

const STYLE_FORBIDDEN = ['url(', 'expression', 'javascript:', '@import', '</', '\\']
const SAFE_LINK_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i
const SAFE_IMAGE_URL = /^(https?:\/\/|data:image\/|\/(?!\/))/i
const DANGEROUS_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript',
  'template', 'svg', 'math', 'form', 'link', 'meta', 'base',
])

function safeStyle(value: string) {
  const declarations: string[] = []
  for (const part of value.split(';')) {
    const index = part.indexOf(':')
    if (index < 0) continue
    const prop = part.slice(0, index).trim().toLowerCase()
    const raw = part.slice(index + 1).trim()
    if (!ALLOWED_STYLE_PROPERTIES.has(prop) || !raw) continue
    const lowered = raw.toLowerCase()
    if (STYLE_FORBIDDEN.some(token => lowered.includes(token))) continue
    declarations.push(`${prop}: ${raw}`)
  }
  return declarations.join('; ')
}

function cleanNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.nodeValue ?? '')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const element = node as Element
  const tag = element.tagName.toLowerCase()
  if (DANGEROUS_TAGS.has(tag)) return null
  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = doc.createDocumentFragment()
    for (const child of Array.from(element.childNodes)) {
      const cleaned = cleanNode(child, doc)
      if (cleaned) fragment.appendChild(cleaned)
    }
    return fragment
  }

  const output = doc.createElement(tag)
  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase()
    const value = attr.value
    if (name.startsWith('on')) continue
    if (name === 'style') {
      const style = safeStyle(value)
      if (style) output.setAttribute('style', style)
    } else if ((name === 'colspan' || name === 'rowspan') && /^\d+$/.test(value)) {
      output.setAttribute(name, value)
    } else if ((name === 'width' || name === 'height') && /^[\d%]+$/.test(value)) {
      output.setAttribute(name, value)
    } else if (tag === 'a' && name === 'title') {
      output.setAttribute('title', value)
    } else if (tag === 'a' && name === 'href' && SAFE_LINK_URL.test(value.trim())) {
      output.setAttribute('href', value.trim())
      output.setAttribute('rel', 'noopener noreferrer')
      output.setAttribute('target', '_blank')
    } else if (tag === 'img' && name === 'src' && SAFE_IMAGE_URL.test(value.trim())) {
      output.setAttribute('src', value.trim())
    } else if (tag === 'img' && (name === 'alt' || name === 'title')) {
      output.setAttribute(name, value)
    }
  }
  for (const child of Array.from(element.childNodes)) {
    const cleaned = cleanNode(child, doc)
    if (cleaned) output.appendChild(cleaned)
  }
  return output
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<div id="sanitize-root">${html}</div>`, 'text/html')
  const root = doc.getElementById('sanitize-root')
  if (!root) return ''
  const output = doc.createElement('div')
  for (const child of Array.from(root.childNodes)) {
    const cleaned = cleanNode(child, doc)
    if (cleaned) output.appendChild(cleaned)
  }
  return output.innerHTML
}
