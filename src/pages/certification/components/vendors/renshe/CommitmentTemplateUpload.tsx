import { useEffect, useRef, useState } from 'react'
import { Button, Space, Typography, Upload } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { rensheService } from '@/services/renshe'
import type { RensheCommitmentTemplate } from '@/types/rensheProject'
import { downloadBlob } from '@/utils/download'

export default function CommitmentTemplateUpload({ value, onChange, disabled, downloadValue, canDownload = true, onBusyChange, showName = true, showPending = true }: {
  value?: RensheCommitmentTemplate; onChange?: (value: RensheCommitmentTemplate) => void; disabled?: boolean
  downloadValue?: RensheCommitmentTemplate | null; canDownload?: boolean; onBusyChange?: (busy: boolean) => void; showName?: boolean; showPending?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [uploaded, setUploaded] = useState(false)
  const lock = useRef(false)
  const generation = useRef(0)
  const busyChanged = useRef(onBusyChange); busyChanged.current = onBusyChange
  useEffect(() => () => { generation.current++; busyChanged.current?.(false) }, [])
  const download = downloadValue === undefined ? value : downloadValue
  return <Space direction='vertical' style={{ width: '100%' }}>
    <Space wrap>
      <Upload accept='.pdf,.docx' showUploadList={false} disabled={disabled || busy} beforeUpload={async file => {
        if (lock.current || disabled) return false
        setError(''); setUploaded(false)
        if (!file.size || file.size > 10 * 1024 * 1024 || !/\.(pdf|docx)$/i.test(file.name)) { setError('模板仅支持PDF／DOCX，文件不能为空，最大10 MB'); return false }
        const request = generation.current
        lock.current = true; setBusy(true); busyChanged.current?.(true)
        try {
          const result = await rensheService.uploadCommitmentTemplate(file)
          if (request !== generation.current) return false
          onChange?.({ ...result, size_bytes: result.size_bytes ?? file.size })
          setUploaded(true)
        } catch (reason) { if (request === generation.current) setError(reason instanceof Error ? reason.message : '模板上传失败，请重试') }
        finally { if (request === generation.current) { lock.current = false; setBusy(false); busyChanged.current?.(false) } }
        return false
      }}><Button icon={<UploadOutlined />} loading={busy} disabled={disabled}>{value ? '上传替换' : '上传模板'}</Button></Upload>
      {download && canDownload && <Button disabled={busy} icon={<DownloadOutlined />} onClick={async () => {
        if (lock.current) return
        const request = generation.current
        lock.current = true; setBusy(true); setError(''); busyChanged.current?.(true)
        try {
          const blob = await rensheService.downloadCommitmentTemplate(download.filename)
          if (request === generation.current) downloadBlob(blob, download.original_filename || download.filename)
        } catch (reason) { if (request === generation.current) setError(reason instanceof Error ? reason.message : '模板下载失败，请重试') }
        finally { if (request === generation.current) { lock.current = false; setBusy(false); busyChanged.current?.(false) } }
      }}>下载当前模板</Button>}
    </Space>
    {showName && <Typography.Text type='secondary'>{value?.original_filename || '暂无模板，可先保存产品草稿。'}</Typography.Text>}
    {uploaded && showPending && <Typography.Text type='warning'>文件已上传，保存后生效</Typography.Text>}
    {error && <Typography.Text type='danger' role='alert'>{error}</Typography.Text>}
  </Space>
}
