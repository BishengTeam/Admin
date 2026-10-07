import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Modal, Space, Typography, message } from 'antd'

export interface CoverCropConfig {
  /** 固定输出宽度，单位 px */
  width: number
  /** 固定输出高度，单位 px */
  height: number
  title?: string
}

interface CoverCropperProps {
  open: boolean
  file: File | null
  crop: CoverCropConfig
  onCancel: () => void
  onCropped: (file: File) => void | Promise<void>
}

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

type CropHandle = 'move' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

interface DragState {
  handle: CropHandle
  startRect: CropRect
  startClientX: number
  startClientY: number
}

const STAGE_MAX_WIDTH = 560
const STAGE_MAX_HEIGHT = 400
const MIN_CROP_WIDTH = 48
const HANDLE_SIZE = 14

const HANDLE_DIRECTIONS: Record<Exclude<CropHandle, 'move'>, { x: -1 | 0 | 1; y: -1 | 0 | 1 }> = {
  n: { x: 0, y: -1 },
  ne: { x: 1, y: -1 },
  e: { x: 1, y: 0 },
  se: { x: 1, y: 1 },
  s: { x: 0, y: 1 },
  sw: { x: -1, y: 1 },
  w: { x: -1, y: 0 },
  nw: { x: -1, y: -1 },
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function loadImage(file: File): Promise<{ image: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve({ image, objectUrl })
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('图片读取失败，请更换图片'))
    }
    image.src = objectUrl
  })
}

function getImageLayout(image: HTMLImageElement) {
  const scale = Math.min(
    STAGE_MAX_WIDTH / image.naturalWidth,
    STAGE_MAX_HEIGHT / image.naturalHeight,
  )
  return {
    width: Math.max(1, Math.round(image.naturalWidth * scale)),
    height: Math.max(1, Math.round(image.naturalHeight * scale)),
  }
}

function getInitialCropRect(
  imageWidth: number,
  imageHeight: number,
  cropRatio: number,
): CropRect {
  let width = imageWidth * 0.9
  let height = width / cropRatio

  if (height > imageHeight * 0.9) {
    height = imageHeight * 0.9
    width = height * cropRatio
  }

  width = Math.max(MIN_CROP_WIDTH, Math.min(width, imageWidth))
  height = width / cropRatio

  return {
    width,
    height,
    x: (imageWidth - width) / 2,
    y: (imageHeight - height) / 2,
  }
}

function moveCropRect(
  rect: CropRect,
  deltaX: number,
  deltaY: number,
  imageSize: { width: number; height: number },
): CropRect {
  return {
    ...rect,
    x: clamp(rect.x + deltaX, 0, imageSize.width - rect.width),
    y: clamp(rect.y + deltaY, 0, imageSize.height - rect.height),
  }
}

function resizeCropRect(
  rect: CropRect,
  handle: Exclude<CropHandle, 'move'>,
  deltaX: number,
  deltaY: number,
  imageSize: { width: number; height: number },
  cropRatio: number,
): CropRect {
  const direction = HANDLE_DIRECTIONS[handle]
  let widthDelta = 0
  let heightWidthDelta = 0

  if (direction.x !== 0) widthDelta = deltaX * direction.x
  if (direction.y !== 0) heightWidthDelta = deltaY * direction.y * cropRatio

  let selectedWidthDelta: number
  if (direction.x !== 0 && direction.y !== 0) {
    selectedWidthDelta = Math.abs(widthDelta) >= Math.abs(heightWidthDelta)
      ? widthDelta
      : heightWidthDelta
  } else {
    selectedWidthDelta = widthDelta || heightWidthDelta
  }

  let maxWidth = Math.min(imageSize.width, imageSize.height * cropRatio)
  if (direction.x > 0) maxWidth = Math.min(maxWidth, imageSize.width - rect.x)
  if (direction.x < 0) maxWidth = Math.min(maxWidth, rect.x + rect.width)
  if (direction.y > 0) maxWidth = Math.min(maxWidth, (imageSize.height - rect.y) * cropRatio)
  if (direction.y < 0) maxWidth = Math.min(maxWidth, (rect.y + rect.height) * cropRatio)

  const nextWidth = clamp(
    rect.width + selectedWidthDelta,
    Math.min(MIN_CROP_WIDTH, imageSize.width),
    maxWidth,
  )
  const nextHeight = nextWidth / cropRatio
  const anchorX = direction.x > 0
    ? rect.x
    : direction.x < 0
      ? rect.x + rect.width
      : rect.x + rect.width / 2
  const anchorY = direction.y > 0
    ? rect.y
    : direction.y < 0
      ? rect.y + rect.height
      : rect.y + rect.height / 2

  return {
    width: nextWidth,
    height: nextHeight,
    x: clamp(
      direction.x > 0
        ? anchorX
        : direction.x < 0
          ? anchorX - nextWidth
          : anchorX - nextWidth / 2,
      0,
      imageSize.width - nextWidth,
    ),
    y: clamp(
      direction.y > 0
        ? anchorY
        : direction.y < 0
          ? anchorY - nextHeight
          : anchorY - nextHeight / 2,
      0,
      imageSize.height - nextHeight,
    ),
  }
}

async function createCroppedFile(
  image: HTMLImageElement,
  imageLayout: { width: number; height: number },
  cropRect: CropRect,
  crop: CoverCropConfig,
  sourceFile: File,
): Promise<File> {
  const displayScaleX = image.naturalWidth / imageLayout.width
  const displayScaleY = image.naturalHeight / imageLayout.height
  const sourceX = cropRect.x * displayScaleX
  const sourceY = cropRect.y * displayScaleY
  const sourceWidth = cropRect.width * displayScaleX
  const sourceHeight = cropRect.height * displayScaleY

  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器不支持图片裁剪')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    crop.width,
    crop.height,
  )

  const qualities = [0.94, 0.9, 0.84, 0.78, 0.72, 0.66]
  let blob: Blob | null = null
  for (const quality of qualities) {
    blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (blob && blob.size <= 5 * 1024 * 1024) break
  }
  if (!blob || blob.size > 5 * 1024 * 1024) {
    throw new Error('裁剪后图片超过 5MB，请选择更清晰的图片')
  }

  const baseName = sourceFile.name.replace(/\.[^.]+$/, '') || 'cover'
  return new File(
    [blob],
    `${baseName}-${crop.width}x${crop.height}.jpg`,
    { type: 'image/jpeg' },
  )
}

export function CoverCropper({ open, file, crop, onCancel, onCropped }: CoverCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const objectUrlRef = useRef<string | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const cropRatio = crop.width / crop.height
  const imageLayout = useMemo(() => image ? getImageLayout(image) : null, [image])

  const resetImage = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setImage(null)
    setCropRect(null)
    setError('')
  }

  useEffect(() => {
    if (!open || !file) {
      resetImage()
      return
    }

    let active = true
    loadImage(file)
      .then(({ image: nextImage, objectUrl }) => {
        if (!active) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        objectUrlRef.current = objectUrl
        const layout = getImageLayout(nextImage)
        setImage(nextImage)
        setCropRect(getInitialCropRect(layout.width, layout.height, cropRatio))
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : '图片读取失败')
      })

    return () => {
      active = false
    }
  }, [cropRatio, file, open])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!imageLayout || !cropRect || event.button !== 0) return

    const handle = ((event.target as HTMLElement).dataset.handle ?? 'move') as CropHandle
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      handle,
      startRect: cropRect,
      startClientX: event.clientX,
      startClientY: event.clientY,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || !imageLayout) return

    const deltaX = event.clientX - drag.startClientX
    const deltaY = event.clientY - drag.startClientY
    if (drag.handle === 'move') {
      setCropRect(moveCropRect(drag.startRect, deltaX, deltaY, imageLayout))
      return
    }

    setCropRect(resizeCropRect(
      drag.startRect,
      drag.handle,
      deltaX,
      deltaY,
      imageLayout,
      cropRatio,
    ))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleOk = async () => {
    if (!image || !imageLayout || !cropRect || !file) {
      message.error('请先选择图片')
      return
    }

    setLoading(true)
    try {
      const cropped = await createCroppedFile(
        image,
        imageLayout,
        cropRect,
        crop,
        file,
      )
      await onCropped(cropped)
      onCancel()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '图片裁剪失败')
    } finally {
      setLoading(false)
    }
  }

  const handles: Array<{ key: CropHandle; style: CSSProperties }> = [
    { key: 'n', style: { top: -HANDLE_SIZE / 2, left: '15%', right: '15%', height: HANDLE_SIZE, cursor: 'ns-resize' } },
    { key: 's', style: { bottom: -HANDLE_SIZE / 2, left: '15%', right: '15%', height: HANDLE_SIZE, cursor: 'ns-resize' } },
    { key: 'w', style: { left: -HANDLE_SIZE / 2, top: '15%', bottom: '15%', width: HANDLE_SIZE, cursor: 'ew-resize' } },
    { key: 'e', style: { right: -HANDLE_SIZE / 2, top: '15%', bottom: '15%', width: HANDLE_SIZE, cursor: 'ew-resize' } },
    { key: 'nw', style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE, cursor: 'nwse-resize' } },
    { key: 'ne', style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE, cursor: 'nesw-resize' } },
    { key: 'sw', style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE, cursor: 'nesw-resize' } },
    { key: 'se', style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE, cursor: 'nwse-resize' } },
  ]

  return (
    <Modal
      title={`${crop.title ?? '封面'}裁剪`}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      width={680}
      okText="使用此裁剪"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
    >
      {error ? (
        <Typography.Text type="danger">{error}</Typography.Text>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {imageLayout && (
            <div
              style={{
                position: 'relative',
                width: imageLayout.width,
                height: imageLayout.height,
                overflow: 'hidden',
                background: '#111',
                alignSelf: 'center',
              }}
            >
              {image && (
                <img
                  src={image.src}
                  alt="待裁剪封面"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {cropRect && (
                <div
                  data-handle="move"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    position: 'absolute',
                    left: cropRect.x,
                    top: cropRect.y,
                    width: cropRect.width,
                    height: cropRect.height,
                    cursor: 'move',
                    touchAction: 'none',
                    border: '1px solid rgba(255,255,255,.95)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,.56)',
                  }}
                >
                  <div style={{ position: 'absolute', left: '33.333%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.32)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: '66.667%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.32)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: '33.333%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,.32)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: '66.667%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,.32)', pointerEvents: 'none' }} />

                  {handles.map(handle => (
                    <div
                      key={handle.key}
                      data-handle={handle.key}
                      style={{
                        position: 'absolute',
                        background: 'rgba(255,255,255,.95)',
                        borderRadius: 2,
                        ...handle.style,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <Typography.Text type="secondary">
            在原图上拖动裁剪框：拖动中间移动位置，拖动边缘/四角按固定比例等比调整大小。输出固定为 {crop.width} × {crop.height} px，JPG 格式，不超过 5MB。
          </Typography.Text>
        </Space>
      )}
    </Modal>
  )
}
