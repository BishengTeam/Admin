import { describe, expect, it } from 'vitest'
import { BANNER_PAGES, BANNER_PAGE_GROUPS, buildJumpLink, externalLinkError, pageTargetError, parseJumpMode, RETIRED_PAGE_ERROR } from '@/types/banner'

describe('marketing jump targets', () => {
  it('groups a limited set of business entries without parameter-dependent forms or retired courses', () => {
    // 2026-11.09 就业专区关闭：岗位页面/岗位详情跳转整体移除，新增英才计划标签页
    expect(BANNER_PAGE_GROUPS.map(group => group.label)).toEqual(['常用入口', '认证报名', '积分与权益', '活动与英才', '我的服务'])
    expect(new Set(BANNER_PAGES.map(page => page.value)).size).toBe(BANNER_PAGES.length)
    expect(BANNER_PAGES.length).toBeLessThan(30)
    expect(BANNER_PAGES.some(page => /course|\/form|order-detail|payment|employment/.test(page.value))).toBe(false)
    expect(BANNER_PAGES.find(page => page.label === '人社认证产品列表')?.value).toBe('/pages/registration/category?vendor=%E4%BA%BA%E7%A4%BE')
    expect(BANNER_PAGES.find(page => page.label === '英才计划')?.value).toBe('/pages/activity-zone/index?tab=yingcai')
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

  it('uses exact activity detail routes and validates IDs; job jump mode is retired', () => {
    expect(buildJumpLink({ jump_mode: 'activity', activity_id: 7 })).toBe('/pages/activity-zone/detail?id=7')
    expect(parseJumpMode('/pages/activity-zone/detail?id=7')).toEqual({ mode: 'activity', resourceId: 7 })
    expect(parseJumpMode('/pages/activity-zone/detail-other?id=7').mode).toBe('page')
    expect(() => buildJumpLink({ jump_mode: 'activity', activity_id: 0 })).toThrow('请选择活动')
    // 就业专区已关闭：遗留岗位详情链接按未配置页面回显，编辑时强制重新选择
    expect(parseJumpMode('/pages/employment-zone/detail?id=9')).toEqual({ mode: 'page', path: '/pages/employment-zone/detail?id=9' })
    expect(pageTargetError('/pages/employment-zone/detail?id=9')).toContain('重新选择')
  })

  it.each(['http://www.ztyyx.cn', 'https://evil.com', 'https://ztyyx.cn.evil.com', 'https://ztyyx.cn@evil.com', 'https://ztyyx.cn\\@evil.com', 'https://ztyyx.cn:8443', 'javascript:alert(1)', '/pages/course/detail?id=1'])('rejects invalid external link %s', url => {
    expect(externalLinkError(url)).toBeTruthy()
    expect(() => buildJumpLink({ jump_mode: 'link', link_url: url })).toThrow()
  })

  it.each(['https://ztyyx.cn', 'https://admin.ztyyx.cn/a?q=%26', 'https://mp.weixin.qq.com/s?id=123'])('accepts allowed external link %s', url => {
    expect(buildJumpLink({ jump_mode: 'link', link_url: ` ${url} ` })).toBe(url)
  })
})
