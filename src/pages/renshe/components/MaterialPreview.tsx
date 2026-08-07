import { useState } from 'react'
import { Button, Empty, Image, Modal, Space, Typography, message } from 'antd'
import { DownloadOutlined, EyeOutlined, FilePdfOutlined, PictureOutlined } from '@ant-design/icons'
import type { RensheSignedUrl } from '@/types/renshe'

const { Text } = Typography

interface MaterialPreviewProps {
  available: boolean
  filename?: string | null
  isPdf?: boolean
  getSignedUrl: (download: boolean) => Promise<RensheSignedUrl>
}

export default function MaterialPreview({
  available,
  filename,
  isPdf = false,
  getSignedUrl,
}: MaterialPreviewProps) {
  const [previewing, setPreviewing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  if (!available) return <Text type="secondary">未提交</Text>

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const result = await getSignedUrl(false)
      setPreviewUrl(result.url)
    } catch {
      message.error('获取预览地址失败')
    } finally {
      setPreviewing(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const result = await getSignedUrl(true)
      const link = document.createElement('a')
      link.href = result.url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      if (filename) link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      message.error('获取下载地址失败')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Space size={4} wrap>
        {isPdf ? <FilePdfOutlined /> : <PictureOutlined />}
        {filename && <Text ellipsis style={{ maxWidth: 180 }}>{filename}</Text>}
        <Button type="link" size="small" icon={<EyeOutlined />} loading={previewing} onClick={handlePreview}>
          预览
        </Button>
        <Button type="link" size="small" icon={<DownloadOutlined />} loading={downloading} onClick={handleDownload}>
          下载
        </Button>
      </Space>

      <Modal
        title={filename || '材料预览'}
        open={Boolean(previewUrl)}
        onCancel={() => setPreviewUrl(null)}
        footer={null}
        width={isPdf ? '90vw' : 880}
        destroyOnClose
      >
        {previewUrl ? (
          isPdf ? (
            <iframe
              title={filename || 'PDF 材料'}
              src={previewUrl}
              style={{ width: '100%', height: '75vh', border: 0 }}
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '75vh', overflow: 'auto' }}>
              <Image src={previewUrl} alt={filename || '审核材料'} style={{ maxHeight: '70vh', objectFit: 'contain' }} />
            </div>
          )
        ) : (
          <Empty />
        )}
      </Modal>
    </>
  )
}
