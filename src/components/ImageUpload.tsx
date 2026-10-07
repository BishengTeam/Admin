import { useState } from 'react'
import { Tooltip, Upload, message } from 'antd'
import { PlusOutlined, LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { RcFile } from 'antd/es/upload/interface'
import { http } from '@/core/request'
import { CoverCropper, type CoverCropConfig } from '@/components/CoverCropper'

interface ImageUploadProps {
  value?: string
  onChange?: (url: string) => void
  maxSize?: number
  purpose?: 'generic' | 'quiz'
  /** 传入后先进入固定尺寸手动裁剪，再上传裁剪结果 */
  crop?: CoverCropConfig
  /** 悬浮提示：说明该图片在小程序端的显示尺寸与上传格式要求 */
  hint?: string
}

export function ImageUpload({
  value,
  onChange,
  maxSize = 5,
  purpose = 'generic',
  hint,
  crop,
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

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
    if (crop) {
      setPendingFile(file)
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
        // 后端规范地址为 /api/media/{file_id} 相对路径；管理端预览走同源代理，
        // 小程序端按 API 域名解析，避免把管理端域名固化进数据库。
        onChange?.(res.url)
      }
    } catch (err) {
      onError(err instanceof Error ? err : new Error('上传失败'))
      message.error('上传失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const uploadCropped = async (croppedFile: File) => {
    setLoading(true)
    try {
      if (purpose === 'quiz') {
        const { quizService } = await import('@/services/quiz')
        const target = await quizService.createImageUpload({
          filename: croppedFile.name,
          content_type: croppedFile.type,
          size_bytes: croppedFile.size,
        })
        await fetch(target.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': target.content_type },
          body: await croppedFile.arrayBuffer(),
        })
        onChange?.(target.public_url)
      } else {
        const formData = new FormData()
        formData.append('file', croppedFile)
        const res = await http.post<{ url: string }>('/admin/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        onChange?.(res.url)
      }
      message.success('封面上传完成')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败，请重试')
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
      {crop && (
        <CoverCropper
          open={Boolean(pendingFile)}
          file={pendingFile}
          crop={crop}
          onCancel={() => setPendingFile(null)}
          onCropped={uploadCropped}
        />
      )}
    </div>
  )
}
