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
  batchOverrides?: LazyExoticComponent<ComponentType<any>>
  batchFormExtra?: LazyExoticComponent<ComponentType<any>>
  tabs: VendorTab[]
}

const vendorRegistry: VendorProfile[] = [
  {
    type: 'h3c',
    batchOverrides: lazy(() => import('./h3c/BatchOverrides')),
    batchFormExtra: lazy(() => import('./h3c/BatchFormExtra')),
    tabs: [
      {
        key: 'review',
        label: '报名审核',
        permission: 'h3c:review',
        component: lazy(() => import('./h3c/ReviewTab')),
      },
      {
        key: 'refund',
        label: '退款',
        permission: 'h3c:refund',
        component: lazy(() => import('./h3c/RefundTab')),
      },
      {
        key: 'export',
        label: '导出',
        permission: 'h3c:export',
        component: lazy(() => import('./h3c/ExportTab')),
      },
    ],
  },
  {
    type: 'renshe',
    batchOverrides: lazy(() => import('./renshe/BatchOverrides')),
    tabs: [
      {
        key: 'review',
        label: '报名审核',
        permission: 'user:list',
        component: lazy(() => import('./renshe/ApplicationTab')),
      },
      {
        key: 'refund',
        label: '退款',
        permission: 'order:list',
        component: lazy(() => import('./renshe/RefundTab')),
      },
      {
        key: 'export',
        label: '导出',
        permission: 'user:list',
        component: lazy(() => import('./renshe/ExportTab')),
      },
    ],
  },
]

export function getVendorProfile(type: CertType): VendorProfile | undefined {
  return vendorRegistry.find((v) => v.type === type)
}
