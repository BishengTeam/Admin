import { useEffect, useState } from 'react'
import { Card, Col, Row, Button, Modal, Form, Input, InputNumber, Switch, Space, Spin, Statistic, Tag, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/PageContainer'
import { usePermission } from '@/hooks/usePermission'
import { certificationService } from '@/services/certification'
import { formatPrice } from '@/utils/format'
import type { Certification, CertificationPayload, CertificationPlan } from '@/types/certification'

const { Text } = Typography

const VENDOR_ROUTE_MAP: Record<string, string> = {
  h3c: 'h3c',
  人社: 'renshe',
  renshe: 'renshe',
}

const VENDOR_EMOJI: Record<string, string> = {
  h3c: 'H',
  人社: '人',
  renshe: '人',
}

interface VendorCard { vendor: string; certifications: Certification[] }
interface VendorStats { total: number; active: number; publishedPlans: number; totalEnrolled: number }

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

      const vendorStats: Record<string, VendorStats> = {}
      await Promise.all(
        Object.entries(grouped).map(async ([vendor, certs]) => {
          let publishedPlans = 0
          let totalEnrolled = 0
          await Promise.all(
            certs.filter(c => c.is_active).map(async (c) => {
              try {
                const plans: CertificationPlan[] = await certificationService.listPlans(c.code)
                for (const p of plans) {
                  if (p.status === 'published') publishedPlans++
                  totalEnrolled += p.enrolled
                }
              } catch { /* plan API may not exist for all vendors */ }
            }),
          )
          vendorStats[vendor] = {
            total: certs.length,
            active: certs.filter(c => c.is_active).length,
            publishedPlans,
            totalEnrolled,
          }
        }),
      )
      setStats(vendorStats)
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

  const getVendorRoute = (vendor: string) => {
    const lower = vendor.toLowerCase()
    return VENDOR_ROUTE_MAP[lower] || VENDOR_ROUTE_MAP[vendor] || null
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
            const route = getVendorRoute(vendor)
            const emoji = VENDOR_EMOJI[vendor.toLowerCase()] || VENDOR_EMOJI[vendor] || vendor[0]
            return (
              <Col xs={24} lg={12} xl={8} key={vendor} style={{ marginBottom: 24 }}>
                <Card
                  hoverable
                  actions={route ? [
                    <Button key='enter' type='link' icon={<RightOutlined />} onClick={() => navigate(route)}>进入管理</Button>,
                  ] : undefined}
                >
                  <Card.Meta
                    avatar={<div style={{ fontSize: 24, backgroundColor: '#f0f5ff', width: 48, height: 48, lineHeight: '48px', textAlign: 'center', borderRadius: 10, color: '#1677ff', fontWeight: 700 }}>{emoji}</div>}
                    title={
                      <Space><Text strong style={{ fontSize: 16 }}>{vendor}</Text><Tag color={s?.active ? 'green' : 'default'}>{s?.active ?? 0} 启用 / {s?.total ?? 0}</Tag></Space>
                    }
                    description={
                      <Space direction='vertical' size={8} style={{ width: '100%' }}>
                        {s && (s.publishedPlans > 0 || s.totalEnrolled > 0) && (
                          <Row gutter={16}>
                            <Col span={12}><Statistic title='进行中批次' value={s.publishedPlans} valueStyle={{ fontSize: 20 }} /></Col>
                            <Col span={12}><Statistic title='总报名人次' value={s.totalEnrolled} valueStyle={{ fontSize: 20 }} /></Col>
                          </Row>
                        )}
                        {certifications.map((c) => (
                          <Row key={c.id} justify='space-between' align='middle' style={{ fontSize: 13, cursor: 'pointer' }} onClick={() => navigate(c.code)}>
                            <Col><Text type='secondary'>{c.code}</Text></Col>
                            <Col><Space size='small'><Text>{formatPrice(c.normal_price)}</Text><Text type='secondary'>/</Text><Text>{formatPrice(c.student_price)}</Text></Space></Col>
                            <Col><Tag color={c.is_active ? 'success' : 'default'}>{c.is_active ? '启用' : '禁用'}</Tag></Col>
                            {canWrite && <Col><Button type='link' size='small' onClick={(e) => { e.stopPropagation(); handleEdit(c) }}>编辑</Button></Col>}
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
            <Input placeholder='如： H3C、人社' />
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
