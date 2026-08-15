import { useCallback, useEffect, useRef, useState } from 'react'
import { Form, Input, Modal, Typography, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { authService } from '@/services/auth'
import { getReauthToken, setReauthCredential } from '@/core/reauth'
import { isApiError } from '@/core/request'

const { Paragraph } = Typography

interface ReauthFormValues {
  password: string
}

export function useReauthentication() {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<ReauthFormValues>()
  const resolverRef = useRef<((token: string | null) => void) | null>(null)
  const promiseRef = useRef<Promise<string | null> | null>(null)

  const settle = useCallback((token: string | null) => {
    resolverRef.current?.(token)
    resolverRef.current = null
    promiseRef.current = null
    form.resetFields()
    setOpen(false)
  }, [form])

  useEffect(() => () => resolverRef.current?.(null), [])

  const ensureReauthenticated = useCallback((): Promise<string | null> => {
    const existing = getReauthToken()
    if (existing) return Promise.resolve(existing)
    if (promiseRef.current) return promiseRef.current

    setOpen(true)
    const pending = new Promise<string | null>((resolve) => {
      resolverRef.current = resolve
    })
    promiseRef.current = pending
    return pending
  }, [])

  const submit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      const result = await authService.reauthenticate(values.password)
      setReauthCredential(result.reauth_token, result.expires_in)
      settle(result.reauth_token)
    } catch (error) {
      message.error(isApiError(error) ? error.message : '身份验证失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const reauthDialog = (
    <Modal
      title="验证当前管理员身份"
      open={open}
      okText="验证"
      cancelText="取消"
      confirmLoading={submitting}
      maskClosable={false}
      destroyOnClose
      onOk={submit}
      onCancel={() => settle(null)}
    >
      <Paragraph type="secondary">
        此操作会影响管理员账号安全，请输入当前超级管理员密码。验证结果最多在当前页面内复用 10 分钟。
      </Paragraph>
      <Form<ReauthFormValues> form={form} layout="vertical">
        <Form.Item name="password" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
          <Input.Password
            prefix={<LockOutlined />}
            autoComplete="current-password"
            placeholder="输入当前密码"
            onPressEnter={() => void submit()}
          />
        </Form.Item>
      </Form>
    </Modal>
  )

  return { ensureReauthenticated, reauthDialog }
}
