import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, DatePicker, Form, Input, Modal, Space, Tag, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { ImageUpload } from '@/components/ImageUpload'
import {
  consultationGroupService,
  type ConsultationGroupConfig,
} from '@/services/consultationGroup'
import { formatDate } from '@/utils/format'

interface ConsultationGroupDialogProps {
  open: boolean
  planId: number | null
  batchName: string
  onClose: () => void
  onChanged?: () => void
}

interface FormValues {
  qrcode_url?: string
  join_instructions?: string
  expires_at?: Dayjs | null
}

const STATUS_META: Record<string, { text: string; color: string }> = {
  configured: { text: '已配置', color: 'success' },
  expired: { text: '已过期', color: 'error' },
  not_configured: { text: '未配置', color: 'default' },
}

export function ConsultationGroupDialog({
  open,
  planId,
  batchName,
  onClose,
  onChanged,
}: ConsultationGroupDialogProps) {
  const [form] = Form.useForm<FormValues>()
  const [config, setConfig] = useState<ConsultationGroupConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(async () => {
    if (!planId) return
    setLoading(true)
    try {
      const result = await consultationGroupService.get(planId)
      setConfig(result)
      setRemoving(false)
      form.setFieldsValue({
        qrcode_url: result.qrcode_url,
        join_instructions: result.join_instructions || undefined,
        expires_at: result.expires_at ? dayjs(result.expires_at) : undefined,
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '读取咨询群配置失败')
      onClose()
    } finally {
      setLoading(false)
    }
  }, [form, onClose, planId])

  useEffect(() => {
    if (open) void load()
  }, [load, open])

  const save = async () => {
    if (!planId || !config) return
    const values = removing
      ? { qrcode_url: undefined, join_instructions: undefined, expires_at: undefined }
      : await form.validateFields()
    if (!removing && !values.qrcode_url) {
      message.warning('请上传咨询群二维码')
      return
    }

    setSaving(true)
    try {
      const result = await consultationGroupService.update(planId, {
        qrcode_url: removing ? null : values.qrcode_url,
        join_instructions: removing ? null : values.join_instructions?.trim() || null,
        expires_at: removing
          ? null
          : values.expires_at?.toISOString() || null,
        version: config.version,
      })
      message.success(removing ? '咨询群配置已移除' : '咨询群配置已保存')
      setConfig(result)
      setRemoving(false)
      form.setFieldsValue({
        qrcode_url: result.qrcode_url,
        join_instructions: result.join_instructions || undefined,
        expires_at: result.expires_at ? dayjs(result.expires_at) : undefined,
      })
      onChanged?.()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '咨询群配置保存失败')
      if (String(error).includes('已更新')) await load()
    } finally {
      setSaving(false)
    }
  }

  const status = config?.status || 'not_configured'
  const statusMeta = STATUS_META[status]

  return (
    <Modal
      title={`批次咨询群 · ${batchName}`}
      open={open}
      width={620}
      confirmLoading={saving}
      okText={removing ? '确认移除' : '保存配置'}
      onOk={save}
      onCancel={onClose}
      destroyOnClose
    >
      <Space direction='vertical' style={{ width: '100%' }} size={16}>
        <Space wrap>
          <Tag color={statusMeta.color}>{statusMeta.text}</Tag>
          {config?.updated_at && (
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>
              最近更新：{formatDate(config.updated_at)}
            </span>
          )}
        </Space>
        {status === 'expired' && (
          <Alert
            type='warning'
            showIcon
            message='当前二维码已过期，用户端不再展示图片；请替换二维码并核对有效期。'
          />
        )}

        <Form form={form} layout='vertical' disabled={loading || removing}>
          <Form.Item
            name='qrcode_url'
            label='咨询群二维码'
            rules={[{ required: true, message: '请上传二维码' }]}
            extra='建议上传正方形二维码并保留白色留边；已报名且符合条件的用户可见'
          >
            <ImageUpload
              hint={'小程序端以正方形展示\n建议 ≥ 640 × 640 px，PNG/JPG，≤ 5MB\n二维码需保留白色留边'}
            />
          </Form.Item>
          <Form.Item name='join_instructions' label='加群说明'>
            <Input.TextArea
              rows={3}
              maxLength={1000}
              showCount
              placeholder='例如：请使用微信扫码进入本批次咨询群，入群后备注姓名和报名编号。'
            />
          </Form.Item>
          <Form.Item
            name='expires_at'
            label='有效期'
            tooltip='选填。到期后用户端停止展示二维码；未填写表示系统不做定时失效判断'
          >
            <DatePicker showTime style={{ width: '100%' }} placeholder='可选截止时间' />
          </Form.Item>
        </Form>

        {config?.qrcode_url && (
          <Button
            danger
            type={removing ? 'primary' : 'default'}
            loading={saving && removing}
            onClick={() => setRemoving(current => !current)}
          >
            {removing ? '取消移除' : '移除咨询群'}
          </Button>
        )}
      </Space>
    </Modal>
  )
}
