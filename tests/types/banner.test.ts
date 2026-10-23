import { describe, expect, it } from 'vitest'
import { BANNER_PAGES, BANNER_PAGE_GROUPS, buildJumpLink, externalLinkError, pageTargetError, parseJumpMode, RETIRED_PAGE_ERROR } from '@/types/banner'

describe('marketing jump targets', () => {
  it('groups a limited set of business entries without parameter-dependent forms or retired courses', () => {
    expect(BANNER_PAGE_GROUPS.map(group => group.label)).toEqual(['常用入口', '认证报名', '积分与权益', '活动与就业', '我的服务'])
    expect(new Set(BANNER_PAGES.map(page => page.value)).size).toBe(BANNER_PAGES.length)
    expect(BANNER_PAGES.length).toBeLessThan(30)
    expect(BANNER_PAGES.some(page => /course|\/form|order-detail|payment/.test(page.value))).toBe(false)
    expect(BANNER_PAGES.find(page => page.label === '人社认证产品列表')?.value).toBe('/pages/registration/category?vendor=%E4%BA%BA%E7%A4%BE')
  })

  it.each(BANNER_PAGES)('round-trips $label without losing target parameters', ({ value }) => {
    const parsed = parseJumpMode(value)
    expect(parsed).toEqual({ mode: 'page', path: value })
    expect(buildJumpLink({ jump_mode: 'page', page_path: parsed.path })).toBe(value)
  })

  it.each(['/pages/course/index', '/pages/mine/courses', '/pages/course/detail?id=7'])('preserves and blocks retired configuration %s', path => {
    expect(parseJumpMode(path)).toEqual({ mode: 'page', path })
    expect(pageTargetError(path)).toBe(RETIRED_PAGE_ERROR)
    expect(() => buildJumpLink({ jump_mode: 'page', page_path: path })).toThrow(RETIRED_PAGE_ERROR)
  })

  it('keeps valid older entries and blocks unconfigured paths rather than silently remapping them', () => {
    expect(buildJumpLink({ jump_mode: 'page', page_path: '/pages/h3c/index' })).toBe('/pages/h3c/index')
    expect(pageTargetError('/pages/registration/form')).toContain('重新选择')
    expect(buildJumpLink({ jump_mode: 'none', page_path: '/pages/course/index' })).toBeNull()
  })

  it('uses exact activity and job detail routes and validates IDs', () => {
    expect(buildJumpLink({ jump_mode: 'activity', activity_id: 7 })).toBe('/pages/activity-zone/detail?id=7')
    expect(buildJumpLink({ jump_mode: 'job', job_id: 9 })).toBe('/pages/employment-zone/detail?id=9')
    expect(parseJumpMode('/pages/activity-zone/detail?id=7')).toEqual({ mode: 'activity', resourceId: 7 })
    expect(parseJumpMode('/pages/activity-zone/detail-other?id=7').mode).toBe('page')
    expect(() => buildJumpLink({ jump_mode: 'job', job_id: 1.5 })).toThrow('请选择岗位')
  })

  it.each(['http://www.ztyyx.cn', 'https://evil.com', 'https://ztyyx.cn.evil.com', 'https://ztyyx.cn@evil.com', 'https://ztyyx.cn\\@evil.com', 'https://ztyyx.cn:8443', 'javascript:alert(1)', '/pages/course/detail?id=1'])('rejects invalid external link %s', url => {
    expect(externalLinkError(url)).toBeTruthy()
    expect(() => buildJumpLink({ jump_mode: 'link', link_url: url })).toThrow()
  })

  it.each(['https://ztyyx.cn', 'https://admin.ztyyx.cn/a?q=%26', 'https://mp.weixin.qq.com/s?id=123'])('accepts allowed external link %s', url => {
    expect(buildJumpLink({ jump_mode: 'link', link_url: ` ${url} ` })).toBe(url)
  })
})
