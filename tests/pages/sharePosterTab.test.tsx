import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('share poster tab', () => {
  it('crops share posters to a fixed 1200×1600 portrait box', () => {
    const source = readSource('src/pages/operations/homepage/SharePosterTab.tsx')

    expect(source).toContain("crop={{ width: 1200, height: 1600, title: '分享海报', fixed: true }}")
    expect(source).toContain('fixed: true')
  })

  it('is registered as a homepage config tab', () => {
    const source = readSource('src/pages/operations/homepage/index.tsx')

    expect(source).toContain("key: 'sharePoster'")
    expect(source).toContain('分享海报')
  })

  it('calls the share-posters admin endpoints', () => {
    const source = readSource('src/services/sharePoster.ts')

    expect(source).toContain("'/admin/share-posters'")
    expect(source).toContain("'/admin/share-posters/batch-delete'")
  })
})
