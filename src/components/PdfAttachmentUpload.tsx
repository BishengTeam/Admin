import { useState } from 'react'
import { Button, Input, Space, Tooltip, Typography, Upload, message } from 'antd'
import {
  DeleteOutlined, FilePdfOutlined, LoadingOutlined, QuestionCircleOutlined,
} from '@ant-design/icons'
import type { RcFile } from 'antd/es/upload/interface'
import { competitionAdminService } from '@/services/competition'

export interface CompetitionAttachmentValue {
  title: string
  pages: string[]
}

interface PdfAttachmentUploadProps {
  value?: CompetitionAttachmentValue[]
  onChange?: (value: CompetitionAttachmentValue[]) => void
  disabled?: boolean
}

const HINT = (
  <div style={{ whiteSpace: 'pre-line' }}>
    {'在线查阅附件（如盖章邀请函、赛事大纲），小程序端可翻页查看、不能下载\n仅支持 PDF：≤ 20MB、≤ 30 页\n上传后服务端自动把每页转成图片，原件不再对外提供下载'}
  </div>
)

/** 赛事在线查阅附件：PDF 上传转页图，受控组件（配合 Form.Item 使用） */
export function PdfAttachmentUpload({ value, onChange, disabled }: PdfAttachmentUploadProps) {
  const [uploading, setUploading] = useState(false)

  const beforeUpload = (file: RcFile) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      message.error('只能上传 PDF 文件')
      return false
    }
    if (file.size / 1024 / 1024 >= 20) {
      message.error('PDF 大小不能超过 20MB')
      return false
    }
    return true
  }

  const customRequest = async (
    options: { file: RcFile; onSuccess: (body: unknown) => void; onError: (err: Error) => void },
  ) => {
    setUploading(true)
    try {
      const res = await competitionAdminService.uploadAttachment(options.file)
      onChange?.([...(value ?? []), { title: res.title, pages: res.pages }])
      message.success(`转换完成，共 ${res.page_count} 页`)
      options.onSuccess(res)
    } catch (err) {
      options.onError(err instanceof Error ? err : new Error('上传失败'))
      message.error(err instanceof Error ? err.message : '上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const renameAt = (index: number, title: string) => {
    onChange?.((value ?? []).map((att, i) => (i === index ? { ...att, title } : att)))
  }

  const removeAt = (index: number) => {
    onChange?.((value ?? []).filter((_, i) => i !== index))
  }

  return (
    <div>
      {value?.map((att, index) => (
        <Space.Compact key={`${index}-${att.pages[0] ?? ''}`} block style={{ marginBottom: 8 }}>
          <Input
            value={att.title}
            maxLength={64}
            placeholder='附件标题（展示在小程序详情页）'
            disabled={disabled}
            onChange={(e) => renameAt(index, e.target.value)}
          />
          <Button disabled style={{ width: 72 }}>
            {att.pages.length} 页
          </Button>
          <Button
            danger
            disabled={disabled}
            icon={<DeleteOutlined />}
            onClick={() => removeAt(index)}
            aria-label={`删除附件 ${att.title}`}
          />
        </Space.Compact>
      ))}
      <Space align='center'>
        <Upload
          accept=".pdf,application/pdf"
          showUploadList={false}
          disabled={disabled || uploading}
          beforeUpload={beforeUpload}
          customRequest={customRequest as never}
        >
          <Button type='dashed' icon={uploading ? <LoadingOutlined /> : <FilePdfOutlined />}>
            {uploading ? '转换中…' : '上传 PDF 附件'}
          </Button>
        </Upload>
        <Tooltip title={HINT}>
          <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} aria-label="附件要求说明" />
        </Tooltip>
        {value?.length ? (
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            考生可在详情页在线查看，无法下载原文件
          </Typography.Text>
        ) : null}
      </Space>
    </div>
  )
}
