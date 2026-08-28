import { useState } from 'react'
import { Tabs } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import BannerTab from './BannerTab'
import ZoneTab from './ZoneTab'

export default function HomepageManagement() {
  const [activeKey, setActiveKey] = useState('banners')

  return (
    <PageContainer title="首页配置">
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'banners', label: '轮播图', children: <BannerTab /> },
          { key: 'zones', label: '专区卡片', children: <ZoneTab /> },
        ]}
      />
    </PageContainer>
  )
}
