import { useEffect, useState } from 'react'
import { Card, Col, Row, Button, Modal, Form, Input, InputNumber, Switch, Space, Spin, Tag, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { certificationService } from '@/services/certification'
import { formatPrice } from '@/utils/format'
import type { Certification, CertificationPayload } from '@/types/certification'

const { Text } = Typography

interface VendorCard { vendor: string; certifications: Certification[] }
interface VendorStats { total: number; active: number }

const defaultFormValues: CertificationPayload = { code: '', vendor: '', normal_price: 0, student_price: 0, is_active: true }

export default function CertificationOverview() {
  const navigate = useNavigate()
  const canWrite = usePermission('content:write')
  const [vendors, setVendors] = useState<VendorCard[]>([])
  const [stats, setStats] = useState<Record<string, VendorStats>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Certification | null>(null)
  const [form] = Form.useForm<CertificationPayload>()

  const loadData = async () => {
    setLoading(true)
    try {
      let page = 1
      let allItems: Certification[] = []
      while (true) {
        const result = await certificationService.list({ page, page_size: 100 })
        allItems.push(...result.items)
        if (allItems.length >= result.total) break
        page += 1
      }
      const grouped: Record<string, Certification[]> = {}
      for (const item of allItems) {
        const v = item.vendor || '其他'
        if (!grouped[v]) grouped[v] = []
        grouped[v].push(item)
      }
      const cardList = Object.entries(grouped).map(([vendor, certs]) => ({ vendor, certifications: certs }))
      setVendors(cardList)
      setStats(
        Object.fromEntries(
          Object.entries(grouped).map(([vendor, certs]) => [
            vendor,
            { total: certs.length, active: certs.filter((c) => c.is_active).length },
          ]),
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleAdd = () => { setEditingItem(null); form.resetFields(); form.setFieldsValue(defaultFormValues); setModalOpen(true) }
  const handleEdit = (item: Certification) => { setEditingItem(item); form.setFieldsValue({ code: item.code, vendor: item.vendor, normal_price: item.normal_price, student_price: item.student_price, is_active: item.is_active }); setModalOpen(true) }

  const handleModalOk = async () => {
    const values = await form.validateFields()
    if (editingItem) { await certificationService.update(editingItem.id, values); message.success('更新成功') }
    else { await certificationService.create(values); message.success('创建成功') }
    setModalOpen(false)
    loadData()
  }

  return (
    <PageContainer
      title='认证管理'
      extra={[
        <Button key='refresh' icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>,
        canWrite ? <Button key='create' type='primary' icon={<PlusOutlined />} onClick={handleAdd}>新增认证</Button> : null,
      ]}
    >
      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          {vendors.map(({ vendor, certifications }) => {
            const s = stats[vendor]
            return (
              <Col xs={24} lg={12} xl={8} key={vendor} style={{ marginBottom: 24 }}>
                <Card hoverable actions={[
                  <Button key='enter' type='link' icon={<RightOutlined />} onClick={() => navigate('h3c')}>进入管理</Button>,
                ]}>
                  <Card.Meta
                    avatar={{ style: { fontSize: 28, backgroundColor: '#f5f5f5', width: 48, height: 48, lineHeight: '48px', textAlign: 'center', borderRadius: 8 }, children: vendor[0] }}
                    title={
                      <Space><Text strong style={{ fontSize: 16 }}>{vendor}</Text><Tag color={s?.active ? 'green' : 'default'}>{s?.active ?? 0} 启用 / {s?.total ?? 0}</Tag></Space>
                    }
                    description={
                      <Space direction='vertical' size={4} style={{ width: '100%' }}>
                        {certifications.map((c) => (
                          <Row key={c.id} justify='space-between' align='middle' style={{ fontSize: 13 }}>
                            <Col><Text type='secondary'>{c.code}</Text></Col>
                            <Col><Space size='small'><Text>{formatPrice(c.normal_price)}</Text><Text type='secondary'>/</Text><Text>{formatPrice(c.student_price)}</Text></Space></Col>
                            <Col><Tag color={c.is_active ? 'success' : 'default'}>{c.is_active ? '启用' : '禁用'}</Tag></Col>
                            {canWrite && <Col><Button type='link' size='small' onClick={() => handleEdit(c)}>编辑</Button></Col>}
                          </Row>
                        ))}
                      </Space>
                    } />
                </Card>
              </Col>
            )
          })}
        </Row>
      </Spin>
      <Modal title={editingItem ? '编辑认证' : '新增认证'} open={modalOpen} onOk={handleModalOk} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout='vertical' initialValues={defaultFormValues} style={{ marginTop: 16 }}>
          <Text type='secondary' style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>认证标识</Text>
          <div style={{ height: 1, background: '#f0f0f0', margin: '8px 0 20px' }} />
          <Form.Item name='code' label='认证代码' rules={[{ required: true, message: '请输入认证代码' }, { whitespace: true, message: '认证代码不能只含空格' }]}>
            <Input placeholder='如： H3CNE-2026' />
          </Form.Item>
          <Form.Item name='vendor' label='厂商' rules={[{ required: true, message: '请输入厂商' }]}>
            <Input placeholder='如： H3C、深信服' />
          </Form.Item>
          <Text type='secondary' style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>定价</Text>
          <div style={{ height: 1, background: '#f0f0f0', margin: '8px 0 20px' }} />
          <Row gutter={16}>
            <Col span={12}><Form.Item name='normal_price' label='普通价格' rules={[{ required: true, message: '请输入普通价格' }]}><InputNumber min={0} precision={0} addonAfter='分' style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name='student_price' label='学生价格' rules={[{ required: true, message: '请输入学生价格' }]}><InputNumber min={0} precision={0} addonAfter='分' style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Text type='secondary' style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>状态</Text>
          <div style={{ height: 1, background: '#f0f0f0', margin: '8px 0 20px' }} />
          <Form.Item name='is_active' label='上架状态' valuePropName='checked'><Switch checkedChildren='上架' unCheckedChildren='下架' /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
