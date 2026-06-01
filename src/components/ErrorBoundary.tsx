import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button, Result } from 'antd'
import { captureError } from '@/core/sentry'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** 根级模式显示'系统异常'，页面级显示'页面加载失败' */
  level?: 'root' | 'page'
}

interface State {
  error: Error | null
}

/**
 * 全局/页面级错误边界。
 *
 * 使用 Class 组件是因为 React 目前不支持用函数组件实现错误边界
 * （componentDidCatch / getDerivedStateFromError 仅 Class 组件可用）。
 * React 官方文档建议在错误边界中使用 Class 组件：
 * https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary/${this.props.level ?? 'page'}]`,
      error.message,
      info.componentStack,
    )
    captureError(error, { componentStack: info.componentStack })
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }
      const isRoot = this.props.level === 'root'
      return (
        <Result
          status="error"
          title={isRoot ? '系统异常' : '页面加载失败'}
          subTitle={this.state.error.message}
          extra={
            <Button type="primary" onClick={isRoot ? this.handleReload : this.handleReset}>
              {isRoot ? '刷新页面' : '重试'}
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}
