import type { ReactNode } from 'react'
import { Button, Layout, message, Typography } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const { Content, Header } = Layout
const { Text } = Typography

export default function RestrictedSessionLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const admin = useAuthStore((state) => state.admin)
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      message.warning('服务端未确认会话撤销，本地登录信息已清除；如有安全风险，请联系超级管理员处理。')
    } finally {
      navigate('/admin/login', { replace: true })
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <Text strong>{import.meta.env.VITE_APP_TITLE || '运营管理后台'}</Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Text>{admin?.display_name || admin?.username}</Text>
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
        </div>
      </Header>
      <Content
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#f5f5f5',
        }}
      >
        {children}
      </Content>
    </Layout>
  )
}
