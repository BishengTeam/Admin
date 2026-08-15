import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { isApiError } from '@/core/request'
import { getAdminLandingPath } from '@/core/permission'
import type { ChangePasswordPayload } from '@/types/admin'

const { Paragraph, Text, Title } = Typography

interface PasswordFormValues extends ChangePasswordPayload {}

const passwordRules = [
  { required: true, message: '请输入新密码' },
  { min: 12, max: 128, message: '密码长度必须为 12～128 位' },
  {
    validator: (_: unknown, value?: string) => {
      if (!value || (/[A-Za-z]/.test(value) && /\d/.test(value))) return Promise.resolve()
      return Promise.reject(new Error('密码必须同时包含字母和数字'))
    },
  },
]

function passwordErrorMessage(error: unknown): string {
  return isApiError(error) ? error.message : '修改密码失败，请稍后重试'
}

export default function ChangePasswordPage() {
  const [form] = Form.useForm<PasswordFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const admin = useAuthStore((state) => state.admin)
  const mustChangePassword = useAuthStore((state) => state.mustChangePassword)
  const changePassword = useAuthStore((state) => state.changePassword)

  const submit = async (values: PasswordFormValues) => {
    setSubmitting(true)
    try {
      await changePassword(values)
      message.success('密码修改成功，请使用新密码重新登录')
      navigate('/admin/login', { replace: true })
    } catch (error) {
      message.error(passwordErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card style={{ width: '100%', maxWidth: 520, margin: mustChangePassword ? 0 : '0 auto' }}>
      <Title level={4}>{mustChangePassword ? '设置新密码' : '修改密码'}</Title>
      {mustChangePassword ? (
        <Alert
          type="warning"
          showIcon
          message="当前使用的是一次性临时密码"
          description="为保护管理员账号安全，完成密码修改并重新登录后才能访问后台业务功能。"
          style={{ marginBottom: 24 }}
        />
      ) : (
        <Paragraph type="secondary">修改成功后，该账号的全部现有会话都会失效，需要重新登录。</Paragraph>
      )}
      <Form<PasswordFormValues> form={form} layout="vertical" onFinish={submit}>
        <Form.Item
          name="current_password"
          label={mustChangePassword ? '当前临时密码' : '当前密码'}
          rules={[{ required: true, message: mustChangePassword ? '请输入当前临时密码' : '请输入当前密码' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            autoComplete="current-password"
            placeholder={mustChangePassword ? '输入当前临时密码' : '输入当前密码'}
          />
        </Form.Item>
        <Form.Item name="new_password" label="新密码" rules={passwordRules}>
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="输入新密码" />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="确认新密码"
          dependencies={['new_password']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator: (_, value) => value === getFieldValue('new_password')
                ? Promise.resolve()
                : Promise.reject(new Error('两次输入的新密码不一致')),
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="再次输入新密码" />
        </Form.Item>
        <Text type="secondary">
          密码需为 12～128 位且同时包含字母和数字，不能包含完整用户名，也不能与最近 5 次密码重复。
        </Text>
        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              确认修改
            </Button>
            {!mustChangePassword && (
              <Button onClick={() => navigate(getAdminLandingPath(admin?.role))}>取消</Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
