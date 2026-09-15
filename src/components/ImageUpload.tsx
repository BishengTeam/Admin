import { useState } from 'react'
import { Tooltip, Upload, message } from 'antd'
import { PlusOutlined, LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { UploadFile, RcFile } from 'antd/es/upload/interface'
import { http } from '@/core/request'
import { toAbsoluteMediaUrl } from '@/utils/mediaUrl'

interface ImageUploadProps {
  value?: string
  onChange?: (url: string) => void
  maxSize?: number
  purpose?: 'generic' | 'quiz'
  /** 悬浮提示：说明该图片在小程序端的显示尺寸与上传格式要求 */
  hint?: string
}

export function ImageUpload({ value, onChange, maxSize = 5, purpose = 'generic', hint }: ImageUploadProps) {
  const [loading, setLoading] = useState(false)

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片文件')
      return false
    }
    const isLtLimit = file.size / 1024 / 1024 < maxSize
    if (!isLtLimit) {
      message.error(`图片大小不能超过 ${maxSize}MB`)
      return false
    }
    return true // 允许通过 antd Upload 组件上传
  }

  const customRequest = async (options: { file: RcFile; onSuccess: (body: { url: string }) => void; onError: (err: Error) => void }) => {
    const { file, onSuccess, onError } = options
    setLoading(true)
    try {
      if (purpose === 'quiz') {
        const { quizService } = await import('@/services/quiz')
        const target = await quizService.createImageUpload({
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
        })
        await fetch(target.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': target.content_type },
          body: await file.arrayBuffer(),
        })
        onSuccess({ url: target.public_url })
        onChange?.(target.public_url)
      } else {
        const formData = new FormData()
        formData.append('file', file)
        const res = await http.post<{ url: string }>('/admin/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        onSuccess({ url: res.url })
        onChange?.(toAbsoluteMediaUrl(res.url))
      }
    } catch (err) {
      onError(err instanceof Error ? err : new Error('上传失败'))
      message.error('上传失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <Upload
        listType="picture-card"
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={customRequest as never}
      >
        {value ? (
          <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          uploadButton
        )}
      </Upload>
      {hint && (
        <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{hint}</div>}>
          <QuestionCircleOutlined style={{ marginTop: 4, color: '#8c8c8c', fontSize: 16, cursor: 'help' }} aria-label="图片要求说明" />
        </Tooltip>
      )}
    </div>
  )
}
