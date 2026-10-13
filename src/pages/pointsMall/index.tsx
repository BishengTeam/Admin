import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import dayjs, { type Dayjs } from 'dayjs'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { certProductService } from '@/services/certProduct'
import { courseManagementService } from '@/services/courseManagement'
import { pointsMallService } from '@/services/pointsMall'
import type {
  PointsMallItem,
  VirtualOrder,
  VirtualOrderDetail,
  VirtualProduct,
} from '@/services/pointsMall'
import { quizService } from '@/services/quiz'
import type { CertProduct } from '@/types/certProduct'
import type { CourseItem } from '@/types/course'
import type { QuizLibrary } from '@/types/quiz'
import { formatPrice } from '@/utils/format'

const { Text } = Typography
const { RangePicker } = DatePicker

type MainTab = 'products' | 'orders' | 'coupons'
type ProductType = 'course' | 'quiz_library'
type ProductStatus = 'draft' | 'published' | 'offline'

const MAIN_TABS = [
  { key: 'products', label: '兑换商品' },
  { key: 'orders', label: '兑换订单' },
  { key: 'coupons', label: '优惠券' },
] as const

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  course: '课程',
  quiz_library: '题库',
}

const PRODUCT_STATUS_LABELS: Record<ProductStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已上架', color: 'green' },
  offline: { text: '已停售', color: 'red' },
}

const PRODUCT_STATUS_OPTIONS = [
  { value: '', label: '全部发布状态' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已上架' },
  { value: 'offline', label: '已停售' },
]

const PRODUCT_AVAILABILITY_OPTIONS = [
  { value: '', label: '全部可兑换状态' },
  { value: 'not_started', label: '未开始' },
  { value: 'ended', label: '已结束' },
  { value: 'sold_out', label: '已兑完' },
]

const ORDER_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'completed', label: '已完成' },
  { value: 'refunded', label: '已退还' },
]

const COUPON_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '可兑换' },
  { value: 'inactive', label: '已下架' },
  { value: 'expired', label: '已过期' },
  { value: 'sold_out', label: '已兑完' },
]

const REFUND_REASONS = [
  { value: 'entitlement_error', label: '权益异常' },
  { value: 'operation_correction', label: '运营纠错' },
  { value: 'other', label: '其他' },
]

const CATEGORY_OPTIONS = [
  { value: 'certification', label: '认证报名' },
  { value: 'course', label: '课程' },
  { value: 'quiz', label: '题库' },
]

interface ProductFilters {
  keyword: string
  product_type: string
  status: string
  availability: string
}

interface OrderFilters {
  keyword: string
  product_id: number | undefined
  status: string
  range: [Dayjs | null, Dayjs | null] | undefined
}

interface CouponFilters {
  keyword: string
  status: string
}

interface ContentOption {
  value: number
  label: string
  name: string
}

function couponRule(item: PointsMallItem): string {
  const discount = item.discount_type === 'percent'
    ? `${item.discount_value / 10} 折`
    : `减 ${formatPrice(item.discount_value)}`
  const threshold = item.min_order_amount_cents > 0
    ? `满 ${formatPrice(item.min_order_amount_cents)}`
    : '无门槛'
  return `${threshold}${discount}`
}

function couponScopeLabel(item: PointsMallItem): string {
  if (item.scope_type === 'global') return '全部商品可用'
  if (item.scope_type === 'category') {
    const labels: Record<string, string> = {
      certification: '认证报名',
      course: '课程',
      quiz: '题库',
    }
    return labels[item.scope_value ?? ''] ?? item.scope_value ?? '指定分类'
  }
  return `指定产品：${item.scope_value ?? '-'}`
}

function couponValidityLabel(item: PointsMallItem): string {
  if (item.validity_type === 'days') return `领取后 ${item.validity_days} 天有效`
  return item.valid_until
    ? `有效期至 ${dayjs(item.valid_until).format('YYYY-MM-DD HH:mm')}`
    : '长期有效'
}

function periodLabel(product: Pick<VirtualProduct, 'entitlement_days'>): string {
  return product.entitlement_days === null
    ? '永久有效'
    : `兑换后 ${product.entitlement_days} 天`
}

function stockLabel(
  product: Pick<VirtualProduct, 'stock_limit' | 'remaining_stock'>,
): string {
  if (product.stock_limit === null) return '不限量'
  return `剩余 ${product.remaining_stock ?? 0}／总量 ${product.stock_limit}`
}

function couponStockLabel(item: PointsMallItem): string {
  if (item.total_stock === 0) return '不限量'
  return `剩余 ${item.remaining_stock}／总量 ${item.total_stock}`
}

function couponStatus(item: PointsMallItem): { text: string; color: string } {
  if (!item.is_active) return { text: '已下架', color: 'default' }
  if (
    item.validity_type === 'fixed_date'
    && item.valid_until
    && dayjs(item.valid_until).isBefore(dayjs())
  ) return { text: '已过期', color: 'orange' }
  if (item.total_stock > 0 && item.remaining_stock <= 0) {
    return { text: '已兑完', color: 'orange' }
  }
  return { text: '可兑换', color: 'green' }
}

function refundReasonLabel(code: string): string {
  return REFUND_REASONS.find(item => item.value === code)?.label ?? code
}

function productStatus(product: VirtualProduct): { text: string; color: string } {
  const base = PRODUCT_STATUS_LABELS[product.status]
  if (product.status !== 'published' || product.redeemable) {
    return product.redeemable
      ? { text: '已上架 · 可兑换', color: 'green' }
      : base
  }
  return {
    text: `已上架 · ${product.redeem_block_reason ?? '不可兑换'}`,
    color: 'orange',
  }
}

function formatDate(value: string | null | undefined): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
}

export default function PointsMallPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const routeTab = searchParams.get('tab') as MainTab | null
  const activeTab = routeTab && MAIN_TABS.some(tab => tab.key === routeTab)
    ? routeTab
    : 'products'

  const [productFilters, setProductFilters] = useState<ProductFilters>({
    keyword: searchParams.get('productKeyword') ?? '',
    product_type: searchParams.get('productType') ?? '',
    status: searchParams.get('productStatus') ?? '',
    availability: searchParams.get('productAvailability') ?? '',
  })
  const [orderFilters, setOrderFilters] = useState<OrderFilters>({
    keyword: searchParams.get('orderKeyword') ?? '',
    product_id: (() => {
      const value = Number(searchParams.get('orderProductId'))
      return Number.isFinite(value) && value > 0 ? value : undefined
    })(),
    status: searchParams.get('orderStatus') ?? '',
    range: searchParams.get('orderFrom') && searchParams.get('orderTo')
      ? [dayjs(searchParams.get('orderFrom')), dayjs(searchParams.get('orderTo'))]
      : undefined,
  })
  const [couponFilters, setCouponFilters] = useState<CouponFilters>({
    keyword: searchParams.get('couponKeyword') ?? '',
    status: searchParams.get('couponStatus') ?? '',
  })
  const [productKeywordInput, setProductKeywordInput] = useState(productFilters.keyword)
  const [orderKeywordInput, setOrderKeywordInput] = useState(orderFilters.keyword)
  const [couponKeywordInput, setCouponKeywordInput] = useState(couponFilters.keyword)

  const [couponOpen, setCouponOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<PointsMallItem | null>(null)
  const [couponSaving, setCouponSaving] = useState(false)
  const [couponForm] = Form.useForm()
  const couponDiscountType = Form.useWatch('discount_type', couponForm)
  const couponValidityType = Form.useWatch('validity_type', couponForm)
  const couponScopeType = Form.useWatch('scope_type', couponForm)
  const couponStockMode = Form.useWatch('stock_mode', couponForm)

  const [productOpen, setProductOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<VirtualProduct | null>(null)
  const [productSaving, setProductSaving] = useState(false)
  const [productForm] = Form.useForm()
  const productType = Form.useWatch('product_type', productForm)
  const stockMode = Form.useWatch('stock_mode', productForm)
  const periodMode = Form.useWatch('period_mode', productForm)
  const productPointsPrice = Form.useWatch('points_price', productForm)
  const productStockLimit = Form.useWatch('stock_limit', productForm)
  const productEntitlementDays = Form.useWatch('entitlement_days', productForm)

  const [courses, setCourses] = useState<CourseItem[]>([])
  const [quizLibraries, setQuizLibraries] = useState<QuizLibrary[]>([])
  const [certProducts, setCertProducts] = useState<CertProduct[]>([])
  const [contentKeyword, setContentKeyword] = useState('')
  const [contentLoading, setContentLoading] = useState(false)
  const [contentLoadError, setContentLoadError] = useState<string | null>(null)
  const [couponContentKeyword, setCouponContentKeyword] = useState('')
  const [couponContentLoading, setCouponContentLoading] = useState(false)
  const [couponContentLoadError, setCouponContentLoadError] = useState<string | null>(null)
  const [productDetail, setProductDetail] = useState<VirtualProduct | null>(null)
  const [productDetailOpen, setProductDetailOpen] = useState(false)
  const [orderDetail, setOrderDetail] = useState<VirtualOrderDetail | null>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [orderDetailLoading, setOrderDetailLoading] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundCode, setRefundCode] = useState(REFUND_REASONS[0].value)
  const [refundSubmitting, setRefundSubmitting] = useState(false)
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const { ensureReauthenticated, reauthDialog } = useReauthentication()

  const couponPagination = usePagination(
    (page) => pointsMallService.list({
      ...page,
      keyword: couponFilters.keyword || undefined,
      status: couponFilters.status || undefined,
    }),
    [couponFilters.keyword, couponFilters.status],
  )
  const productPagination = usePagination(
    (page) => pointsMallService.listVirtualProducts({
      ...page,
      keyword: productFilters.keyword || undefined,
      product_type: productFilters.product_type || undefined,
      status: productFilters.status || undefined,
      availability: productFilters.availability || undefined,
    }),
    [
      productFilters.keyword,
      productFilters.product_type,
      productFilters.status,
      productFilters.availability,
    ],
  )
  const orderPagination = usePagination(
    (page) => pointsMallService.listVirtualOrders({
      ...page,
      keyword: orderFilters.keyword || undefined,
      product_id: orderFilters.product_id,
      status: orderFilters.status || undefined,
      created_from: orderFilters.range?.[0]?.toISOString(),
      created_to: orderFilters.range?.[1]?.endOf('day').toISOString(),
    }),
    [
      orderFilters.keyword,
      orderFilters.product_id,
      orderFilters.status,
      orderFilters.range?.[0]?.toISOString(),
      orderFilters.range?.[1]?.toISOString(),
    ],
  )

  useEffect(() => {
    const next = new URLSearchParams()
    next.set('tab', activeTab)
    if (productFilters.keyword) next.set('productKeyword', productFilters.keyword)
    if (productFilters.product_type) next.set('productType', productFilters.product_type)
    if (productFilters.status) next.set('productStatus', productFilters.status)
    if (productFilters.availability) next.set('productAvailability', productFilters.availability)
    if (orderFilters.keyword) next.set('orderKeyword', orderFilters.keyword)
    if (orderFilters.product_id) next.set('orderProductId', String(orderFilters.product_id))
    if (orderFilters.status) next.set('orderStatus', orderFilters.status)
    if (orderFilters.range?.[0]) next.set('orderFrom', orderFilters.range[0].toISOString())
    if (orderFilters.range?.[1]) next.set('orderTo', orderFilters.range[1].toISOString())
    if (couponFilters.keyword) next.set('couponKeyword', couponFilters.keyword)
    if (couponFilters.status) next.set('couponStatus', couponFilters.status)
    setSearchParams(next, { replace: true })
  }, [
    activeTab,
    couponFilters.keyword,
    couponFilters.status,
    orderFilters.keyword,
    orderFilters.product_id,
    orderFilters.status,
    orderFilters.range?.[0]?.toISOString(),
    orderFilters.range?.[1]?.toISOString(),
    productFilters.availability,
    productFilters.keyword,
    productFilters.product_type,
    productFilters.status,
    setSearchParams,
  ])

  useEffect(() => {
    if (!productOpen) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setContentLoading(true)
      setContentLoadError(null)
      Promise.all([
        courseManagementService.listCourses({
          page: 1,
          page_size: 50,
          keyword: contentKeyword || undefined,
        }),
        quizService.listLibraries({ keyword: contentKeyword || undefined }),
      ])
        .then(([coursePage, libraries]) => {
          if (cancelled) return
          setCourses(coursePage.items)
          setQuizLibraries(libraries)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setCourses([])
          setQuizLibraries([])
          setContentLoadError(error instanceof Error ? error.message : '关联内容加载失败')
        })
        .finally(() => {
          if (!cancelled) setContentLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [contentKeyword, productOpen])

  useEffect(() => {
    if (!couponOpen) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setCouponContentLoading(true)
      setCouponContentLoadError(null)
      Promise.all([
        certProductService.list({
          page: 1,
          page_size: 50,
          keyword: couponContentKeyword || undefined,
        }),
        courseManagementService.listCourses({
          page: 1,
          page_size: 50,
          keyword: couponContentKeyword || undefined,
        }),
        quizService.listLibraries({ keyword: couponContentKeyword || undefined }),
      ])
        .then(([certPage, coursePage, libraries]) => {
          if (cancelled) return
          setCertProducts(certPage.items)
          setCourses(coursePage.items)
          setQuizLibraries(libraries)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setCertProducts([])
          setCourses([])
          setQuizLibraries([])
          setCouponContentLoadError(error instanceof Error ? error.message : '适用产品加载失败')
        })
        .finally(() => {
          if (!cancelled) setCouponContentLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [couponContentKeyword, couponOpen])

  const contentOptions: ContentOption[] = useMemo(() => {
    if (productType === 'course') {
      return courses.map(course => ({
        value: course.id,
        label: course.title,
        name: course.title,
      }))
    }
    return quizLibraries.map(library => ({
      value: library.id,
      label: `${library.name}（${library.library_code}）`,
      name: library.name,
    }))
  }, [courses, productType, quizLibraries])

  const selectableContentOptions = useMemo(() => {
    const contentId = editingProduct?.course_id ?? editingProduct?.library_id
    if (
      editingProduct
      && contentId !== undefined
      && !contentOptions.some(option => option.value === contentId)
    ) {
      return [
        {
          value: contentId,
          label: editingProduct.content_name ?? editingProduct.content_key,
          name: editingProduct.content_name ?? editingProduct.content_key,
        },
        ...contentOptions,
      ]
    }
    return contentOptions
  }, [contentOptions, editingProduct])

  const couponProductOptions = useMemo(() => [
    ...certProducts.filter(item => item.is_active).map(item => ({
      value: item.code,
      label: `${item.chinese_name || item.name}（${item.code}）`,
      group: '认证产品',
    })),
    ...courses.map(item => ({ value: item.title, label: item.title, group: '课程' })),
    ...quizLibraries.map(item => ({
      value: item.library_code,
      label: `${item.name}（${item.library_code}）`,
      group: '题库',
    })),
  ], [certProducts, courses, quizLibraries])

  const selectableCouponProductOptions = useMemo(() => {
    const scopeValue = editingCoupon?.scope_value
    if (
      editingCoupon
      && editingCoupon.scope_type === 'product'
      && scopeValue
      && !couponProductOptions.some(option => option.value === scopeValue)
    ) {
      return [{ value: scopeValue, label: scopeValue, group: '当前关联产品' }, ...couponProductOptions]
    }
    return couponProductOptions
  }, [couponProductOptions, editingCoupon])

  const couponProductGroups = useMemo(() => {
    const groups = new Map<string, Array<{ value: string; label: string }>>()
    for (const option of selectableCouponProductOptions) {
      if (!groups.has(option.group)) groups.set(option.group, [])
      groups.get(option.group)!.push(option)
    }
    return Array.from(groups.entries()).map(([label, options]) => ({ label, options }))
  }, [selectableCouponProductOptions])

  const openCouponCreate = () => {
    setEditingCoupon(null)
    setCouponContentKeyword('')
    couponForm.resetFields()
    couponForm.setFieldsValue({
      discount_type: 'fixed',
      discount_yuan: 50,
      scope_type: 'global',
      validity_type: 'days',
      validity_days: 30,
      stock_mode: 'unlimited',
      per_user_limit: 1,
      min_order_yuan: 0,
    })
    setCouponOpen(true)
  }

  const openCouponEdit = (item: PointsMallItem) => {
    setEditingCoupon(item)
    setCouponContentKeyword('')
    couponForm.resetFields()
    couponForm.setFieldsValue({
      ...item,
      discount_yuan: item.discount_type === 'fixed' ? item.discount_value / 100 : undefined,
      discount_unit: item.discount_type === 'percent' ? item.discount_value / 10 : undefined,
      min_order_yuan: item.min_order_amount_cents / 100,
      stock_mode: item.total_stock === 0 ? 'unlimited' : 'limited',
      total_stock: item.total_stock === 0 ? undefined : item.total_stock,
      valid_until: item.valid_until ? dayjs(item.valid_until) : undefined,
    })
    setCouponOpen(true)
  }

  const submitCoupon = async () => {
    let values
    try {
      values = await couponForm.validateFields()
    } catch {
      return
    }
    setCouponSaving(true)
    try {
      const payload = {
        name: values.name,
        description: values.description ?? null,
        discount_type: values.discount_type,
        discount_value: values.discount_type === 'fixed'
          ? Math.round((values.discount_yuan ?? 0) * 100)
          : Math.round((values.discount_unit ?? 0) * 10),
        scope_type: values.scope_type,
        scope_value: values.scope_value ?? null,
        min_order_amount_cents: Math.round((values.min_order_yuan ?? 0) * 100),
        points_cost: values.points_cost,
        total_stock: values.stock_mode === 'limited' ? values.total_stock : 0,
        per_user_limit: values.per_user_limit ?? 0,
        validity_type: values.validity_type,
        validity_days: values.validity_days ?? null,
        valid_until: values.valid_until?.toISOString?.() ?? null,
        sort_order: values.sort_order ?? 0,
      }
      if (editingCoupon) {
        await pointsMallService.update(editingCoupon.id, payload)
        message.success('优惠券已更新')
      } else {
        await pointsMallService.create(payload)
        message.success('优惠券已创建')
      }
      setCouponOpen(false)
      couponPagination.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setCouponSaving(false)
    }
  }

  const openProductCreate = () => {
    setEditingProduct(null)
    setContentKeyword('')
    productForm.resetFields()
    productForm.setFieldsValue({
      product_type: 'course',
      stock_mode: 'unlimited',
      period_mode: 'permanent',
      status: 'draft',
    })
    setProductOpen(true)
  }

  const openProductEdit = (product: VirtualProduct) => {
    setEditingProduct(product)
    setContentKeyword('')
    productForm.resetFields()
    productForm.setFieldsValue({
      product_type: product.product_type,
      content_id: product.course_id ?? product.library_id,
      name: product.name,
      description: product.description,
      points_price: product.points_price,
      stock_mode: product.stock_limit === null ? 'unlimited' : 'limited',
      stock_limit: product.stock_limit ?? undefined,
      period_mode: product.entitlement_days === null ? 'permanent' : 'days',
      entitlement_days: product.entitlement_days ?? undefined,
      available_range: product.available_from && product.available_to
        ? [dayjs(product.available_from), dayjs(product.available_to)]
        : undefined,
      status: product.status,
    })
    setProductOpen(true)
  }

  const submitProduct = async () => {
    let values
    try {
      values = await productForm.validateFields()
    } catch {
      return
    }
    setProductSaving(true)
    try {
      const common = {
        name: values.name,
        description: values.description ?? null,
        points_price: values.points_price,
        stock_limit: values.stock_mode === 'limited' ? values.stock_limit : null,
        entitlement_days: values.period_mode === 'days' ? values.entitlement_days : null,
        available_from: values.available_range?.[0]?.toISOString?.() ?? null,
        available_to: values.available_range?.[1]?.toISOString?.() ?? null,
        status: values.status,
      }
      if (editingProduct) {
        await pointsMallService.updateVirtualProduct(editingProduct.id, common)
        message.success('兑换商品已更新')
      } else {
        await pointsMallService.createVirtualProduct({
          ...common,
          product_type: values.product_type,
          course_id: values.product_type === 'course' ? values.content_id : null,
          library_id: values.product_type === 'quiz_library' ? values.content_id : null,
        })
        message.success('兑换商品已创建')
      }
      setProductOpen(false)
      productPagination.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setProductSaving(false)
    }
  }

  const changeProductStatus = async (product: VirtualProduct, status: ProductStatus) => {
    setActionId(product.id)
    try {
      await pointsMallService.updateVirtualProduct(product.id, { status })
      message.success(status === 'published' ? '商品已上架' : '商品已停售')
      productPagination.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setActionId(null)
    }
  }

  const openProductDetail = async (product: VirtualProduct) => {
    setProductDetail(product)
    setProductDetailOpen(true)
    try {
      setProductDetail(await pointsMallService.getVirtualProduct(product.id))
    } catch {
      // 保留列表数据作为只读详情兜底。
    }
  }

  const viewProductOrders = (product: VirtualProduct) => {
    setProductDetailOpen(false)
    setOrderFilters(previous => ({ ...previous, product_id: product.id }))
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'orders')
    next.set('orderProductId', String(product.id))
    setSearchParams(next)
  }

  const openOrderDetail = async (order: VirtualOrder) => {
    setOrderDetailOpen(true)
    setOrderDetailLoading(true)
    setRefundReason('')
    setRefundCode(REFUND_REASONS[0].value)
    try {
      setOrderDetail(await pointsMallService.getVirtualOrder(order.id))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '订单详情加载失败')
      setOrderDetailOpen(false)
    } finally {
      setOrderDetailLoading(false)
    }
  }

  const submitRefund = async () => {
    if (!orderDetail || orderDetail.status !== 'completed') return
    if (!refundReason.trim()) {
      message.warning('请填写详细退还原因')
      return
    }
    setRefundSubmitting(true)
    try {
      const token = await ensureReauthenticated()
      if (!token) throw new Error('请重新验证管理员密码')
      await pointsMallService.refundVirtualOrder(orderDetail.id, {
        reason_code: refundCode,
        reason_detail: refundReason.trim(),
      }, token)
      message.success('兑换订单已退还')
      setRefundConfirmOpen(false)
      setOrderDetail(await pointsMallService.getVirtualOrder(orderDetail.id))
      orderPagination.refresh()
      productPagination.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '退还失败')
    } finally {
      setRefundSubmitting(false)
    }
  }

  const resetProductFilters = () => {
    setProductKeywordInput('')
    setProductFilters({
      keyword: '',
      product_type: '',
      status: '',
      availability: '',
    })
  }

  const resetOrderFilters = () => {
    setOrderKeywordInput('')
    setOrderFilters({
      keyword: '',
      product_id: undefined,
      status: '',
      range: undefined,
    })
  }

  const resetCouponFilters = () => {
    setCouponKeywordInput('')
    setCouponFilters({ keyword: '', status: '' })
  }

  const changeCouponStatus = async (item: PointsMallItem, is_active: boolean) => {
    setActionId(item.id)
    try {
      await pointsMallService.update(item.id, { is_active })
      message.success(is_active ? '优惠券已上架' : '优惠券已下架')
      couponPagination.refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setActionId(null)
    }
  }

  const productColumns: ColumnsType<VirtualProduct> = [
    {
      title: '商品',
      key: 'product',
      width: 280,
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <Button type='link' size='small' onClick={() => openProductDetail(row)}>
            {row.name}
          </Button>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {PRODUCT_TYPE_LABELS[row.product_type]} · {row.content_name ?? row.content_key}
          </Text>
        </Space>
      ),
    },
    {
      title: '积分价格',
      dataIndex: 'points_price',
      width: 100,
      render: (value: number) => `${value} 积分`,
    },
    {
      title: '状态',
      key: 'status',
      width: 150,
      render: (_, row) => {
        const status = productStatus(row)
        return <Tag color={status.color}>{status.text}</Tag>
      },
    },
    {
      title: '库存',
      key: 'stock',
      width: 150,
      render: (_, row) => stockLabel(row),
    },
    {
      title: '权益期限',
      key: 'period',
      width: 130,
      render: (_, row) => periodLabel(row),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' onClick={() => openProductEdit(row)}>编辑</Button>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                row.status === 'published'
                  ? { key: 'offline', label: '停售' }
                  : { key: 'published', label: '上架' },
                { key: 'orders', label: '查看兑换订单' },
              ],
              onClick: ({ key }) => {
                if (key === 'orders') {
                  viewProductOrders(row)
                  return
                }
                void changeProductStatus(row, key as ProductStatus)
              },
            }}
          >
            <Button size='small' loading={actionId === row.id} icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ]

  const orderColumns: ColumnsType<VirtualOrder> = [
    {
      title: '订单号／时间',
      key: 'order',
      width: 230,
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <Button type='link' size='small' onClick={() => openOrderDetail(row)}>
            {row.order_no}
          </Button>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {formatDate(row.created_at)}
          </Text>
        </Space>
      ),
    },
    {
      title: '用户',
      key: 'user',
      width: 170,
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <Text>{row.user_nickname ?? `用户 ${row.user_id}`}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>ID：{row.user_id}</Text>
        </Space>
      ),
    },
    {
      title: '商品',
      key: 'product',
      width: 230,
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <Text ellipsis={{ tooltip: row.product_name }}>{row.product_name}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {PRODUCT_TYPE_LABELS[row.product_type]}
          </Text>
        </Space>
      ),
    },
    {
      title: '实扣积分',
      dataIndex: 'points_cost',
      width: 100,
      render: (value: number) => `${value} 积分`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: VirtualOrder['status']) => (
        <Tag color={value === 'completed' ? 'green' : 'orange'}>
          {value === 'completed' ? '已完成' : '已退还'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_, row) => (
        <Button size='small' onClick={() => openOrderDetail(row)}>查看</Button>
      ),
    },
  ]

  const couponColumns: ColumnsType<PointsMallItem> = [
    {
      title: '优惠券',
      dataIndex: 'name',
      width: 220,
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <Text ellipsis={{ tooltip: row.name }}>{row.name}</Text>
          {row.description && (
            <Text type='secondary' style={{ fontSize: 12 }} ellipsis={{ tooltip: row.description }}>
              {row.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '优惠规则',
      key: 'rule',
      width: 170,
      render: (_, row) => couponRule(row),
    },
    {
      title: '适用范围',
      key: 'scope',
      width: 170,
      render: (_, row) => couponScopeLabel(row),
    },
    {
      title: '兑换积分',
      dataIndex: 'points_cost',
      width: 100,
      render: (value: number) => `${value} 积分`,
    },
    {
      title: '库存',
      key: 'stock',
      width: 150,
      render: (_, row) => couponStockLabel(row),
    },
    {
      title: '领取后有效期',
      key: 'validity',
      width: 180,
      render: (_, row) => couponValidityLabel(row),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, row) => {
        const status = couponStatus(row)
        return <Tag color={status.color}>{status.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button size='small' onClick={() => openCouponEdit(row)}>编辑</Button>
          {row.is_active ? (
            <Popconfirm
              title='确定下架该优惠券？'
              description='停止新的兑换；已领取优惠券按原规则处理。'
              onConfirm={() => changeCouponStatus(row, false)}
            >
              <Button size='small' danger loading={actionId === row.id}>下架</Button>
            </Popconfirm>
          ) : (
            <Button
              size='small'
              loading={actionId === row.id}
              onClick={() => changeCouponStatus(row, true)}
            >
              上架
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const productRuleSummary = [
    `用户消耗 ${productPointsPrice || '-'} 积分兑换本商品`,
    stockMode === 'limited' ? `限量 ${productStockLimit ?? '-'} 份` : '不限量',
    productEntitlementDays
      ? `兑换后有效 ${productEntitlementDays} 天`
      : periodMode === 'permanent' ? '权益永久有效' : '权益期限待填写',
  ].join('，')

  return (
    <>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            const next = new URLSearchParams(searchParams)
            next.set('tab', key)
            setSearchParams(next)
          }}
          items={[
            {
              key: 'products',
              label: '兑换商品',
              children: (
                <>
                  <Space wrap style={{ marginBottom: 16 }}>
                    <Input.Search
                      value={productKeywordInput}
                      onChange={event => setProductKeywordInput(event.target.value)}
                      onSearch={value => setProductFilters(previous => ({
                        ...previous,
                        keyword: value.trim(),
                      }))}
                      prefix={<SearchOutlined />}
                      placeholder='搜索商品名称 / 内容标识'
                      style={{ width: 260 }}
                      allowClear
                    />
                    <Select
                      value={productFilters.product_type}
                      options={[
                        { value: '', label: '全部类型' },
                        ...Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
                      ]}
                      onChange={value => setProductFilters(previous => ({
                        ...previous,
                        product_type: value,
                      }))}
                      style={{ width: 120 }}
                    />
                    <Select
                      value={productFilters.status}
                      options={PRODUCT_STATUS_OPTIONS}
                      onChange={value => setProductFilters(previous => ({ ...previous, status: value }))}
                      style={{ width: 140 }}
                    />
                    <Select
                      value={productFilters.availability}
                      options={PRODUCT_AVAILABILITY_OPTIONS}
                      onChange={value => setProductFilters(previous => ({
                        ...previous,
                        availability: value,
                      }))}
                      style={{ width: 150 }}
                    />
                    <Button onClick={resetProductFilters}>重置</Button>
                    <Button icon={<ReloadOutlined />} onClick={productPagination.refresh}>刷新</Button>
                    <Button type='primary' icon={<PlusOutlined />} onClick={openProductCreate}>
                      新增商品
                    </Button>
                  </Space>
                  <Table
                    rowKey='id'
                    columns={productColumns}
                    dataSource={productPagination.data?.items ?? []}
                    loading={productPagination.loading}
                    pagination={productPagination.pagination}
                    scroll={{ x: 1000 }}
                  />
                </>
              ),
            },
            {
              key: 'orders',
              label: '兑换订单',
              children: (
                <>
                  <Space wrap style={{ marginBottom: 16 }}>
                    <Input.Search
                      value={orderKeywordInput}
                      onChange={event => setOrderKeywordInput(event.target.value)}
                      onSearch={value => setOrderFilters(previous => ({
                        ...previous,
                        keyword: value.trim(),
                      }))}
                      prefix={<SearchOutlined />}
                      placeholder='搜索订单号 / 用户'
                      style={{ width: 260 }}
                      allowClear
                    />
                    <Select
                      value={orderFilters.product_id}
                      options={(productPagination.data?.items ?? []).map(item => ({
                        value: item.id,
                        label: `${item.name}（#${item.id}）`,
                      }))}
                      onChange={value => setOrderFilters(previous => ({
                        ...previous,
                        product_id: value,
                      }))}
                      placeholder='全部商品'
                      showSearch
                      optionFilterProp='label'
                      allowClear
                      style={{ width: 220 }}
                    />
                    <Select
                      value={orderFilters.status}
                      options={ORDER_STATUS_OPTIONS}
                      onChange={value => setOrderFilters(previous => ({ ...previous, status: value }))}
                      style={{ width: 120 }}
                    />
                    <RangePicker
                      showTime
                      value={orderFilters.range as [Dayjs, Dayjs] | undefined}
                      onChange={values => setOrderFilters(previous => ({
                        ...previous,
                        range: values?.[0] && values?.[1] ? [values[0], values[1]] : undefined,
                      }))}
                    />
                    <Button onClick={resetOrderFilters}>重置</Button>
                    <Button icon={<ReloadOutlined />} onClick={orderPagination.refresh}>刷新</Button>
                  </Space>
                  <Table
                    rowKey='id'
                    columns={orderColumns}
                    dataSource={orderPagination.data?.items ?? []}
                    loading={orderPagination.loading}
                    pagination={orderPagination.pagination}
                    scroll={{ x: 1000 }}
                  />
                </>
              ),
            },
            {
              key: 'coupons',
              label: '优惠券',
              children: (
                <>
                  <Space wrap style={{ marginBottom: 16 }}>
                    <Input.Search
                      value={couponKeywordInput}
                      onChange={event => setCouponKeywordInput(event.target.value)}
                      onSearch={value => setCouponFilters(previous => ({
                        ...previous,
                        keyword: value.trim(),
                      }))}
                      prefix={<SearchOutlined />}
                      placeholder='搜索券名称 / 适用范围'
                      style={{ width: 260 }}
                      allowClear
                    />
                    <Select
                      value={couponFilters.status}
                      options={COUPON_STATUS_OPTIONS}
                      onChange={value => setCouponFilters(previous => ({ ...previous, status: value }))}
                      style={{ width: 120 }}
                    />
                    <Button onClick={resetCouponFilters}>重置</Button>
                    <Button icon={<ReloadOutlined />} onClick={couponPagination.refresh}>刷新</Button>
                    <Button type='primary' icon={<PlusOutlined />} onClick={openCouponCreate}>
                      新建优惠券
                    </Button>
                  </Space>
                  <Table
                    rowKey='id'
                    columns={couponColumns}
                    dataSource={couponPagination.data?.items ?? []}
                    loading={couponPagination.loading}
                    pagination={couponPagination.pagination}
                    scroll={{ x: 1250 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={editingProduct ? '编辑兑换商品' : '新增兑换商品'}
        open={productOpen}
        onClose={() => setProductOpen(false)}
        width={760}
        destroyOnClose
      >
        <Form form={productForm} layout='vertical'>
          <Divider orientation='left' orientationMargin={0}>关联内容</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='product_type' label='商品类型' rules={[{ required: true }]}>
                <Select
                  disabled={Boolean(editingProduct)}
                  options={Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                  onChange={() => productForm.setFieldsValue({ content_id: undefined })}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name='content_id'
                label='关联内容'
                rules={[{ required: true, message: '请选择关联内容' }]}
              >
                <Select
                  showSearch
                  optionFilterProp='label'
                  disabled={Boolean(editingProduct)}
                  options={selectableContentOptions}
                  placeholder='选择课程或题库'
                  loading={contentLoading}
                  onSearch={value => setContentKeyword(value)}
                  notFoundContent={contentLoadError ?? (contentLoading ? '关联内容搜索中...' : '未找到匹配内容')}
                  onChange={(_, option) => {
                    const selected = option as ContentOption
                    if (selected?.name) productForm.setFieldsValue({ name: selected.name })
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0}>基本信息</Divider>
          <Form.Item name='name' label='商品名称' rules={[{ required: true, message: '请填写商品名称' }]}>
            <Input maxLength={128} placeholder='用户在积分商城看到的名称' />
          </Form.Item>
          <Form.Item name='description' label='说明'>
            <Input.TextArea rows={2} maxLength={512} placeholder='选填' />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0}>兑换规则</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='points_price' label='积分价格' rules={[{ required: true, message: '请填写积分价格' }]}>
                <InputNumber min={1} precision={0} addonAfter='分' style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='stock_mode' label='库存方式' rules={[{ required: true }]}>
                <Radio.Group
                  options={[
                    { value: 'unlimited', label: '不限量' },
                    { value: 'limited', label: '限量' },
                  ]}
                  optionType='button'
                  buttonStyle='solid'
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              {stockMode === 'limited' && (
                <Form.Item
                  name='stock_limit'
                  label='库存总量'
                  rules={[{ required: true, message: '请填写库存总量' }]}
                >
                  <InputNumber min={0} precision={0} addonAfter='份' style={{ width: '100%' }} />
                </Form.Item>
              )}
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='period_mode' label='权益期限方式' rules={[{ required: true }]}>
                <Radio.Group
                  options={[
                    { value: 'permanent', label: '永久' },
                    { value: 'days', label: '按天数' },
                  ]}
                  optionType='button'
                  buttonStyle='solid'
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              {periodMode === 'days' && (
                <Form.Item
                  name='entitlement_days'
                  label='有效天数'
                  rules={[{ required: true, message: '请填写有效天数' }]}
                >
                  <InputNumber min={1} precision={0} addonAfter='天' style={{ width: '100%' }} />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0}>发布设置</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='available_range' label='兑换时间'>
                <RangePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='status' label='发布状态' rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'draft', label: '草稿' },
                    { value: 'published', label: '上架' },
                    { value: 'offline', label: '停售' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Text type='secondary'>{productRuleSummary}。</Text>
          <br />
          <Text type='warning' style={{ marginTop: 8, display: 'block' }}>
            修改积分价格或权益期限仅影响后续兑换，已完成订单仍按下单时的规则执行。
          </Text>
        </Form>
        <Space style={{ marginTop: 24 }}>
          <Button onClick={() => setProductOpen(false)}>取消</Button>
          <Button type='primary' loading={productSaving} onClick={submitProduct}>
            保存
          </Button>
        </Space>
      </Drawer>

      <Drawer
        title='商品详情'
        open={productDetailOpen}
        onClose={() => setProductDetailOpen(false)}
        width={720}
      >
        {productDetail && (
          <>
            <Descriptions bordered size='small' column={2}>
              <Descriptions.Item label='商品名称' span={2}>{productDetail.name}</Descriptions.Item>
              <Descriptions.Item label='类型'>
                {PRODUCT_TYPE_LABELS[productDetail.product_type]}
              </Descriptions.Item>
              <Descriptions.Item label='关联内容'>
                {productDetail.content_name ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label='内容标识' span={2}>
                <Text copyable>{productDetail.content_key}</Text>
              </Descriptions.Item>
              <Descriptions.Item label='积分价格'>
                {productDetail.points_price} 积分
              </Descriptions.Item>
              <Descriptions.Item label='库存'>{stockLabel(productDetail)}</Descriptions.Item>
              <Descriptions.Item label='已兑换'>{productDetail.total_redeemed}</Descriptions.Item>
              <Descriptions.Item label='已退还'>{productDetail.refunded_count}</Descriptions.Item>
              <Descriptions.Item label='权益期限'>{periodLabel(productDetail)}</Descriptions.Item>
              <Descriptions.Item label='发布状态'>
                {PRODUCT_STATUS_LABELS[productDetail.status].text}
              </Descriptions.Item>
              <Descriptions.Item label='可兑换状态' span={2}>
                <Tag color={productDetail.redeemable ? 'green' : 'orange'}>
                  {productDetail.redeemable ? '当前可兑换' : productDetail.redeem_block_reason ?? '不可兑换'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label='兑换开始'>{formatDate(productDetail.available_from)}</Descriptions.Item>
              <Descriptions.Item label='兑换结束'>{formatDate(productDetail.available_to)}</Descriptions.Item>
              <Descriptions.Item label='版本'>v{productDetail.version}</Descriptions.Item>
              <Descriptions.Item label='更新时间'>{formatDate(productDetail.updated_at)}</Descriptions.Item>
            </Descriptions>
            <Space style={{ marginTop: 24 }}>
              <Button
                type='primary'
                onClick={() => {
                  setProductDetailOpen(false)
                  openProductEdit(productDetail)
                }}
              >
                编辑
              </Button>
              <Button onClick={() => viewProductOrders(productDetail)}>查看兑换订单</Button>
            </Space>
          </>
        )}
      </Drawer>

      <Drawer
        title='兑换订单详情'
        open={orderDetailOpen}
        onClose={() => setOrderDetailOpen(false)}
        width={760}
      >
        {orderDetailLoading && !orderDetail && <Text type='secondary'>订单详情加载中...</Text>}
        {orderDetail && (
          <>
            <Descriptions bordered size='small' column={2}>
              <Descriptions.Item label='订单号' span={2}>
                <Text copyable>{orderDetail.order_no}</Text>
              </Descriptions.Item>
              <Descriptions.Item label='状态'>
                <Tag color={orderDetail.status === 'completed' ? 'green' : 'orange'}>
                  {orderDetail.status === 'completed' ? '已完成' : '已退还'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label='创建时间'>{formatDate(orderDetail.created_at)}</Descriptions.Item>
              <Descriptions.Item label='用户'>
                {orderDetail.user_nickname ?? `用户 ${orderDetail.user_id}`}
              </Descriptions.Item>
              <Descriptions.Item label='用户 ID / 手机号'>
                {orderDetail.user_id} / {orderDetail.user_phone ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label='商品' span={2}>
                {orderDetail.product_name}（{PRODUCT_TYPE_LABELS[orderDetail.product_type]}）
              </Descriptions.Item>
              <Descriptions.Item label='实扣积分'>{orderDetail.points_cost}</Descriptions.Item>
              <Descriptions.Item label='权益期限'>
                {orderDetail.entitlement_days === null ? '永久' : `${orderDetail.entitlement_days} 天`}
              </Descriptions.Item>
              <Descriptions.Item label='权益开始'>{formatDate(orderDetail.starts_at)}</Descriptions.Item>
              <Descriptions.Item label='权益结束'>{formatDate(orderDetail.ends_at)}</Descriptions.Item>
            </Descriptions>

            <Divider orientation='left' orientationMargin={0}>积分流水</Divider>
            <Descriptions bordered size='small' column={2}>
              <Descriptions.Item label='消费流水' span={2}>
                {orderDetail.spend_history
                  ? `${orderDetail.spend_history.amount} / 余额 ${orderDetail.spend_history.balance_after} / ${formatDate(orderDetail.spend_history.created_at)}`
                  : '未找到'}
              </Descriptions.Item>
              {orderDetail.refund_history && (
                <Descriptions.Item label='退还流水' span={2}>
                  {orderDetail.refund_history.amount} / 余额 {orderDetail.refund_history.balance_after} / {formatDate(orderDetail.refund_history.created_at)}
                </Descriptions.Item>
              )}
            </Descriptions>

            {orderDetail.refund && (
              <>
                <Divider orientation='left' orientationMargin={0}>退还记录</Divider>
                <Descriptions bordered size='small' column={2}>
                  <Descriptions.Item label='退还时间'>{formatDate(orderDetail.refund.refunded_at)}</Descriptions.Item>
                  <Descriptions.Item label='操作人'>{orderDetail.refunded_by_admin_name ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label='退还积分'>{orderDetail.refund.points_returned}</Descriptions.Item>
                  <Descriptions.Item label='原因'>{refundReasonLabel(orderDetail.refund.reason_code)}</Descriptions.Item>
                  <Descriptions.Item label='详细原因' span={2}>{orderDetail.refund.reason_detail}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            {orderDetail.status === 'completed' && (
              <>
                <Divider orientation='left' orientationMargin={0}>异常退还</Divider>
                <Space direction='vertical' style={{ width: '100%' }} size={12}>
                  <Select
                    value={refundCode}
                    options={REFUND_REASONS}
                    onChange={setRefundCode}
                    style={{ width: 180 }}
                  />
                  <Input.TextArea
                    rows={4}
                    value={refundReason}
                    onChange={event => setRefundReason(event.target.value)}
                    placeholder='请填写用户可见的详细退还原因'
                    maxLength={500}
                    showCount
                  />
                  <Button
                    danger
                    type='primary'
                    disabled={!refundReason.trim()}
                    onClick={() => setRefundConfirmOpen(true)}
                  >
                    二次验证并退还
                  </Button>
                </Space>
              </>
            )}
          </>
        )}
      </Drawer>

      <Modal
        title='确认异常退还'
        open={refundConfirmOpen}
        confirmLoading={refundSubmitting}
        okText='确认退还'
        okButtonProps={{ danger: true }}
        onCancel={() => setRefundConfirmOpen(false)}
        onOk={submitRefund}
      >
        {orderDetail && (
          <Descriptions column={1} size='small' bordered>
            <Descriptions.Item label='退还用户'>
              {orderDetail.user_nickname ?? `用户 ${orderDetail.user_id}`}（ID：{orderDetail.user_id}）
            </Descriptions.Item>
            <Descriptions.Item label='退还积分'>{orderDetail.points_cost} 积分</Descriptions.Item>
            <Descriptions.Item label='撤销权益来源'>{orderDetail.product_name}</Descriptions.Item>
            <Descriptions.Item label='学习记录'>不删除，仅撤销本订单产生的权益来源</Descriptions.Item>
            <Descriptions.Item label='退还原因'>
              {refundReasonLabel(refundCode)}：{refundReason}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Drawer
        title={editingCoupon ? '编辑优惠券' : '新建优惠券'}
        open={couponOpen}
        onClose={() => setCouponOpen(false)}
        width={760}
        destroyOnClose
      >
        <Form form={couponForm} layout='vertical'>
          <Divider orientation='left' orientationMargin={0}>基本信息</Divider>
          <Form.Item name='name' label='券名称' rules={[{ required: true, message: '请填写券名称' }]}>
            <Input maxLength={128} placeholder='如：认证报名满 100 减 50 券' />
          </Form.Item>
          <Form.Item name='description' label='描述（用户可见）'>
            <Input.TextArea rows={2} maxLength={256} />
          </Form.Item>

          <Divider orientation='left' orientationMargin={0}>优惠规则</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='discount_type' label='优惠方式' rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'fixed', label: '固定减免' },
                    { value: 'percent', label: '折扣' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              {couponDiscountType === 'fixed' ? (
                <Form.Item
                  name='discount_yuan'
                  label='减免金额'
                  rules={[{ required: true, message: '请填写减免金额' }]}
                >
                  <InputNumber min={0.01} precision={2} addonAfter='元' style={{ width: '100%' }} />
                </Form.Item>
              ) : (
                <Form.Item
                  name='discount_unit'
                  label='折扣'
                  rules={[{ required: true, message: '请填写折扣' }]}
                  extra='如 9 表示 9 折'
                >
                  <InputNumber min={0.1} max={9.9} precision={1} addonAfter='折' style={{ width: '100%' }} />
                </Form.Item>
              )}
            </Col>
            <Col span={8}>
              <Form.Item name='min_order_yuan' label='使用门槛'>
                <InputNumber min={0} precision={2} addonAfter='元' style={{ width: '100%' }} placeholder='0' />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left' orientationMargin={0}>适用范围</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='scope_type' label='范围类型' rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'global', label: '全部商品' },
                    { value: 'category', label: '指定分类' },
                    { value: 'product', label: '指定产品' },
                  ]}
                />
              </Form.Item>
            </Col>
            {couponScopeType === 'category' && (
              <Col span={8}>
                <Form.Item name='scope_value' label='商品分类' rules={[{ required: true, message: '请选择分类' }]}>
                  <Select options={CATEGORY_OPTIONS} placeholder='选择分类' />
                </Form.Item>
              </Col>
            )}
            {couponScopeType === 'product' && (
              <Col span={16}>
                <Form.Item
                  name='scope_value'
                  label='选择产品'
                  rules={[{ required: true, message: '请选择产品' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp='label'
                    options={couponProductGroups}
                    placeholder='搜索并选择产品'
                    loading={couponContentLoading}
                    onSearch={value => setCouponContentKeyword(value)}
                    notFoundContent={couponContentLoadError ?? (couponContentLoading ? '适用产品搜索中...' : '未找到匹配产品')}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Divider orientation='left' orientationMargin={0}>兑换规则</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='points_cost' label='兑换积分' rules={[{ required: true, message: '请填写兑换积分' }]}>
                <InputNumber min={1} precision={0} addonAfter='分' style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='stock_mode' label='库存方式' rules={[{ required: true }]}>
                <Radio.Group
                  options={[
                    { value: 'unlimited', label: '不限量' },
                    { value: 'limited', label: '限量' },
                  ]}
                  optionType='button'
                  buttonStyle='solid'
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              {couponStockMode === 'limited' && (
                <Form.Item
                  name='total_stock'
                  label='库存总量'
                  rules={[{ required: true, message: '请填写库存总量' }]}
                >
                  <InputNumber min={1} precision={0} addonAfter='份' style={{ width: '100%' }} />
                </Form.Item>
              )}
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name='per_user_limit' label='每人限兑' extra='0 表示不限制'>
                <InputNumber min={0} precision={0} addonAfter='次' style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='validity_type' label='券有效期方式' rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'days', label: '领取后 N 天' },
                    { value: 'fixed_date', label: '固定截止日期' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              {couponValidityType === 'days' ? (
                <Form.Item
                  name='validity_days'
                  label='有效天数'
                  rules={[{ required: true, message: '请填写有效天数' }]}
                >
                  <InputNumber min={1} precision={0} addonAfter='天' style={{ width: '100%' }} />
                </Form.Item>
              ) : (
                <Form.Item
                  name='valid_until'
                  label='截止时间'
                  rules={[{ required: true, message: '请选择截止时间' }]}
                >
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>
              )}
            </Col>
          </Row>
          <Form.Item name='sort_order' label='排序权重' initialValue={0}>
            <InputNumber min={0} precision={0} style={{ width: 160 }} />
          </Form.Item>
        </Form>
        <Space style={{ marginTop: 24 }}>
          <Button onClick={() => setCouponOpen(false)}>取消</Button>
          <Button type='primary' loading={couponSaving} onClick={submitCoupon}>
            保存
          </Button>
        </Space>
      </Drawer>
      {reauthDialog}
    </>
  )
}
