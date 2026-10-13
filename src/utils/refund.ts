export interface ActiveRefundLike {
  id: number
  status: string
  out_refund_no?: string | null
  last_error?: string | null
  retry_count?: number
}

export function refundErrorText(error?: string | null): string {
  if (!error) return '-'
  if (error === 'WechatPayAPIError') return '微信退款接口拒绝，历史记录未保存具体错误码'
  if (error.includes('NOT_ENOUGH')) return '微信商户可用余额不足，充值后将按退避策略自动重试'
  if (error.includes('RESOURCE_NOT_EXISTS') || error.includes('REFUND_NOT_EXIST')) {
    return '微信侧暂无该退款单，系统会使用原退款单号重试'
  }
  if (error.includes('RESOURCE_ALREADY_EXISTS')) return '微信侧已存在同号退款单，等待对账确认'
  if (error.includes('FREQUENCY_LIMITED')) return '微信退款接口限流，稍后自动重试'
  if (error.includes('SYSTEM_ERROR')) return '微信系统繁忙，稍后自动重试'
  if (error.includes('WechatRefundStatus:ABNORMAL')) return '微信退款状态异常，需人工核对'
  if (error.includes('WechatRefundStatus:CLOSED')) return '微信退款单已关闭，需重新发起'
  return error
}

export function registrationRefundStatus(
  status: string,
  activeRefund?: ActiveRefundLike | null,
): { text: string; color: string } {
  if (activeRefund?.status === 'failed') {
    return { text: '退款失败待重试', color: 'red' }
  }
  const statusLabels: Record<string, { text: string; color: string }> = {
    pending_payment: { text: '待支付', color: 'orange' },
    pending_review: { text: '待初审', color: 'blue' },
    rejected_awaiting_resubmission: { text: '待补正', color: 'red' },
    pending_refund_confirmation: { text: '待退款确认', color: 'volcano' },
    refund_processing: { text: '退款中', color: 'processing' },
    approved: { text: '初审通过', color: 'green' },
    final_approved: { text: '终审通过', color: 'cyan' },
    refunded_closed: { text: '已退款关闭', color: 'default' },
    cancelled: { text: '已取消', color: 'default' },
  }
  if (activeRefund?.status === 'processing' && status === 'pending_refund_confirmation') {
    return { text: '退款中', color: 'processing' }
  }
  if (activeRefund?.status === 'requested' && status === 'refund_processing') {
    return { text: '待退款确认', color: 'volcano' }
  }
  return statusLabels[status] ?? { text: status, color: 'default' }
}

export function refundRetryDescription(activeRefund?: ActiveRefundLike | null): string | null {
  if (!activeRefund) return null
  const retryCount = activeRefund.retry_count ?? 0
  if (activeRefund.status === 'failed') {
    return `${refundErrorText(activeRefund.last_error)}；已重试 ${retryCount} 次`
  }
  if (activeRefund.status === 'processing') {
    return `微信处理中；已对账 ${retryCount} 次`
  }
  return null
}
