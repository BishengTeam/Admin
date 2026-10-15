import { Suspense, useMemo } from 'react'
import { Spin, Tabs, Typography } from 'antd'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { useAuth } from '@/hooks/useAuth'
import { CERT_TYPE_META, type CertType } from './components/vendors/type-registry'
import { getVendorProfile } from './components/vendors/vendor-registry'
import ProductTable from './components/shared/ProductTable'
import PlanTable from './components/shared/PlanTable'

const { Text } = Typography

function hasPermission(permissions: string[], code?: string) {
  return !code || permissions.includes('*') || permissions.includes(code)
}

export default function TypeWorkbench({ type: typeProp }: { type?: string }) {
  const params = useParams<{ type: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const type = typeProp ?? params.type
  const meta = CERT_TYPE_META[type as CertType]
  const profile = getVendorProfile(type as CertType)
  const { permissions } = useAuth()

  const tabs = useMemo(() => {
    const authorizedTabs = profile?.tabs.filter(tab => hasPermission(permissions, tab.permission)) ?? []
    const items = profile?.batchFirst ? [] : [
      {
        key: 'products',
        label: '认证产品',
        children: <ProductTable type={type as CertType} />,
      },
    ]

    const plansTab = {
      key: 'plans',
      label: '批次管理',
      children: (
        <PlanTable
          type={type as CertType}
          overrides={profile?.batchOverrides ? <Suspense fallback={<Spin />}><profile.batchOverrides type={type as CertType} /></Suspense> : undefined}
        />
      ),
    }
    if (profile?.batchFirst) items.push(plansTab)
    else items.splice(1, 0, plansTab)

    if (profile) {
      for (const tab of authorizedTabs) {
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

    if (profile?.batchFirst) {
      items.push({
        key: 'products',
        label: profile.productTabLabel ?? '产品设置',
        children: profile.productComponent ? (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>}>
            <profile.productComponent type={type as CertType} />
          </Suspense>
        ) : (
          <ProductTable type={type as CertType} />
        ),
      })
    }

    return items
  }, [type, profile, permissions])

  if (!meta) return <Navigate to='/admin/certification' replace />

  return (
    <PageContainer title={`${meta.label}认证管理`}>
      <Tabs items={tabs} activeKey={tabs.some(tab => tab.key === searchParams.get('tab')) ? searchParams.get('tab')! : tabs[0]?.key} onChange={key => setSearchParams({ tab: key })} />
    </PageContainer>
  )
}
