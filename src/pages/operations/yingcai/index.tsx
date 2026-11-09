import ActivityManagement from '../activities'

/** 英才计划管理：与活动管理共用同一套列表/表单/报名组件，页面固定 category=yingcai（专区分类隔离）。 */
export default function YingcaiManagement() {
  return <ActivityManagement mode="yingcai" />
}
