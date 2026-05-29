import type { ReactNode } from 'react'
import { Card, Typography, Space } from 'antd'

const { Title } = Typography

interface PageContainerProps {
  title: string
  extra?: ReactNode
  children: ReactNode
}

export function PageContainer({ title, extra, children }: PageContainerProps) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
        {extra && <Space>{extra}</Space>}
      </div>
      <Card>{children}</Card>
    </div>
  )
}
