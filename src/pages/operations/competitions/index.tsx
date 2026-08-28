import { useEffect, useState } from 'react'
import { Tabs } from 'antd'
import { PageContainer } from '@/components/PageContainer'
import { competitionAdminService } from '@/services/competition'
import type { Competition } from '@/types/competition'
import CompetitionTab from './CompetitionTab'
import RegistrationsTab from './RegistrationsTab'

export default function CompetitionManagement() {
  const [activeKey, setActiveKey] = useState('competitions')
  const [competitions, setCompetitions] = useState<Competition[]>([])

  useEffect(() => {
    competitionAdminService
      .list({ page: 1, page_size: 100 })
      .then((page) => setCompetitions(page.items))
      .catch(() => setCompetitions([]))
  }, [activeKey])

  return (
    <PageContainer title='竞赛管理'>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'competitions', label: '赛事管理', children: <CompetitionTab /> },
          { key: 'registrations', label: '报名名单', children: <RegistrationsTab competitions={competitions} /> },
        ]}
      />
    </PageContainer>
  )
}
