import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Modal, Slider, Space, Typography, message } from 'antd'
import { ZoomInOutlined } from '@ant-design/icons'

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

interface ImageOffset {
  x: number
  y: number
}

const STAGE_WIDTH = 520

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败，请更换图片'))
    }
    image.src = url
  })
}

async function createCroppedFile(
  image: HTMLImageElement,
  offset: ImageOffset,
  zoom: number,
  crop: CoverCropConfig,
  sourceFile: File,
): Promise<File> {
  const stageHeight = Math.round(STAGE_WIDTH * crop.height / crop.width)
  const baseScale = Math.max(
    STAGE_WIDTH / image.naturalWidth,
    stageHeight / image.naturalHeight,
  )
  const displayedWidth = image.naturalWidth * baseScale * zoom
  const displayedHeight = image.naturalHeight * baseScale * zoom
  const sourceWidth = STAGE_WIDTH / displayedWidth * image.naturalWidth
  const sourceHeight = stageHeight / displayedHeight * image.naturalHeight
  const sourceX = -offset.x / displayedWidth * image.naturalWidth
  const sourceY = -offset.y / displayedHeight * image.naturalHeight

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
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= 5 * 1024 * 1024) break
  }
  if (!blob || blob.size > 5 * 1024 * 1024) {
    throw new Error('裁剪后图片超过 5MB，请选择更清晰的图片')
  }

  const baseName = sourceFile.name.replace(/\.[^.]+$/, '') || 'cover'
  return new File([blob], `${baseName}-${crop.width}x${crop.height}.jpg`, { type: 'image/jpeg' })
}

export function CoverCropper({ open, file, crop, onCancel, onCropped }: CoverCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<ImageOffset | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dragStart = useRef<ImageOffset | null>(null)

  const stageHeight = Math.round(STAGE_WIDTH * crop.height / crop.width)
  const displayedSize = useMemo(() => {
    if (!image) return null
    const baseScale = Math.max(
      STAGE_WIDTH / image.naturalWidth,
      stageHeight / image.naturalHeight,
    )
    return {
      width: image.naturalWidth * baseScale * zoom,
      height: image.naturalHeight * baseScale * zoom,
    }
  }, [image, stageHeight, zoom])

  const clampOffset = (next: ImageOffset, size: { width: number; height: number }): ImageOffset => ({
    x: Math.min(0, Math.max(STAGE_WIDTH - size.width, next.x)),
    y: Math.min(0, Math.max(stageHeight - size.height, next.y)),
  })

  useEffect(() => {
    if (!open || !file) {
      setImage(null)
      setZoom(1)
      setOffset(null)
      setError('')
      return
    }
    let active = true
    loadImage(file)
      .then(nextImage => {
        if (!active) return
        const baseScale = Math.max(
          STAGE_WIDTH / nextImage.naturalWidth,
          stageHeight / nextImage.naturalHeight,
        )
        const size = {
          width: nextImage.naturalWidth * baseScale,
          height: nextImage.naturalHeight * baseScale,
        }
        setImage(nextImage)
        setZoom(1)
        setOffset({
          x: (STAGE_WIDTH - size.width) / 2,
          y: (stageHeight - size.height) / 2,
        })
      })
      .catch(err => {
        if (!active) return
        setError(err instanceof Error ? err.message : '图片读取失败')
      })
    return () => { active = false }
  }, [file, open, stageHeight])

  const changeZoom = (value: number) => {
    if (!image) return
    const baseScale = Math.max(
      STAGE_WIDTH / image.naturalWidth,
      stageHeight / image.naturalHeight,
    )
    const size = {
      width: image.naturalWidth * baseScale * value,
      height: image.naturalHeight * baseScale * value,
    }
    setZoom(value)
    setOffset(current => clampOffset(
      current ?? { x: (STAGE_WIDTH - size.width) / 2, y: (stageHeight - size.height) / 2 },
      size,
    ))
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!offset) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { x: event.clientX - offset.x, y: event.clientY - offset.y }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || !displayedSize) return
    setOffset(clampOffset({
      x: event.clientX - dragStart.current.x,
      y: event.clientY - dragStart.current.y,
    }, displayedSize))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleOk = async () => {
    if (!image || !offset) return
    setLoading(true)
    try {
      if (!file) {
        message.error('请先选择图片')
        return
      }
      const cropped = await createCroppedFile(image, offset, zoom, crop, file)
      await onCropped(cropped)
      onCancel()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '图片裁剪失败')
    } finally {
      setLoading(false)
    }
  }

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
          <div
            style={{
              position: 'relative',
              width: STAGE_WIDTH,
              height: stageHeight,
              overflow: 'hidden',
              background: '#111',
              cursor: offset ? 'grab' : 'default',
              touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {image && offset && displayedSize && (
              <img
                src={image.src}
                alt="待裁剪封面"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: offset.x,
                  top: offset.y,
                  width: displayedSize.width,
                  height: displayedSize.height,
                  userSelect: 'none',
                  pointerEvents: 'none',
                  maxWidth: 'none',
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.16) 1px, transparent 1px)',
                backgroundSize: `${STAGE_WIDTH / 3}px ${stageHeight / 3}px`,
              }}
            />
          </div>

          <Space size={12} wrap>
            <ZoomInOutlined />
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.01}
              onChange={changeZoom}
              style={{ width: 320 }}
              tooltip={{ formatter: value => `${Math.round((value ?? 1) * 100)}%` }}
            />
          </Space>

          <Typography.Text type="secondary">
            拖动图片调整位置，拖动滑杆缩放。输出固定为 {crop.width} × {crop.height} px，JPG 格式，不超过 5MB。
          </Typography.Text>
        </Space>
      )}
    </Modal>
  )
}
