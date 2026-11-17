import { describe, expect, it } from 'vitest'

import { proxiedImageUrl, toAbsoluteMediaUrl } from '@/utils/mediaUrl'

describe('proxiedImageUrl', () => {
  it('routes WeChat CDN images through the backend thumb proxy', () => {
    const raw = 'https://mmbiz.qpic.cn/sz_mmbiz_jpg/abc/0?wx_fmt=jpeg'
    expect(proxiedImageUrl(raw)).toBe(`/api/media/thumb-proxy?url=${encodeURIComponent(raw)}`)
  })

  it('proxies the qlogo host too', () => {
    expect(proxiedImageUrl('https://mmbiz.qlogo.cn/av.jpg')).toContain('/api/media/thumb-proxy?url=')
  })

  it('passes non-WeChat and local media URLs through untouched', () => {
    expect(proxiedImageUrl('/api/media/abc123.jpg')).toBe('/api/media/abc123.jpg')
    expect(proxiedImageUrl('https://oss.example.com/x.jpg')).toBe('https://oss.example.com/x.jpg')
    expect(proxiedImageUrl('http://mmbiz.qpic.cn/x.jpg')).toBe('http://mmbiz.qpic.cn/x.jpg')
  })

  it('never mimics the proxy for lookalike hosts', () => {
    expect(proxiedImageUrl('https://mmbiz.qpic.cn.evil.com/x.jpg')).toBe(
      'https://mmbiz.qpic.cn.evil.com/x.jpg',
    )
  })

  it('handles empty values', () => {
    expect(proxiedImageUrl(null)).toBe('')
    expect(proxiedImageUrl(undefined)).toBe('')
    expect(proxiedImageUrl('  ')).toBe('')
  })
})

describe('toAbsoluteMediaUrl', () => {
  it('keeps absolute URLs as-is', () => {
    expect(toAbsoluteMediaUrl('https://a.com/b.png')).toBe('https://a.com/b.png')
  })

  it('resolves relative paths against window origin in browser', () => {
    expect(toAbsoluteMediaUrl('/api/media/x.png')).toMatch(/^https?:\/\/[^/]+\/api\/media\/x\.png$/)
  })
})
