// Sentry 前端错误监控 — 代码准备
// 正式接入时：
//   1. npm install @sentry/react
//   2. 取消下方 import 和 initSentry 中的注释
//   3. 在 main.tsx 中调用 initSentry()
//   4. 配置 .env.production 中的 VITE_SENTRY_DSN

// import * as Sentry from '@sentry/react'

export function initSentry() {
  // Sentry.init({
  //   dsn: import.meta.env.VITE_SENTRY_DSN,
  //   environment: import.meta.env.MODE,
  //   tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  //   integrations: [
  //     Sentry.browserTracingIntegration(),
  //   ],
  // })
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  // Sentry.captureException(error, { extra: context })
  console.error('[Sentry placeholder]', error.message, context)
}
