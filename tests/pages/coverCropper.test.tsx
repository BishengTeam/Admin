import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('cover cropper', () => {
  it('provides draggable fixed-ratio cropping and compressed JPEG output', () => {
    const source = readSource('src/components/CoverCropper.tsx')

    expect(source).toContain('onPointerDown={handlePointerDown}')
    expect(source).toContain('onPointerMove={handlePointerMove}')
    expect(source).toContain('data-handle="move"')
    expect(source).toContain("key: 'n'")
    expect(source).toContain("key: 'e'")
    expect(source).toContain("key: 'se'")
    expect(source).toContain('function resizeCropRect')
    expect(source).toContain('Math.min(imageSize.width, imageSize.height * cropRatio)')
    expect(source).toContain('const nextHeight = nextWidth / cropRatio')
    expect(source).toContain('canvas.width = crop.width')
    expect(source).toContain('canvas.height = crop.height')
    expect(source).toContain("canvas.toBlob(resolve, 'image/jpeg', quality)")
    expect(source).toContain('blob.size <= 5 * 1024 * 1024')
    expect(source).toContain('拖动中间移动位置，拖动边缘/四角按固定比例等比调整大小')
  })

  it('routes all cover ImageUpload fields through fixed-size manual cropping', () => {
    const paths = [
      'src/pages/operations/activities/ActivityTab.tsx',
      'src/pages/operations/competitions/CompetitionTab.tsx',
      'src/pages/operations/homepage/BannerTab.tsx',
      'src/pages/operations/homepage/components/ContentEditDrawer.tsx',
      'src/pages/operations/training/index.tsx',
      'src/pages/quiz/libraries.tsx',
    ]
    const expectedSizes: Record<string, string> = {
      'src/pages/operations/activities/ActivityTab.tsx': 'width: 1404, height: 640',
      'src/pages/operations/competitions/CompetitionTab.tsx': 'width: 1404, height: 640',
      'src/pages/operations/homepage/BannerTab.tsx': 'width: 1404, height: 640',
      'src/pages/operations/homepage/components/ContentEditDrawer.tsx': 'width: 1334, height: 360',
      'src/pages/operations/training/index.tsx': 'width: 720, height: 520',
      'src/pages/quiz/libraries.tsx': 'width: 560, height: 440',
    }

    for (const path of paths) {
      const source = readSource(path)
      expect(source, path).toContain('crop={{')
      expect(source, path).toContain(expectedSizes[path])
    }
  })

  it('uses manual 1280x720 cropping for course covers', () => {
    for (const path of ['src/pages/courses/List.tsx', 'src/pages/courses/Detail.tsx']) {
      const source = readSource(path)
      expect(source, path).toContain('<CoverCropper')
      expect(source, path).toContain('width: 1280, height: 720')
      expect(source, path).toContain('uploadCover(croppedFile)')
    }
  })
})
