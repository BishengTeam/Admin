import type { Rule } from 'antd/es/form'

export function requiredRule(label: string): Rule {
  return { required: true, message: `请输入${label}` }
}

export function requiredSelectRule(label: string): Rule {
  return { required: true, message: `请选择${label}` }
}

export const phoneRule: Rule = {
  pattern: /^1[3-9]\d{9}$/,
  message: '请输入正确的手机号',
}

export const urlRule: Rule = {
  type: 'url',
  message: '请输入正确的URL地址',
}
