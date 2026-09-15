import { Tabs, type TabsProps } from 'antd'
import { useSearchParams } from 'react-router-dom'

interface UrlTabsProps {
  defaultActiveKey: string
  items: NonNullable<TabsProps['items']>
}

export function UrlTabs({ defaultActiveKey, items }: UrlTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedKey = searchParams.get('tab')
  const activeKey = requestedKey != null && items.some((item) => item?.key === requestedKey)
    ? requestedKey
    : defaultActiveKey

  const changeTab = (nextKey: string) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', nextKey)
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <Tabs
      activeKey={activeKey}
      onChange={changeTab}
      items={items}
      destroyOnHidden
    />
  )
}
