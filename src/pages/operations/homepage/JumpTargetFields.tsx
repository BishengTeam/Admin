import { Form, Input, Radio, Select, Typography } from 'antd'
import { BANNER_PAGE_GROUPS, EXTERNAL_LINK_HINT, externalLinkError, pageTargetError, pageTargetLabel } from '@/types/banner'
import type { BannerJumpMode } from '@/types/banner'

type ResourceMode = 'activity' | 'job'
interface Props {
  options: Record<ResourceMode, { label: string; value: number }[]>
  onSearch: Record<ResourceMode, (query: string) => void>
}

/** Banner与弹窗海报共用目标目录和保存校验。 */
export function JumpTargetFields({ options, onSearch }: Props) {
  const form = Form.useFormInstance()
  const mode = Form.useWatch('jump_mode', form) as BannerJumpMode
  const path = Form.useWatch('page_path', form) as string | undefined
  const current = path && !BANNER_PAGE_GROUPS.some(group => group.options.some(item => item.value === path))
    ? [{ label: '当前配置', options: [{ value: path, label: pageTargetLabel(path) || `${pageTargetError(path)}（${path}）`, disabled: Boolean(pageTargetError(path)) }] }]
    : []
  const resourceLabel = mode === 'activity' ? '活动' : '岗位'
  return <>
    <Form.Item name="jump_mode" label="点击跳转" initialValue="none">
      <Radio.Group options={[
        { label: '不跳转', value: 'none' }, { label: '页面', value: 'page' },
        { label: '指定活动', value: 'activity' }, { label: '指定岗位', value: 'job' },
        { label: '外部链接', value: 'link' },
      ]} optionType="button" buttonStyle="solid" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} />
    </Form.Item>
    {mode === 'page' && <Form.Item name="page_path" label="选择页面" rules={[{
      validator: (_, value) => {
        const error = pageTargetError(value)
        return error ? Promise.reject(new Error(error)) : Promise.resolve()
      },
    }]} extra={path && pageTargetError(path)
      ? <Typography.Text type="danger">{pageTargetError(path)}</Typography.Text>
      : path?.startsWith('/pages/mine/points') ? '积分入口按当前小程序版本开放范围展示。'
        : path?.startsWith('/pages/activity-zone/') ? '打开对应的活动、竞赛或就业标签；未开放的功能将提示暂未开放。'
          : '可按业务名称搜索，无需填写页面路径或参数。'}>
      <Select placeholder="搜索或选择页面" options={[...current, ...BANNER_PAGE_GROUPS]} showSearch optionFilterProp="label" />
    </Form.Item>}
    {(mode === 'activity' || mode === 'job') && <Form.Item name={`${mode}_id`} label={`选择${resourceLabel}`} rules={[{ required: true, message: `请选择${resourceLabel}` }]}>
      <Select placeholder={`输入关键词搜索${resourceLabel}`} showSearch filterOption={false} onSearch={onSearch[mode]} options={options[mode]} notFoundContent="输入关键词搜索" />
    </Form.Item>}
    {mode === 'link' && <Form.Item name="link_url" label="外部链接" extra={EXTERNAL_LINK_HINT} rules={[{
      validator: (_, value) => {
        const error = externalLinkError(value)
        return error ? Promise.reject(new Error(error)) : Promise.resolve()
      },
    }]}>
      <Input placeholder="https://www.ztyyx.cn/..." />
    </Form.Item>}
  </>
}
