import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Form, Input, Button, Card, message, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import type { LoginError } from '@/services/auth'
import { useAuthStore } from '@/stores/authStore'
import { requiredRule } from '@/utils/validator'

interface LoginForm {
  username: string
  password: string
}

interface LoginLocationState {
  from?: { pathname: string }
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorAlert, setErrorAlert] = useState<string | null>(null)
  const [form] = Form.useForm<LoginForm>()
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  const locationState = location.state as LoginLocationState
  const from = locationState?.from?.pathname || '/admin/dashboard'

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true)
    setErrorAlert(null)
    // 每次提交前清除上一次的字段错误
    form.setFields([
      { name: 'username', errors: [] },
      { name: 'password', errors: [] },
    ])
    try {
      await login(values.username, values.password)
      navigate(from, { replace: true })
    } catch (error) {
      const loginError = error as LoginError

      if (loginError.type === 'unauthorized') {
        // 认证失败 → 字段级错误，用户视线无需离开表单
        form.setFields([
          { name: 'password', errors: [loginError.message] },
        ])
      } else if (loginError.type === 'network') {
        // 网络错误 → toast 提示
        message.error(loginError.message)
      } else {
        // forbidden / rate_limited / unknown → 全局 Alert
        setErrorAlert(loginError.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ width: 400, borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32, fontSize: 20, fontWeight: 600 }}>
        管理员登录
      </h2>
      {errorAlert && (
        <Alert
          type="error"
          message={errorAlert}
          closable
          onClose={() => setErrorAlert(null)}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form form={form} onFinish={handleSubmit} size="large">
        <Form.Item name="username" rules={[requiredRule('用户名')]}>
          <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete="username" />
        </Form.Item>
        <Form.Item name="password" rules={[requiredRule('密码')]}>
          <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="current-password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
