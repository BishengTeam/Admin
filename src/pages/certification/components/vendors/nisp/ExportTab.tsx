import { useState } from 'react'
import { Button, Card, Select, Space, Typography, message } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { nispService } from '@/services/nisp'

export default function NispExportTab() {
  const [batchId, setBatchId] = useState<number | undefined>()
  const [level, setLevel] = useState<string>('1')
  const { data, loading } = usePagination(
    (page) => nispService.listBatches(page),
    [],
  )

  const handleExport = () => {
    if (!batchId) {
      message.warning('请选择批次')
      return
    }
    const url = nispService.getExportUrl(batchId, level)
    window.open(url, '_blank')
  }

  return (
    <Card>
      <Typography.Title level={5}>按 NISP 报名表格式导出 Excel</Typography.Title>
      <Typography.Paragraph type='secondary'>
        选择批次和级别，导出所有已审核通过的报名记录。Excel 格式与 NISP报名表.xlsx 模板一致。
      </Typography.Paragraph>

      <Space wrap style={{ marginTop: 16 }}>
        <Select
          placeholder="选择考试批次"
          style={{ minWidth: 240 }}
          value={batchId}
          onChange={setBatchId}
          loading={loading}
          options={(data?.items ?? []).map((b) => ({
            value: b.id,
            label: `${b.plan_name}（${b.level === '1' ? '一级' : '二级'}）`,
          }))}
        />
        <Select
          value={level}
          onChange={setLevel}
          style={{ width: 120 }}
          options={[
            { value: '1', label: 'NISP一级' },
            { value: '2', label: 'NISP二级' },
          ]}
        />
        <Button type='primary' icon={<DownloadOutlined />} onClick={handleExport}>
          导出 Excel
        </Button>
      </Space>

      <Typography.Paragraph type='secondary' style={{ marginTop: 24 }}>
        <ul>
          <li>NISP一级：12 列（姓名/拼音/专业/学校/身份证/手机/邮箱/省份/培训种类/身份证双面/寸照）</li>
          <li>NISP二级：20 列（一级 + 培训机构/考试类型/性别/年龄/学历/地址/邮编/学籍报告/申请表）</li>
          <li>仅导出状态为「审核通过」的报名记录</li>
        </ul>
      </Typography.Paragraph>
    </Card>
  )
}
