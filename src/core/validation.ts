// Zod 运行时校验 — 代码准备
// 逐步覆盖关键 API 响应，后端字段变更时运行时报错而非静默失败
import { z } from 'zod'

// 基础分页结构
export const PageDataSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
  })

// 用户 Schema（后续扩展）
export const UserSchema = z.object({
  id: z.number(),
  openid: z.string(),
  phone: z.string().nullable(),
  is_active: z.boolean(),
})

export type User = z.infer<typeof UserSchema>

// 校验辅助函数
export function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error('[Zod validation error]', result.error.format())
    if (import.meta.env.PROD) return data as T // 生产环境降级
    throw new Error(`API response validation failed: ${result.error.message}`)
  }
  return result.data
}
