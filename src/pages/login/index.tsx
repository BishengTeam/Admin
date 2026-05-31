import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Form, Input, Button, Card, message, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { requiredRule } from '@/utils/validator'

interface LoginForm {
  username: string
  password: string
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorAlert, setErrorAlert] = useState<string | null>(null)
  const [form] = Form.useForm<LoginForm>()
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin/dashboard'

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
      if (!axios.isAxiosError(error)) {
        return
      }
      const status = error.response?.status
      const detail: string | undefined = error.response?.data?.detail

      if (status === 401) {
        // 认证失败 → 字段级错误，用户视线无需离开表单
        form.setFields([
          { name: 'password', errors: [detail || '用户名或密码错误'] },
        ])
      } else if (status === 403) {
        // 账号禁用等 → 全局 Alert
        setErrorAlert(detail || '账号已被禁用，请联系管理员')
      } else if (status === 429) {
        // 频率限制 → 全局 Alert
        setErrorAlert(detail || '操作过于频繁，请稍后再试')
      } else if (!error.response) {
        // 无响应 → 网络错误，提供比 request.ts 默认消息更具体的信息
        message.error('网络连接失败，请检查网络')
      }
      // 其余错误（业务 code≠0 等）由 request.ts 拦截器的 message.error 处理
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
