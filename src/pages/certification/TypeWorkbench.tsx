import { Suspense, useEffect, useMemo, useState } from 'react'
import { Select, Spin, Tabs, Typography } from 'antd'
import { Navigate, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { certProductService } from '@/services/certProduct'
import type { CertProduct } from '@/types/certProduct'
import { CERT_TYPE_META, type CertType } from './components/vendors/type-registry'
import { getVendorProfile } from './components/vendors/vendor-registry'
import ProductTable from './components/shared/ProductTable'
import PlanTable from './components/shared/PlanTable'

const { Text } = Typography

export default function TypeWorkbench({ type: typeProp }: { type?: string }) {
  const params = useParams<{ type: string }>()
  const type = typeProp ?? params.type
  const meta = CERT_TYPE_META[type as CertType]
  const profile = getVendorProfile(type as CertType)

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [products, setProducts] = useState<CertProduct[]>([])
  const canWrite = usePermission('content:write')
  const needsProductFilter = profile?.requiresProductFilter === true

  useEffect(() => {
    if (!needsProductFilter) return
    certProductService
      .list({ type: type as string, page: 1, page_size: 100 })
      .then((page) => setProducts(page.items))
      .catch(() => setProducts([]))
  }, [type, needsProductFilter])

  // 批次 Tab 需要选择产品
  const productFilter = needsProductFilter && canWrite ? (
    <Select
      placeholder='选择产品查看批次'
      allowClear
      style={{ width: 200 }}
      onChange={setSelectedProduct}
      value={selectedProduct || undefined}
      options={products.map((item) => ({
        label: `${item.code} · ${item.chinese_name}`,
        value: item.code,
      }))}
      showSearch
      filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
    />
  ) : null

  const tabs = useMemo(() => {
    const items = [
      { key: 'products', label: '认证产品', children: <ProductTable type={type as CertType} /> },
      {
        key: 'plans',
        label: '批次管理',
        children: (
          <PlanTable
            type={type as CertType}
            productCode={selectedProduct}
            overrides={profile?.batchOverrides ? <Suspense fallback={<Spin />}><profile.batchOverrides type={type as CertType} productCode={selectedProduct} /></Suspense> : undefined}
          />
        ),
      },
    ]

    if (profile) {
      for (const tab of profile.tabs) {
        items.push({
          key: tab.key,
          label: tab.label,
          children: (
            <Suspense fallback={<div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>}>
              <tab.component type={type as CertType} />
            </Suspense>
          ),
        })
      }
    }

    return items
  }, [type, profile, selectedProduct])

  if (!meta) return <Navigate to='/admin/certification' replace />

  return (
    <PageContainer
      title={`${meta.label}认证管理`}
      extra={productFilter}
    >
      <Tabs items={tabs} />
    </PageContainer>
  )
}
