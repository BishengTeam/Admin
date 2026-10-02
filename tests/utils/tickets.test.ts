import { describe, expect, it } from 'vitest'
import { parseQuizFeedbackQuestionId, parseTicketImages, stripTicketImageLine } from '@/utils/tickets'

describe('parseQuizFeedbackQuestionId', () => {
  it('extracts the question id from a quiz feedback ticket', () => {
    const content = [
      '【题目反馈】',
      '题目ID：1024',
      '题型：单选题',
      '题目：HTTP 默认端口是多少？',
      '说明：答案标注有误。',
    ].join('\n')
    expect(parseQuizFeedbackQuestionId(content)).toBe(1024)
  })

  it('supports half-width colon and surrounding spaces', () => {
    expect(parseQuizFeedbackQuestionId('【题目反馈】\n题目ID: 88\n说明：test')).toBe(88)
  })

  it('returns null for regular tickets or malformed feedback tickets', () => {
    expect(parseQuizFeedbackQuestionId('普通客服咨询')).toBeNull()
    expect(parseQuizFeedbackQuestionId(null)).toBeNull()
    expect(parseQuizFeedbackQuestionId(undefined)).toBeNull()
    expect(parseQuizFeedbackQuestionId('【题目反馈】\n题目ID：abc')).toBeNull()
    expect(parseQuizFeedbackQuestionId('【题目反馈】\n题目ID：0')).toBeNull()
  })
})

describe('parseTicketImages', () => {
  it('extracts image urls from the feedback protocol line', () => {
    const content = [
      '【意见反馈】',
      '类型：功能异常',
      '说明：支付结果页一直转圈。',
      '图片：/api/media/a01.jpg,/api/media/b02.png',
    ].join('\n')
    expect(parseTicketImages(content)).toEqual(['/api/media/a01.jpg', '/api/media/b02.png'])
  })

  it('supports half-width colon, chinese comma, and deduplicates urls', () => {
    const content = '【意见反馈】\n说明：test\n图片: /api/media/a01.webp，/api/media/a01.webp'
    expect(parseTicketImages(content)).toEqual(['/api/media/a01.webp'])
  })

  it('ignores non-image extensions and non-media urls', () => {
    const content = [
      '【意见反馈】',
      '说明：test',
      '图片：/api/media/a01.zip,/api/media/b02.pdf,https://evil.example/a.jpg,/etc/passwd.png',
    ].join('\n')
    expect(parseTicketImages(content)).toEqual([])
  })

  it('returns an empty array for tickets without images', () => {
    expect(parseTicketImages('【意见反馈】\n说明：test')).toEqual([])
    expect(parseTicketImages(null)).toEqual([])
    expect(parseTicketImages(undefined)).toEqual([])
  })
})

describe('stripTicketImageLine', () => {
  it('hides the protocol line but keeps the other content', () => {
    const content = [
      '【意见反馈】',
      '类型：产品建议',
      '说明：希望增加深色模式。',
      '图片：/api/media/a01.jpg',
    ].join('\n')
    expect(stripTicketImageLine(content)).toBe('【意见反馈】\n类型：产品建议\n说明：希望增加深色模式。')
  })

  it('returns an empty string for empty content', () => {
    expect(stripTicketImageLine(null)).toBe('')
    expect(stripTicketImageLine('图片：/api/media/a01.jpg')).toBe('')
  })
})
