import { Outlet } from 'react-router-dom'
import { Layout, Typography } from 'antd'

const { Content } = Layout
const { Title, Text } = Typography

export default function LoginLayout() {
  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#fff', marginBottom: 4 }}>
            {import.meta.env.VITE_APP_TITLE}
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.75)' }}>{import.meta.env.VITE_APP_SUBTITLE}</Text>
        </div>
        <Outlet />
      </Content>
    </Layout>
  )
}
