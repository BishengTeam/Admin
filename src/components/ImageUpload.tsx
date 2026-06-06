import { useState } from 'react'
import { Upload, message } from 'antd'
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons'
import type { UploadFile, RcFile } from 'antd/es/upload/interface'
import { http } from '@/core/request'

interface ImageUploadProps {
  value?: string
  onChange?: (url: string) => void
  maxSize?: number
}

export function ImageUpload({ value, onChange, maxSize = 5 }: ImageUploadProps) {
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
      const formData = new FormData()
      formData.append('file', file)
      const res = await http.post<{ url: string }>('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess({ url: res.url })
      onChange?.(res.url)
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
  )
}