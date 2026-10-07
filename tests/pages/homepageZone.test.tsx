import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('homepage zone content', () => {
  it('does not offer a competition banner configuration', () => {
    const root = process.cwd()
    const list = readFileSync(resolve(root, 'src/pages/operations/homepage/ZoneTab.tsx'), 'utf8')
    const drawer = readFileSync(
      resolve(root, 'src/pages/operations/homepage/components/ContentEditDrawer.tsx'),
      'utf8',
    )

    expect(list).not.toContain("value: 'competition'")
    expect(drawer).not.toContain("value: 'competition'")
  })
})
