import { UrlTabs } from './components/UrlTabs'
import QuizImports from './imports'
import QuizTaskMonitor from './tasks'

export default function QuizImportCenter() {
  return (
    <UrlTabs
      defaultActiveKey="imports"
      items={[
        { key: 'imports', label: '导入任务', children: <QuizImports /> },
        { key: 'tasks', label: '任务监控', children: <QuizTaskMonitor /> },
      ]}
    />
  )
}
