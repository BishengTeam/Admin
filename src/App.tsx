import { useRoutes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { routes } from './routes'

export default function App() {
  return (
    <ErrorBoundary level="root">
      {useRoutes(routes)}
    </ErrorBoundary>
  )
}
