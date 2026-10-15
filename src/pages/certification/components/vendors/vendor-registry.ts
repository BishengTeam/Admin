import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { CertType } from './type-registry'

export interface VendorTab {
  key: string
  label: string
  permission: string
  component: LazyExoticComponent<ComponentType<{ type: CertType }>>
}

export interface VendorProfile {
  type: CertType
  /** H3C 等按批次办理的业务默认进入批次列表，产品配置后置。 */
  batchFirst?: boolean
  productTabLabel?: string
  productComponent?: LazyExoticComponent<ComponentType<{ type: CertType }>>
  batchOverrides?: LazyExoticComponent<ComponentType<any>>
  batchFormExtra?: LazyExoticComponent<ComponentType<any>>
  tabs: VendorTab[]
}

const vendorRegistry: VendorProfile[] = [
  {
    type: 'h3c',
    batchFirst: true,
    productTabLabel: '产品设置',
    batchOverrides: lazy(() => import('./h3c/BatchOverrides')),
    batchFormExtra: lazy(() => import('./h3c/BatchFormExtra')),
    tabs: [
      {
        key: 'refund',
        label: '退款管理',
        permission: 'h3c:refund',
        component: lazy(() => import('./h3c/RefundTab')),
      },
    ],
  },
  {
    type: 'nisp',
    batchFirst: true,
    productTabLabel: '产品设置',
    batchOverrides: lazy(() => import('./nisp/BatchOverrides')),
    tabs: [
      {
        key: 'review',
        label: '报名审核',
        permission: 'nisp:review',
        component: lazy(() => import('./nisp/ReviewTab')),
      },
      {
        key: 'refund',
        label: '退款管理',
        permission: 'nisp:refund',
        component: lazy(() => import('./nisp/RefundTab')),
      },
    ],
  },
  {
    type: 'renshe',
    batchFirst: true,
    productTabLabel: '产品设置',
    productComponent: lazy(() => import('./renshe/ProjectTable')),
    batchOverrides: lazy(() => import('./renshe/BatchOverrides')),
    tabs: [
      {
        key: 'refund',
        label: '退款管理',
        permission: 'order:list',
        component: lazy(() => import('./renshe/RefundTab')),
      },
    ],
  },
  {
    type: 'sangfor',
    tabs: [],
  },
]

export function getVendorProfile(type: CertType): VendorProfile | undefined {
  return vendorRegistry.find((v) => v.type === type)
}
