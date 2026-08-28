import { useEffect, useState } from 'react'
import { Tabs } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import { activityService } from '@/services/activity'
import ActivityTab from './ActivityTab'
import RegistrationsTab from './RegistrationsTab'

export default function ActivityManagement() {
  const [activeKey, setActiveKey] = useState('activities')
  const [activities, setActivities] = useState<{ id: number; title: string; max_participants: number }[]>([])

  useEffect(() => {
    activityService
      .list({ page: 1, page_size: 100 })
      .then((page) => setActivities(page.items.map((a) => ({ id: a.id, title: a.title, max_participants: a.max_participants }))))
      .catch(() => setActivities([]))
  }, [activeKey])

  return (
    <PageContainer title="活动管理">
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'activities', label: '活动列表', children: <ActivityTab /> },
          { key: 'registrations', label: '报名记录', children: <RegistrationsTab activities={activities} /> },
        ]}
      />
    </PageContainer>
  )
}
