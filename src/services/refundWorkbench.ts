import { certificationService } from '@/services/certification'
import { h3cService } from '@/services/h3c'
import { nispService, type NispRefund } from '@/services/nisp'
import { rensheService } from '@/services/renshe'
import { sangforService, type SangforRefund } from '@/services/sangfor'
import type { PageData, PageParams } from '@/types/api'
import type { H3cRefund } from '@/types/h3c'
import type { RensheRefund } from '@/types/renshe'

export type RefundVendor = 'h3c' | 'nisp' | 'renshe' | 'sangfor'

export interface RefundWorkbenchRecord {
  paymentChannel?: string
  id: number
  registrationId: number
  orderId: number
  outTradeNo: string | null
  requestKind: string
  reasonCode: string
  reasonDetail: string | null
  amountCents: number | null
  amountSource?: SangforRefund['amount_source']
  status: string
  requestedAt: string
  approvedAt: string | null
  outRefundNo: string | null
  processingAt: string | null
  succeededAt: string | null
  lastError: string | null
  retryCount: number
  candidateName: string | null
  registrationNo: string | null
  batchId: number | null
  batchName: string | null
  productLabel: string | null
  dueAt?: string | null
  rejectionReason?: string | null
}

export interface RefundWorkbenchParams extends PageParams {
  registration_id?: number
  batch_id?: number
  group?: 'pending' | 'processing' | 'abnormal'
  keyword?: string
  request_kind?: string
  reason_code?: string
  requested_at_start?: string
  requested_at_end?: string
  status?: string
}

function fromH3c(row: H3cRefund): RefundWorkbenchRecord {
  return {
    id: row.id,
    paymentChannel: row.payment_channel,
    registrationId: row.registration_id,
    orderId: row.order_id,
    outTradeNo: row.out_trade_no ?? null,
    requestKind: row.request_kind,
    reasonCode: row.reason_code,
    reasonDetail: row.reason_detail,
    amountCents: row.amount_cents,
    status: row.status,
    requestedAt: row.requested_at ?? row.created_at,
    approvedAt: row.approved_at,
    outRefundNo: row.out_refund_no,
    processingAt: row.processing_at,
    succeededAt: row.succeeded_at,
    lastError: row.last_error,
    retryCount: row.retry_count,
    candidateName: row.candidate_name ?? null,
    registrationNo: row.registration_no ?? null,
    batchId: row.batch_id ?? null,
    batchName: row.batch_name ?? null,
    productLabel: row.product_label ?? null,
  }
}

function fromNisp(row: NispRefund): RefundWorkbenchRecord {
  return {
    id: row.id,
    paymentChannel: row.payment_channel,
    registrationId: row.registration_id,
    orderId: row.order_id,
    outTradeNo: row.out_trade_no ?? null,
    requestKind: row.request_kind,
    reasonCode: row.reason_code,
    reasonDetail: row.reason_detail,
    amountCents: row.amount_cents,
    status: row.status,
    requestedAt: row.requested_at,
    approvedAt: row.approved_at,
    outRefundNo: row.out_refund_no,
    processingAt: row.processing_at,
    succeededAt: row.succeeded_at,
    lastError: row.last_error,
    retryCount: row.retry_count,
    candidateName: row.candidate_name ?? null,
    registrationNo: row.registration_no ?? null,
    batchId: row.batch_id ?? null,
    batchName: row.batch_name ?? null,
    productLabel: row.product_label ?? null,
  }
}

function fromRenshe(row: RensheRefund): RefundWorkbenchRecord {
  return {
    id: row.id,
    paymentChannel: row.payment_channel,
    registrationId: row.application_id,
    orderId: row.order_id,
    outTradeNo: row.out_trade_no ?? null,
    requestKind: row.request_kind,
    reasonCode: row.reason_code,
    reasonDetail: row.reason_detail,
    amountCents: row.amount_cents,
    status: row.status,
    requestedAt: row.requested_at,
    approvedAt: row.decided_at ?? null,
    outRefundNo: row.out_refund_no ?? null,
    processingAt: row.processing_at ?? null,
    succeededAt: row.succeeded_at,
    lastError: row.last_error,
    retryCount: row.retry_count,
    candidateName: row.candidate_name ?? null,
    registrationNo: row.registration_no ?? null,
    batchId: row.batch_id ?? null,
    batchName: row.batch_name ?? null,
    productLabel: row.product_label ?? null,
    dueAt: row.due_at,
    rejectionReason: row.rejection_reason,
  }
}

function fromSangfor(row: SangforRefund): RefundWorkbenchRecord {
  return {
    id: row.id, paymentChannel: row.payment_channel, registrationId: row.registration_id,
    orderId: row.order_id, outTradeNo: row.out_trade_no, requestKind: row.request_kind,
    reasonCode: row.request_kind, reasonDetail: row.reason_detail, amountCents: row.amount_cents, amountSource: row.amount_source,
    status: row.status, requestedAt: row.requested_at, approvedAt: row.approved_at,
    outRefundNo: null, processingAt: null, succeededAt: row.succeeded_at,
    lastError: row.last_error, retryCount: 0, candidateName: row.candidate_name,
    registrationNo: row.registration_no, batchId: row.batch_id, batchName: row.batch_name,
    productLabel: row.product_label,
  }
}

export const refundWorkbenchService = {
  normalize(
    vendor: RefundVendor,
    row: H3cRefund | NispRefund | RensheRefund | SangforRefund,
  ): RefundWorkbenchRecord {
    if (vendor === 'h3c') return fromH3c(row as H3cRefund)
    if (vendor === 'nisp') return fromNisp(row as NispRefund)
    if (vendor === 'sangfor') return fromSangfor(row as SangforRefund)
    return fromRenshe(row as RensheRefund)
  },

  async list(
    vendor: RefundVendor,
    params: RefundWorkbenchParams,
  ): Promise<PageData<RefundWorkbenchRecord>> {
    if (vendor === 'h3c') {
      const result = await h3cService.listRefunds(params)
      return { ...result, items: result.items.map(fromH3c) }
    }
    if (vendor === 'nisp') {
      const result = await nispService.listRefunds(params)
      return { ...result, items: result.items.map(fromNisp) }
    }
    if (vendor === 'sangfor') {
      const result = await sangforService.refunds({ ...params })
      return { ...result, items: result.items.map(fromSangfor) }
    }
    const { registration_id, ...paramsWithoutRegistration } = params
    const result = await rensheService.listRefunds({
      ...paramsWithoutRegistration,
      application_id: registration_id,
      plan_id: params.batch_id,
    })
    return { ...result, items: result.items.map(fromRenshe) }
  },

  async batchOptions(
    vendor: RefundVendor,
  ): Promise<Array<{ value: number; label: string }>> {
    if (vendor === 'h3c') {
      const result = await h3cService.listBatches({ page: 1, page_size: 100 })
      return result.items.map(item => ({ value: item.id, label: item.name }))
    }
    if (vendor === 'nisp') {
      const result = await nispService.listBatches({ page: 1, page_size: 100 })
      return result.items.map(item => ({ value: item.id, label: item.plan_name }))
    }
    if (vendor === 'sangfor') {
      return (await sangforService.refundBatches()).map(item => ({ value: item.id, label: item.name }))
    }
    const items = await certificationService.listPlans('RS-ZY')
    return items.map(item => ({ value: item.id, label: item.name }))
  },
}
