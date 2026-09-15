import { UrlTabs } from './components/UrlTabs'
import QuizLibraries from './libraries'
import QuizV2Workbench from './v2-workbench'

export default function QuizWorkbench() {
  return (
    <UrlTabs
      defaultActiveKey="content"
      items={[
        { key: 'content', label: '内容工作台', children: <QuizV2Workbench /> },
        { key: 'libraries', label: '题库管理', children: <QuizLibraries /> },
      ]}
    />
  )
}
