import { Suspense, useMemo, useState } from 'react'
import { Select, Spin, Tabs, Typography } from 'antd'
import { Navigate, useParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { certProductService } from '@/services/certProduct'
import { CERT_TYPE_META, type CertType } from './components/vendors/type-registry'
import { getVendorProfile } from './components/vendors/vendor-registry'
import ProductTable from './components/shared/ProductTable'
import PlanTable from './components/shared/PlanTable'

const { Text } = Typography

export default function TypeWorkbench() {
  const { type } = useParams<{ type: string }>()
  const meta = CERT_TYPE_META[type as CertType]
  const profile = getVendorProfile(type as CertType)

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const canWrite = usePermission('content:write')

  // 批次 Tab 需要选择产品
  const productFilter = canWrite ? (
    <Select
      placeholder='选择产品查看批次'
      allowClear
      style={{ width: 200 }}
      onChange={setSelectedProduct}
      value={selectedProduct || undefined}
      options={undefined} // TODO: 从 ProductTable 数据获取或独立请求
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
