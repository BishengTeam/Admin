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

  it('allows cover images larger than the Nginx one-megabyte default', () => {
    const config = readFileSync(resolve(process.cwd(), 'nginx.conf.template'), 'utf8')
    expect(config).toContain('client_max_body_size 10m;')
  })

  it('allows local blob previews used by the cover cropper', () => {
    const config = readFileSync(resolve(process.cwd(), 'nginx.conf.template'), 'utf8')
    expect(config).toContain("img-src 'self' data: blob: https:")
    expect(config).not.toContain("img-src 'self' data: https:")

    const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8')
    expect(viteConfig).toContain("img-src 'self' data: blob: https:")
    expect(viteConfig).not.toContain("img-src 'self' data: https:")
  })

  it('allows direct uploads only to the configured private OSS bucket', () => {
    const ossOrigin = 'https://materials-20260817.oss-cn-chengdu.aliyuncs.com'
    for (const file of ['nginx.conf.template', 'nginx.conf', 'vite.config.ts']) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(source).toContain(`connect-src 'self' ${ossOrigin}`)
    }
  })

  it('gives course assets a higher upload limit before the generic admin proxy', () => {
    const config = readFileSync(resolve(process.cwd(), 'nginx.conf.template'), 'utf8')
    const courseAssets = config.match(/location\s+~\s+\^\/admin\/courses\/\[0-9\]\+\/assets\$\s*\{([\s\S]*?)\n\s*\}/)
    expect(courseAssets).not.toBeNull()
    expect(courseAssets?.[1]).toContain('client_max_body_size 210m;')
    expect(config.indexOf('location ~ ^/admin/courses/')).toBeLessThan(config.indexOf('location /admin/'))
  })
})
