import { useEffect, useState } from 'react'
import { Tabs } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import { activityService } from '@/services/activity'
import ActivityTab from './ActivityTab'
import RegistrationsTab from './RegistrationsTab'

export interface ActivityManagementProps {
  /** 专区分类：activity=普通活动（活动管理），yingcai=英才计划活动（英才计划管理） */
  mode?: 'activity' | 'yingcai'
}

export default function ActivityManagement({ mode = 'activity' }: ActivityManagementProps) {
  const category = mode === 'yingcai' ? 'yingcai' : 'normal'
  const noun = mode === 'yingcai' ? '英才活动' : '活动'
  const [activeKey, setActiveKey] = useState('activities')
  const [activities, setActivities] = useState<{ id: number; title: string; max_participants: number }[]>([])

  useEffect(() => {
    activityService
      // 报名记录下拉只列本专区的活动（后端缺省排除英才，英才页传 category=yingcai）
      .list({ page: 1, page_size: 100, category })
      .then((page) => setActivities(page.items.map((a) => ({ id: a.id, title: a.title, max_participants: a.max_participants }))))
      .catch(() => setActivities([]))
  }, [activeKey, category])

  return (
    <PageContainer title={mode === 'yingcai' ? '英才计划管理' : '活动管理'}>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'activities', label: `${noun}列表`, children: <ActivityTab mode={mode} /> },
          { key: 'registrations', label: '报名记录', children: <RegistrationsTab activities={activities} category={category} /> },
        ]}
      />
    </PageContainer>
  )
}
