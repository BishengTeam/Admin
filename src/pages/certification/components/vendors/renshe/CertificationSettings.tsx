import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, Switch, Typography, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { ImageUpload } from '@/components/ImageUpload'
import { usePermission } from '@/hooks/usePermission'
import { certProductService } from '@/services/certProduct'
import type { CertProduct } from '@/types/certProduct'

const { Text } = Typography

interface SettingsFormValues {
  chinese_name: string
  description: string
  home_cover_url: string
  is_active: boolean
}

export default function CertificationSettings() {
  const canWrite = usePermission('content:write')
  const [item, setItem] = useState<CertProduct | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<SettingsFormValues>()

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const result = await certProductService.get('RS-ZY')
      setItem(result)
      form.setFieldsValue({
        chinese_name: result.chinese_name,
        description: result.description ?? '',
        home_cover_url: result.home_cover_url ?? '',
        is_active: result.is_active,
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载人社认证设置失败')
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const result = await certProductService.update('RS-ZY', {
        chinese_name: values.chinese_name.trim(),
        description: values.description.trim() || null,
        home_cover_url: values.home_cover_url || null,
        is_active: values.is_active,
      })
      setItem(result)
      message.success('人社认证设置已保存')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存人社认证设置失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      title='认证设置'
      extra={(
        <>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void loadSettings()}>
            刷新
          </Button>
          {canWrite && (
            <Button type='primary' style={{ marginLeft: 8 }} loading={saving} onClick={() => void save()}>
              保存
            </Button>
          )}
        </>
      )}
    >
      <Alert
        style={{ marginBottom: 24 }}
        type='info'
        showIcon
        message='认证设置只影响对外展示'
        description='职业、等级、考试类型和申报类型由每个批次保存。停用后不能发起新报名，已有报名仍可查询、补正、审核、导出和退款。'
      />
      <div style={{ maxWidth: 720 }}>
        <Form form={form} layout='vertical' disabled={!canWrite}>
          <Form.Item
            name='chinese_name'
            label='展示名称'
            rules={[{ required: true, whitespace: true, message: '请输入展示名称' }]}
          >
            <Input maxLength={128} showCount />
          </Form.Item>
          <Form.Item name='description' label='认证介绍'>
            <Input.TextArea rows={4} maxLength={512} showCount />
          </Form.Item>
          <Form.Item name='home_cover_url' label='首页封面'>
            {canWrite ? (
              <ImageUpload
                crop={{ width: 1404, height: 640, title: '首页认证封面', fixed: true }}
                hint='小程序首页认证专区封面；建议 1404 × 640。'
              />
            ) : (
              item?.home_cover_url
                ? <img src={item.home_cover_url} alt='首页认证封面' style={{ maxWidth: '100%' }} />
                : <Text type='secondary'>未上传封面</Text>
            )}
          </Form.Item>
          <Form.Item name='is_active' label='启用状态' valuePropName='checked'>
            <Switch checkedChildren='开放新报名' unCheckedChildren='停用新报名' />
          </Form.Item>
        </Form>
      </div>
    </Card>
  )
}
