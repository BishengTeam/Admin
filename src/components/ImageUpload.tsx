import { useState } from 'react'
import { Upload, message } from 'antd'
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons'
import type { UploadFile, RcFile } from 'antd/es/upload/interface'

// TODO: 后续替换为 OSS 直传，当前仅做 Base64 预览

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
    return false
  }

  const handleChange = (info: { file: UploadFile }) => {
    if (info.file.originFileObj) {
      setLoading(true)
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result as string
        onChange?.(url)
        setLoading(false)
      }
      reader.readAsDataURL(info.file.originFileObj)
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
      onChange={handleChange}
    >
      {value ? (
        <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        uploadButton
      )}
    </Upload>
  )
}
