import { describe, expect, it } from 'vitest'
import {
  refundErrorText,
  refundRetryDescription,
  registrationRefundStatus,
} from '@/utils/refund'

describe('refund recovery display', () => {
  it('explains provider error codes to operators', () => {
    expect(refundErrorText('WechatPayAPIError:NOT_ENOUGH/HTTP 403')).toContain(
      '商户可用余额不足',
    )
    expect(refundErrorText('WechatPayAPIError:RESOURCE_NOT_EXISTS/HTTP 404')).toContain(
      '微信侧暂无该退款单',
    )
    expect(refundErrorText('WechatPayAPIError')).toContain('未保存具体错误码')
  })

  it('derives a failed registration status from its active refund', () => {
    expect(registrationRefundStatus('refund_processing', {
      id: 2,
      status: 'failed',
      retry_count: 7055,
    })).toEqual({ text: '退款失败待重试', color: 'red' })
  })

  it('includes the retry count in the operator description', () => {
    expect(refundRetryDescription({
      id: 2,
      status: 'failed',
      last_error: 'WechatPayAPIError:NOT_ENOUGH/HTTP 403',
      retry_count: 7055,
    })).toContain('已重试 7055 次')
  })
})
