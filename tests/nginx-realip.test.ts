import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const script = resolve(process.cwd(), 'docker-entrypoint.d/10-generate-realip.sh')

describe('nginx real_ip generation', () => {
  it('does not inject a comma list into a single directive', () => {
    const template = readFileSync(resolve(process.cwd(), 'nginx.conf.template'), 'utf8')

    expect(template).toContain('include /etc/nginx/realip.conf;')
    expect(template).not.toContain('set_real_ip_from ${REAL_IP_FROM}')
  })

  it('expands comma and space separated CIDRs into separate directives', () => {
    const dir = mkdtempSync(join(tmpdir(), 'realip-'))
    const output = join(dir, 'realip.conf')
    try {
      execFileSync('sh', [script], {
        env: {
          ...process.env,
          REALIP_CONF: output,
          REAL_IP_FROM: '127.0.0.1, 172.16.0.0/12 10.1.2.3',
        },
      })
      const generated = readFileSync(output, 'utf8')
      expect(generated).toContain('set_real_ip_from 127.0.0.1;')
      expect(generated).toContain('set_real_ip_from 172.16.0.0/12;')
      expect(generated).toContain('set_real_ip_from 10.1.2.3;')
      expect(generated).toContain('real_ip_header X-Forwarded-For;')
      expect(generated).not.toContain(',')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects invalid entries instead of writing them', () => {
    const dir = mkdtempSync(join(tmpdir(), 'realip-'))
    const output = join(dir, 'realip.conf')
    try {
      expect(() => execFileSync('sh', [script], {
        env: {
          ...process.env,
          REALIP_CONF: output,
          REAL_IP_FROM: '127.0.0.1; rm -rf /',
        },
        stdio: 'pipe',
      })).toThrow()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
