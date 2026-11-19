import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '@/utils/sanitizeHtml'

describe('sanitizeHtml', () => {
  it('strips scripts, event handlers and dangerous URLs', () => {
    const cleaned = sanitizeHtml(
      '<p onclick="steal()">hello<script>alert(1)</script></p>' +
        '<img src="javascript:alert(1)" onerror="alert(2)">' +
        '<a href="javascript:alert(3)">click</a>',
    )

    expect(cleaned).not.toContain('<script')
    expect(cleaned).not.toContain('onclick')
    expect(cleaned).not.toContain('onerror')
    expect(cleaned).not.toContain('javascript:')
    expect(cleaned).toContain('hello')
    expect(cleaned).toContain('click')
  })

  it('keeps layout markup and hardens external links', () => {
    const cleaned = sanitizeHtml(
      '<p style="text-align:center;background:url(x)">A</p>' +
        '<a href="https://example.com">link</a>',
    )

    expect(cleaned).toContain('text-align: center')
    expect(cleaned).not.toContain('url(')
    expect(cleaned).toContain('rel="noopener noreferrer"')
    expect(cleaned).toContain('target="_blank"')
  })

  it('allows data URLs only for images, never for links', () => {
    const cleaned = sanitizeHtml(
      '<a href="data:image/png;base64,AAAA">link</a>' +
        '<img src="data:image/png;base64,AAAA">',
    )

    expect(cleaned).not.toContain('<a href="data:image')
    expect(cleaned).toContain('<img src="data:image')
  })
})
