import { Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { Spin } from 'antd'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { routes } from './routes'

export default function App() {
  return (
    <ErrorBoundary level="root">
      <Suspense
        fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Spin size="large" />
          </div>
        }
      >
        {useRoutes(routes)}
      </Suspense>
    </ErrorBoundary>
  )
}
