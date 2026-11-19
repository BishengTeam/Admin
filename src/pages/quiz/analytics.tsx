import { UrlTabs } from './components/UrlTabs'
import QuizBehavior from './behavior'
import QuizStats from './stats'
import QuizStudentData from './student-data'

export default function QuizAnalytics() {
  return (
    <UrlTabs
      defaultActiveKey="overview"
      items={[
        { key: 'overview', label: '聚合统计', children: <QuizStats /> },
        { key: 'behavior', label: '用户行为', children: <QuizBehavior /> },
        { key: 'students', label: '学生数据', children: <QuizStudentData /> },
      ]}
    />
  )
}
