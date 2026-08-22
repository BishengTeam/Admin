/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === 'build' ? [{
      name: 'html-inject-csp',
      transformIndexHtml(html: string) {
        return html.replace(
          '<head>',
          `<head>
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
                 img-src 'self' data: blob: https:;
                 connect-src 'self' https://materials-20260817.oss-cn-chengdu.aliyuncs.com;
                 frame-src 'self' https:;
                 font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" />`,
        )
      },
    }] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
}))
