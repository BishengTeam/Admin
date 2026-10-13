import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('points mall administration', () => {
  it('renames the entry and orders the three workspaces around virtual products', () => {
    const routes = readSource('src/routes.tsx')
    const page = readSource('src/pages/pointsMall/index.tsx')

    expect(routes).toContain("title: '积分商城'")
    expect(page).toContain("key: 'products', label: '兑换商品'")
    expect(page).toContain("key: 'orders', label: '兑换订单'")
    expect(page).toContain("key: 'coupons', label: '优惠券'")
  })

  it('converts coupon money fields correctly and clears stale product content', () => {
    const page = readSource('src/pages/pointsMall/index.tsx')

    expect(page).toContain('item.discount_value / 100')
    expect(page).toContain('values.discount_yuan ?? 0) * 100')
    expect(page).toContain('item.min_order_amount_cents / 100')
    expect(page).toContain('values.min_order_yuan ?? 0) * 100')
    expect(page).toContain("productForm.setFieldsValue({ content_id: undefined })")
  })

  it('provides read-only details, linked order filtering, and safe refund confirmation', () => {
    const page = readSource('src/pages/pointsMall/index.tsx')
    const service = readSource('src/services/pointsMall.ts')

    expect(service).toContain('getVirtualProduct(id: number)')
    expect(service).toContain('getVirtualOrder(id: number)')
    expect(page).toContain("title='商品详情'")
    expect(page).toContain("title='兑换订单详情'")
    expect(page).toContain("title='确认异常退还'")
    expect(page).toContain('查看兑换订单')
    expect(page).not.toContain("value: 'admin_refund'")
  })
})
