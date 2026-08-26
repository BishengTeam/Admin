import { useState } from 'react'
import { Upload, message } from 'antd'
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons'
import type { RcFile, UploadFile } from 'antd/es/upload/interface'
import { http } from '@/core/request'

interface MultiImageUploadProps {
  value?: string[]
  onChange?: (urls: string[]) => void
  maxCount?: number
  maxSize?: number
}

export function MultiImageUpload({ value = [], onChange, maxCount = 9, maxSize = 5 }: MultiImageUploadProps) {
  const [loading, setLoading] = useState(false)

  const beforeUpload = (file: RcFile) => {
    if (!file.type.startsWith('image/')) {
      message.error('只能上传图片文件')
      return false
    }
    if (file.size / 1024 / 1024 >= maxSize) {
      message.error(`图片大小不能超过 ${maxSize}MB`)
      return false
    }
    return true
  }

  const customRequest = async (options: { file: RcFile; onSuccess: (body: { url: string }) => void; onError: (err: Error) => void }) => {
    const { file, onSuccess, onError } = options
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await http.post<{ url: string }>('/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess({ url: res.url })
      onChange?.([...value, res.url].slice(0, maxCount))
    } catch (err) {
      onError(err instanceof Error ? err : new Error('上传失败'))
      message.error('上传失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const fileList: UploadFile[] = value.map((url) => ({ uid: url, name: url.split('/').pop() || url, status: 'done', url }))

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  )

  return (
    <Upload
      listType="picture-card"
      fileList={fileList}
      maxCount={maxCount}
      beforeUpload={beforeUpload}
      customRequest={customRequest as never}
      onRemove={(file) => onChange?.(value.filter((url) => url !== file.url))}
      accept="image/*"
    >
      {value.length >= maxCount ? null : uploadButton}
    </Upload>
  )
}
