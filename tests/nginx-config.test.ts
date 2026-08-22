import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('Admin nginx probes', () => {
  it.each(['health', 'ready'])('proxies /%s to Backend before SPA fallback', (endpoint) => {
    const config = readFileSync(resolve(process.cwd(), 'nginx.conf.template'), 'utf8')
    const block = config.match(new RegExp(`location\\s*=\\s*/${endpoint}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))

    expect(block, `missing exact /${endpoint} location`).not.toBeNull()
    expect(block?.[1]).toContain('proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};')
    expect(block?.[1]).not.toContain('try_files')
  })

  it('proxies local signed quiz downloads even for browser page requests', () => {
    const config = readFileSync(resolve(process.cwd(), 'nginx.conf.template'), 'utf8')
    const block = config.match(/location\s+~\s+\^\/admin\/quiz\/imports\/\[0-9\]\+\/\(report\|source\)\$\s*\{([\s\S]*?)\n\s*\}/)

    expect(block, 'missing signed quiz download proxy').not.toBeNull()
    expect(block?.[1]).toContain('proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};')
    expect(block?.[1]).not.toContain('rewrite ^ /index.html')
    expect(config.indexOf('location ~ ^/admin/quiz/imports/')).toBeLessThan(config.indexOf('location /admin/'))
  })

  it('allows course blob previews and direct uploads to the configured OSS bucket', () => {
    const ossOrigin = 'https://materials-20260817.oss-cn-chengdu.aliyuncs.com'
    for (const file of ['nginx.conf.template', 'nginx.conf', 'vite.config.ts']) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(source).toContain("img-src 'self' data: blob: https:")
      expect(source).toContain("media-src 'self' blob: https:")
      expect(source).toContain(`connect-src 'self' ${ossOrigin}`)
      expect(source).not.toContain("img-src 'self' data: https:")
    }
  })
})
