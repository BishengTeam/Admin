import { useEffect, useMemo, useState } from 'react'
import { Button, Col, Divider, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined, SafetyCertificateOutlined, UnlockOutlined } from '@ant-design/icons'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useAuth } from '@/hooks/useAuth'
import { certProductService } from '@/services/certProduct'
import type { CertCatalogItem, CertPriceUserType, CertProduct, CertProductCreatePayload, CertProductPrice, CertProductUpdatePayload } from '@/types/certProduct'
import { CERT_TYPE_META, type CertType } from '../vendors/type-registry'
import { formatPrice } from '@/utils/format'

const { Text } = Typography

interface ProductTableProps {
  type: CertType
}

type ProductFormValues = Omit<CertProductCreatePayload, 'prices' | 'sort_order'> & {
  student_price_yuan?: number
  normal_price_yuan?: number
}

const defaultFormValues: ProductFormValues = {
  type: '',
  catalog_id: null,
  code: '',
  name: '',
  chinese_name: '',
  description: '',
  is_active: true,
}

const priceOf = (item: CertProduct, userType: CertPriceUserType): number | null =>
  item.prices?.find((p) => p.user_type === userType)?.price_cents ?? null

const buildPrices = (values: ProductFormValues): CertProductPrice[] => {
  const prices: CertProductPrice[] = []
  if (values.student_price_yuan !== undefined && values.student_price_yuan !== null) {
    prices.push({ user_type: 'student', price_cents: Math.round(values.student_price_yuan * 100) })
  }
  if (values.normal_price_yuan !== undefined && values.normal_price_yuan !== null) {
    prices.push({ user_type: 'normal', price_cents: Math.round(values.normal_price_yuan * 100) })
  }
  return prices
}

const displayNameFromCode = (code: string): string => code.toLowerCase().replace(/-/g, '_')

export default function ProductTable({ type }: ProductTableProps) {
  const canWrite = usePermission('content:write')
  const { admin } = useAuth()
  const isSuperAdmin = admin?.role === 'super_admin'
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CertProduct | null>(null)
  const [customCode, setCustomCode] = useState(false)
  const [catalog, setCatalog] = useState<CertCatalogItem[]>([])
  const [selectedCatalog, setSelectedCatalog] = useState<CertCatalogItem | null>(null)
  const [form] = Form.useForm<ProductFormValues>()

  const { data, loading, pagination, refresh } = usePagination(
    (params) => certProductService.list({ type, ...params }),
    [type],
  )

  const typeMeta = CERT_TYPE_META[type]

  const loadCatalog = () => {
    certProductService.getCatalog(type).then(setCatalog).catch(() => setCatalog([]))
  }

  useEffect(() => {
    loadCatalog()
  }, [type])

  /** 可选目录 = 未创建为产品的目录项；编辑时额外包含当前编码 */
  const codeOptions = useMemo(() => {
    return catalog
      .filter((item) => !item.instantiated || (editingItem && item.code === editingItem.code))
      .map((item) => ({
        label: `${item.code} · ${item.name}`,
        value: item.code,
      }))
  }, [catalog, editingItem])

  const handleAdd = () => {
    setEditingItem(null)
    setSelectedCatalog(null)
    setCustomCode(false)
    form.resetFields()
    form.setFieldsValue({ ...defaultFormValues, type })
    loadCatalog()
    setModalOpen(true)
  }

  const handleEdit = (item: CertProduct) => {
    setEditingItem(item)
    setSelectedCatalog(catalog.find((c) => c.code === item.code) ?? null)
    setCustomCode(false)
    const student = priceOf(item, 'student')
    const normal = priceOf(item, 'normal')
    form.setFieldsValue({
      catalog_id: null,
      code: item.code,
      name: item.name,
      chinese_name: item.chinese_name,
      description: item.description ?? '',
      is_active: item.is_active,
      student_price_yuan: student !== null ? student / 100 : undefined,
      normal_price_yuan: normal !== null ? normal / 100 : undefined,
    })
    setModalOpen(true)
  }

  const handleCodeChange = (code: string) => {
    const item = catalog.find((c) => c.code === code) ?? null
    setSelectedCatalog(item)
    if (item) {
      form.setFieldsValue({
        catalog_id: item.id,
        chinese_name: item.name,
        name: displayNameFromCode(code),
      })
    }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    const prices = buildPrices(values)
    if (editingItem) {
      const { type: _t, code: _c, catalog_id: _ci, student_price_yuan: _s, normal_price_yuan: _n, ...updateData } = values
      const payload: CertProductUpdatePayload = { ...updateData, prices }
      await certProductService.update(editingItem.code, payload)
      message.success('更新成功')
    } else {
      const payload = { ...values, prices, catalog_id: customCode ? null : values.catalog_id ?? null }
      await certProductService.create(payload)
      message.success('创建成功')
    }
    setModalOpen(false)
    refresh()
    loadCatalog()
  }

  const handleDeactivate = async (item: CertProduct) => {
    await certProductService.deactivate(item.code)
    message.success('已下架')
    refresh()
  }

  const renderPrice = (record: CertProduct, userType: CertPriceUserType) => {
    const cents = priceOf(record, userType)
    return cents === null ? <Tag>未配置</Tag> : <Text strong>{formatPrice(cents)}</Text>
  }

  const columns: ColumnsType<CertProduct> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '产品编码', dataIndex: 'code', width: 110 },
    { title: '名称', dataIndex: 'chinese_name', ellipsis: true },
    { title: '学生价', width: 100, render: (_, record) => renderPrice(record, 'student') },
    { title: '普通价', width: 100, render: (_, record) => renderPrice(record, 'normal') },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (v: string | null) => v || '-' },
    {
      title: '状态', dataIndex: 'is_active', width: 90,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', width: canWrite ? 160 : 80,
      render: (_, record) => (
        <Space size={0}>
          {canWrite && <Button type='link' size='small' onClick={() => handleEdit(record)}>编辑</Button>}
          {canWrite && record.is_active && (
            <Button type='link' size='small' danger onClick={() => handleDeactivate(record)}>下架</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          {canWrite && <Button type='primary' icon={<PlusOutlined />} onClick={handleAdd}>新增产品</Button>}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>刷新</Button>
        </Space>
        <Text type='secondary'>共 {data?.total ?? 0} 个产品</Text>
      </div>
      <Table rowKey='id' columns={columns} dataSource={data?.items} loading={loading} pagination={pagination} scroll={{ x: 1050 }} size='middle' />

      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: typeMeta.color }} />
            <span>{editingItem ? `编辑认证产品 · ${editingItem.code}` : `新增${typeMeta.label}认证产品`}</span>
          </Space>
        }
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText={editingItem ? '保存' : '创建'}
        cancelText='取消'
        destroyOnClose
        width={680}
      >
        <Form form={form} layout='vertical' initialValues={defaultFormValues} style={{ marginTop: 20 }} requiredMark='optional'>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '4px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>基本信息</Text>
          </Divider>

          {!editingItem && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name='type' label='认证类型'>
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label='产品 ID' tooltip='系统自动生成，无需填写'>
                  <Input value='保存后自动生成' disabled />
                </Form.Item>
              </Col>
            </Row>
          )}

          {editingItem && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label='产品 ID' tooltip='系统自动生成'>
                  <Input value={editingItem.id} disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label='认证类型'>
                  <Input value={typeMeta.label} disabled />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={isSuperAdmin && !editingItem ? 16 : 24}>
              <Form.Item
                name='code' label='产品编码'
                rules={[{ required: true, message: customCode ? '请输入产品编码' : '请选择产品' }]}
                tooltip='产品编码使用厂商官方考试代码（如 GB0-192），创建后不可修改'
              >
                {customCode ? (
                  <Input placeholder='如 GB0-999' maxLength={32} />
                ) : (
                  <Select
                    placeholder='从产品目录中选择'
                    options={codeOptions}
                    showSearch
                    optionFilterProp='label'
                    disabled={Boolean(editingItem)}
                    onChange={handleCodeChange}
                    notFoundContent={catalog.length === 0 ? '目录为空，请联系超级管理员导入价格表' : undefined}
                  />
                )}
              </Form.Item>
            </Col>
            {isSuperAdmin && !editingItem && (
              <Col span={8}>
                <Form.Item label=' ' colon={false}>
                  <Button
                    icon={<UnlockOutlined />}
                    onClick={() => {
                      setCustomCode(!customCode)
                      form.setFieldsValue({ code: undefined, catalog_id: null })
                      setSelectedCatalog(null)
                    }}
                    block
                  >
                    {customCode ? '改用目录选择' : '自定义编码'}
                  </Button>
                </Form.Item>
              </Col>
            )}
          </Row>

          {selectedCatalog && (
            <Row gutter={8} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <div style={{ padding: '10px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                  <Space size={16} wrap>
                    {selectedCatalog.duration_minutes && <Text type='secondary'>时长 {selectedCatalog.duration_minutes} 分钟</Text>}
                    {selectedCatalog.question_count && <Text type='secondary'>题数 {selectedCatalog.question_count}</Text>}
                    {selectedCatalog.total_score && <Text type='secondary'>总分 {selectedCatalog.total_score}</Text>}
                    {selectedCatalog.pass_score && <Text type='secondary'>及格 {selectedCatalog.pass_score}</Text>}
                    {selectedCatalog.cert_validity_years && <Text type='secondary'>有效期 {selectedCatalog.cert_validity_years} 年</Text>}
                    {selectedCatalog.remark && <Tag>{selectedCatalog.remark}</Tag>}
                  </Space>
                  {selectedCatalog.prerequisite && selectedCatalog.prerequisite !== '无' && (
                    <div style={{ marginTop: 6 }}>
                      <Text type='secondary' style={{ fontSize: 12 }}>前置要求：{selectedCatalog.prerequisite}</Text>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='chinese_name' label='名称' rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder='选择产品编码后自动填充' maxLength={128} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='name' label='英文名' rules={[{ required: true, message: '请输入英文名' }]}>
                <Input placeholder='选择产品编码后自动填充' maxLength={64} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='is_active' label='上架状态' valuePropName='checked'>
                <Switch checkedChildren='上架' unCheckedChildren='下架' />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='description' label='描述'>
            <Input.TextArea rows={2} placeholder='可选，展示在小程序报名页' maxLength={512} showCount />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0} style={{ margin: '8px 0 16px' }}>
            <Text type='secondary' style={{ fontSize: 13 }}>价格配置（元）</Text>
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='student_price_yuan' label='学生价'
                rules={[{ required: true, message: '请输入学生价' }]}
                tooltip='学生认证档位价格（价格表"网院优惠券"档），用户以学生身份报名时按此收费'
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder='如 500.00' prefix='¥' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='normal_price_yuan' label='普通价'
                rules={[{ required: true, message: '请输入普通价' }]}
                tooltip='普通档位价格（价格表"原价"档）'
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder='如 1200.00' prefix='¥' />
              </Form.Item>
            </Col>
          </Row>

          <Text type='secondary' style={{ fontSize: 12 }}>
            产品级为默认价，批次可单独覆盖；价格保存后立即生效，已支付订单不受影响。
          </Text>
        </Form>
      </Modal>
    </>
  )
}
