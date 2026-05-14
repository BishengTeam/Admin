# 管理后台 Web 端 开发规范

> 编制日期：2026-05-14
> 技术栈：React 18 + Ant Design 5 + Vite 5 + Zustand + ECharts 5

---

## 1. 核心原则

### 1.1 单一职责

每个文件、每个组件、每个函数只做一件事。判断标准：
- 能用一句话描述其职责，且这句话中没有"和"字
- 修改一个功能时，不需要修改不相关的文件

### 1.2 依赖方向

```
Page → Component (UI) / Hook (logic) / Service (API)
不允许: Component → Page
不允许: Component → HTTP Request/Response 对象
不允许: pages/A/components/* → pages/B/components/*（除非该组件在 shared/ 中）
```

### 1.3 代码即文档

- 命名自解释，不需要注释说"做什么"
- 仅在 WHY 不显而易见时写注释（边界条件、性能考量、Bug 规避）
- 不为类型写注释 — TypeScript 类型定义已经足够

---

## 2. 项目目录结构

```
admin/
├── index.html                    # HTML 入口
├── vite.config.ts                # Vite 配置
├── tsconfig.json                 # TypeScript 配置
├── package.json                  # 依赖管理
├── .env.development              # 开发环境变量
├── .env.production               # 生产环境变量
├── .env.example                  # 环境变量模板（不含真实值）
├── public/                       # 静态资源（不经过构建）
│   └── favicon.ico
├── src/
│   ├── main.tsx                  # 应用入口，挂载 React + Provider
│   ├── App.tsx                   # 根组件：路由 + 全局布局
│   ├── routes.tsx                # 路由配置（集中管理）
│   ├── core/                     # 全局基础设施
│   │   ├── request.ts            # Axios 实例 + 拦截器（统一请求封装）
│   │   ├── auth.ts               # JWT 存储/读取/刷新/清除
│   │   ├── permission.ts         # RBAC 权限判断工具
│   │   └── constants.ts          # 全局常量
│   ├── layouts/                  # 布局组件
│   │   ├── AdminLayout.tsx       # 管理后台主布局（侧边栏 + 顶栏 + 内容区）
│   │   └── LoginLayout.tsx       # 登录页布局
│   ├── pages/                    # 页面组件（按路由模块分目录）
│   │   ├── login/
│   │   │   └── index.tsx
│   │   ├── dashboard/
│   │   │   ├── index.tsx
│   │   │   └── components/       # 页面私有组件
│   │   │       ├── StatCard.tsx
│   │   │       └── ConversionChart.tsx
│   │   ├── conversations/
│   │   ├── customer-service/
│   │   ├── orders/
│   │   ├── users/
│   │   ├── content/
│   │   ├── quiz/
│   │   ├── points-coupons/
│   │   ├── agreements/
│   │   ├── competition/
│   │   └── settings/
│   ├── components/               # 全局共享组件
│   │   ├── PageContainer.tsx     # 页面容器（面包屑 + 标题）
│   │   ├── SearchForm.tsx        # 通用搜索表单
│   │   ├── StatusTag.tsx         # 状态标签
│   │   ├── ConfirmButton.tsx     # 带确认弹窗的操作按钮
│   │   ├── ImageUpload.tsx       # 图片上传（OSS 直传）
│   │   └── FileImport.tsx        # 文件导入（Excel 上传 + 进度）
│   ├── services/                 # API 接口层（按模块分文件）
│   │   ├── auth.ts               # 登录/登出
│   │   ├── dashboard.ts
│   │   ├── conversations.ts
│   │   ├── orders.ts
│   │   ├── users.ts
│   │   ├── content.ts
│   │   ├── quiz.ts
│   │   ├── coupons.ts
│   │   ├── agreements.ts
│   │   ├── competition.ts
│   │   └── settings.ts
│   ├── hooks/                    # 全局自定义 Hook
│   │   ├── useAuth.ts            # 认证状态
│   │   ├── usePermission.ts      # 权限判断
│   │   ├── usePagination.ts      # 分页列表通用逻辑
│   │   └── useExport.ts          # Excel 导出
│   ├── stores/                   # 全局状态（Zustand）
│   │   ├── authStore.ts          # 登录态 + 当前管理员信息
│   │   └── appStore.ts           # 全局 UI 状态（侧边栏折叠、主题）
│   ├── types/                    # TypeScript 类型定义
│   │   ├── api.ts                # API 统一响应类型
│   │   ├── user.ts
│   │   ├── order.ts
│   │   └── ...
│   ├── utils/                    # 纯工具函数（无副作用、无 API 调用）
│   │   ├── format.ts             # 日期/金额格式化
│   │   ├── validator.ts          # 表单校验规则
│   │   ├── download.ts           # 文件下载
│   │   └── tree.ts               # 树形数据处理
│   └── styles/                   # 全局样式
│       ├── variables.css         # CSS 变量（主题色、间距）
│       └── global.css            # 全局样式重置
├── mock/                         # Mock 数据（API 未就绪时的开发用）
│   ├── dashboard.ts
│   ├── orders.ts
│   └── ...
└── tests/                        # 测试
    ├── setup.ts
    └── ...
```

### 目录职责约束

| 目录 | 可以 | 禁止 |
|------|------|------|
| `pages/` | 页面布局、组合组件、调用 Hook/service | 直接操作 HTTP 请求、包含复杂业务逻辑 |
| `components/` | 纯 UI 渲染、接收 props、触发回调 | 直接调用 API、包含页面级逻辑 |
| `services/` | 封装 HTTP 请求、返回 Promise | 包含 UI 逻辑、操作 DOM |
| `hooks/` | 封装可复用逻辑、管理副作用 | 包含 JSX 渲染 |
| `stores/` | 全局状态存储和更新 | 包含 UI 逻辑、API 调用（通过 service 层） |
| `types/` | 类型/接口定义 | 包含运行时逻辑 |
| `utils/` | 纯函数、无状态工具 | API 调用、直接操作 DOM |
| `core/` | 全局配置和基础设施 | 业务逻辑 |
| `layouts/` | 页面布局框架、导航 | 业务逻辑 |

---

## 3. 模块分层规范

每个业务模块横跨多层，结构如下：

```
模块示例: 订单管理 (orders)
─────────────────────────
pages/orders/index.tsx      →  页面布局 + 组合组件
pages/orders/components/*   →  订单私有组件（订单表格、退款弹窗）
services/orders.ts           →  API 调用封装
hooks/usePagination.ts      →  分页逻辑（通用）
types/order.ts              →  Order, OrderFilter, OrderDetail 类型
stores/authStore.ts         →  当前操作员信息（全局共享）
```

### services/ 层规范

```typescript
// services/orders.ts
import request from '@/core/request'
import type { Order, OrderFilter, OrderListResponse, PageParams } from '@/types'

export const orderService = {
  /** 获取订单列表 */
  async list(params: OrderFilter & PageParams): Promise<OrderListResponse> {
    return request.get('/admin/orders', { params })
  },

  /** 获取订单详情 */
  async detail(id: number): Promise<Order> {
    return request.get(`/admin/orders/${id}`)
  },

  /** 退款 */
  async refund(id: number, reason: string): Promise<void> {
    return request.post(`/admin/orders/${id}/refund`, { reason })
  },

  /** 导出 */
  async export(params: OrderFilter): Promise<Blob> {
    return request.get('/admin/orders/export', { params, responseType: 'blob' })
  },
}
```

规则：
- 每个 service 模块返回一个服务对象，方法按资源操作分组
- 方法签名接受业务参数，返回 Promise，不操作 UI 状态
- 不处理 HTTP 错误（由 `core/request.ts` 的拦截器统一处理）
- URL 路径使用 kebab-case，与后端保持一致

### core/request.ts 规范

```typescript
// core/request.ts
import axios from 'axios'
import { getToken, clearToken } from './auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

// 请求拦截：注入 JWT
request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一错误处理
request.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code !== 200 && data.code !== 201) {
      // 业务错误统一提示
      message.error(data.message)
      return Promise.reject(new Error(data.message))
    }
    return data.data  // 解包，业务代码直接拿到 data 内容
  },
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      window.location.href = '/admin/login'
    }
    message.error(error.message || '网络错误')
    return Promise.reject(error)
  },
)

export default request
```

规则：
- 请求拦截器负责注入 token
- 响应拦截器负责统一错误处理 + 401 跳转登录
- 业务代码只处理成功路径，不写 try-catch 做消息提示

### pages/ 层规范

```typescript
// pages/orders/index.tsx
import { useState } from 'react'
import { Table, Button, Space, Tag, Input, DatePicker } from 'antd'
import { usePagination } from '@/hooks/usePagination'
import { orderService } from '@/services/orders'
import { usePermission } from '@/hooks/usePermission'
import RefundModal from './components/RefundModal'

export default function OrderList() {
  const [filters, setFilters] = useState<OrderFilter>({})
  const { data, loading, pagination, refresh } = usePagination(
    (page) => orderService.list({ ...filters, ...page })
  )
  const canRefund = usePermission('order:refund')

  const columns = [
    // ...列定义
  ]

  return (
    <PageContainer title="订单管理">
      {/* 筛选栏 */}
      {/* 表格 */}
      {/* 退款弹窗 */}
    </PageContainer>
  )
}
```

规则：
- Page 组件负责组装子组件，不写具体的 API 调用或数据处理逻辑
- 复杂业务逻辑抽到自定义 Hook 中
- 弹窗/抽屉等交互组件拆分到 `components/` 子目录

### components/ 层规范

```typescript
// components/StatusTag.tsx
import { Tag } from 'antd'

const statusMap: Record<OrderStatus, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待支付' },
  paid: { color: 'blue', text: '已支付' },
  completed: { color: 'green', text: '已完成' },
  refunded: { color: 'red', text: '已退款' },
}

export default function StatusTag({ status }: { status: OrderStatus }) {
  const config = statusMap[status]
  return <Tag color={config?.color}>{config?.text ?? '未知'}</Tag>
}
```

规则：
- 组件仅做 UI 渲染，通过 props 接收数据，通过回调返回事件
- 不访问全局 Store（除非是 authStore 这种全局不变的）
- 不直接调用 API

---

## 4. 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | PascalCase（组件）/ camelCase（非组件） | `OrderList.tsx`, `useAuth.ts`, `format.ts` |
| 目录名 | kebab-case | `customer-service/`, `points-coupons/` |
| 组件名 | PascalCase | `OrderList`, `StatusTag`, `SearchForm` |
| 函数/方法 | camelCase | `getUserById()`, `handleSubmit()` |
| 变量 | camelCase | `userId`, `accessToken` |
| 常量 | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE`, `DEFAULT_SORT_FIELD` |
| TypeScript 接口 | PascalCase | `Order`, `OrderFilter`, `PageParams` |
| TypeScript 枚举 | PascalCase | `OrderStatus`, `UserRole` |
| API 路径 | kebab-case | `/admin/points-coupons`, `/admin/customer-service` |
| 环境变量 | UPPER_SNAKE_CASE + VITE_ 前缀 | `VITE_API_BASE_URL`, `VITE_OSS_BUCKET` |
| CSS 类名 | kebab-case | `.stat-card`, `.page-container` |

### TypeScript 接口命名约定

| 后缀/前缀 | 用途 |
|-----------|------|
| `*Filter` | 筛选条件 |
| `*Params` | 请求参数 |
| `*Response` | API 响应类型 |
| `*ListResponse` | 分页列表响应 |
| `I*` | 接口（仅在需要与 class 区分时使用） |

---

## 5. API 对接规范

### 5.1 统一响应格式

后端返回统一格式：

```json
{
  "code": 200,
  "message": "ok",
  "data": { ... }
}
```

`core/request.ts` 的响应拦截器已做解包处理，service 层和 page 层直接拿到 `data` 内容，无需处理 `code` 和 `message`。

### 5.2 分页响应格式

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "items": [...],
    "total": 150,
    "page": 1,
    "page_size": 20
  }
}
```

Page 层使用 `usePagination` Hook 封装分页逻辑：

```typescript
const { data, loading, pagination, refresh } = usePagination(
  (page) => orderService.list({ ...filters, ...page })
)

// pagination 直接传给 Ant Design Table
<Table
  dataSource={data?.items}
  loading={loading}
  pagination={{
    ...pagination,
    total: data?.total,
  }}
/>
```

### 5.3 接口定义方法

```typescript
// types/api.ts — 通用 API 类型
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface PageParams {
  page?: number
  page_size?: number
}
```

---

## 6. 组件编写规范

### 6.1 函数组件 + Hooks

所有组件使用函数组件，不使用 Class 组件。一个组件文件 200 行以内为佳，超过则考虑拆分。

### 6.2 组件导出

- 页面组件使用默认导出（路由懒加载兼容）
- 共享组件使用命名导出

```typescript
// pages/orders/index.tsx
export default function OrderList() { ... }

// components/StatusTag.tsx
export function StatusTag({ status }: StatusTagProps) { ... }
```

### 6.3 Props 类型

Props 类型始终显式定义，不使用 `any`：

```typescript
interface StatusTagProps {
  status: OrderStatus
  size?: 'small' | 'default'
}

export function StatusTag({ status, size = 'default' }: StatusTagProps) {
  // ...
}
```

### 6.4 Ant Design 使用规范

- Table 优先使用 ProTable 模式的封装（分页/筛选/排序）
- Form 统一使用 `antd` 的 `Form` + `Form.Item`，校验规则集中定义在 `utils/validator.ts`
- Modal/Drawer 的打开/关闭状态用 `useState` 管理，不放到全局 store
- message/notification 统一在 `core/request.ts` 拦截器中使用，page 层不重复调用

---

## 7. 状态管理规范

### 7.1 Zustand Store

```typescript
// stores/authStore.ts
import { create } from 'zustand'

interface AuthState {
  token: string | null
  admin: AdminInfo | null
  permissions: string[]
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (code: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  admin: null,
  permissions: [],

  login: async (username, password) => {
    const data = await authService.login(username, password)
    set({ token: data.token, admin: data.admin, permissions: data.permissions })
  },

  logout: () => {
    set({ token: null, admin: null, permissions: [] })
  },

  hasPermission: (code) => get().permissions.includes(code),
}))
```

### 7.2 状态作用域

| 状态类型 | 存放位置 |
|---------|---------|
| 登录态/管理员信息/权限列表 | Zustand authStore |
| 侧边栏折叠/主题 | Zustand appStore |
| 页面筛选条件 | Page 组件 useState |
| 弹窗开关 | Page 组件 useState |
| 表单数据 | Ant Design Form 实例 |
| 表格分页/排序 | usePagination Hook |

规则：
- 只有跨页面共享的状态才放到 Zustand
- 页面本地状态用 `useState`，不污染全局 Store
- 表单状态归 Form 实例管理，不手动维护

---

## 8. 配置管理规范

### 8.1 环境变量

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8000
VITE_OSS_BUCKET=dev-assets
VITE_APP_TITLE=小程序平台管理后台

# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_OSS_BUCKET=prod-assets
VITE_APP_TITLE=小程序平台管理后台
```

### 8.2 规则

- 所有环境相关键值通过 `.env.*` 管理
- 业务代码中**严禁直接写死 URL**
- 始终通过 `import.meta.env.VITE_*` 访问
- `.env.example` 作为模板提交，`.env.development` 和 `.env.production` 不提交（或仅提交不含密钥的版本）
- Vite 环境变量必须以 `VITE_` 前缀暴露给前端代码

---

## 9. 错误处理规范

### 9.1 统一处理（core/request.ts 拦截器）

- **业务错误**（非 200 code）：拦截器统一 `message.error`，业务代码不重复提示
- **401 未认证**：拦截器清除 token，跳转登录页
- **网络错误/500**：拦截器统一提示"服务异常，请稍后重试"

### 9.2 特殊降级

仅在需要特殊降级逻辑时，才在 service 或 page 中捕获异常：

```typescript
// 示例：导出失败时不弹错误弹窗，改为静默降级
try {
  await orderService.export(filters)
} catch {
  // 已通过拦截器提示，此处仅做额外降级
  setIsExporting(false)
}
```

### 9.3 规则

- Page/Component 层不写 try-catch 做错误提示（拦截器已处理）
- Service 层不捕获异常直接抛出
- 仅在需要特殊降级/状态恢复时才捕获

---

## 10. 路由与权限规范

### 10.1 路由配置

```typescript
// routes.tsx
import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const Dashboard = lazy(() => import('@/pages/dashboard'))
const OrderList = lazy(() => import('@/pages/orders'))

export interface AppRoute extends RouteObject {
  meta?: {
    title: string
    permission?: string      // 所需权限码
    icon?: string            // 侧边栏图标
    hidden?: boolean         // 是否在侧边栏隐藏
  }
  children?: AppRoute[]
}

export const routes: AppRoute[] = [
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
        meta: { title: '数据看板', icon: 'DashboardOutlined', permission: 'dashboard:view' },
      },
      {
        path: 'orders',
        meta: { title: '订单管理', icon: 'ShoppingOutlined' },
        children: [
          {
            index: true,
            element: <OrderList />,
            meta: { permission: 'order:list' },
          },
          {
            path: 'detail/:id',
            element: <OrderDetail />,
            meta: { title: '订单详情', hidden: true, permission: 'order:detail' },
          },
        ],
      },
    ],
  },
  { path: '/admin/login', element: <LoginLayout /> },
]
```

### 10.2 路由守卫

```typescript
// components/AuthGuard.tsx
export default function AuthGuard() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
```

### 10.3 权限控制

```typescript
// hooks/usePermission.ts
export function usePermission(code: string): boolean {
  return useAuthStore((s) => s.hasPermission(code))
}

// 使用方式
const canDelete = usePermission('order:delete')

{canDelete && <Button danger>删除</Button>}
```

---

## 11. 代码审查清单

- [ ] 文件名和目录名符合命名规范
- [ ] Page 组件不包含 API 调用逻辑（由 service 和 hook 处理）
- [ ] Component 组件通过 props 通信，不直接访问 store
- [ ] TypeScript 类型显式定义，无 `any`
- [ ] Service 方法不处理 UI 状态和错误提示
- [ ] 环境变量通过 `import.meta.env.VITE_*` 访问，不硬编码
- [ ] 表单校验规则在 `utils/validator.ts` 中集中定义
- [ ] 页面本地状态用 `useState`，不污染全局 store
- [ ] `useEffect` 依赖数组完整，无遗漏
- [ ] 列表渲染有稳定的 `key`
- [ ] 新模块的 service 在对应文件中独立导出
- [ ] 依赖方向正确：pages → components/hooks/services

---

## 12. Git 规范

### 12.1 分支策略

- `main` — 生产就绪，通过 PR 合并，禁止直接推送
- `develop` — 开发主线
- `feature/<module>` — 新功能模块，如 `feature/order-management`
- `fix/<description>` — Bug 修复

### 12.2 Commit 格式

```
<type>(<scope>): <subject>

type: feat | fix | refactor | style | docs | chore | perf | test
scope: page | component | service | hook | store | config | docs
subject: 简短描述（中文，限 72 字符内）
```

示例：
```
feat(page): 实现订单管理列表页 + 退款弹窗
fix(service): 修复订单导出筛选项日期格式问题
chore(config): 新增生产环境 OSS 配置变量
```

---

## 13. Mock 数据规范

API 未就绪时，使用 `mock/` 目录存放 Mock 数据：

```typescript
// mock/orders.ts
import type { Order, OrderListResponse } from '@/types'

export const mockOrders: Order[] = [
  { id: 1, order_no: 'ORD20260608001', status: 'paid', amount: 120000, user_name: '张三', created_at: '2026-06-08T10:00:00Z' },
]

export function mockOrderList(): OrderListResponse {
  return { items: mockOrders, total: 1, page: 1, page_size: 20 }
}
```

---

> **参考依据**：后端项目 [DEVELOPMENT_STANDARDS.md](../../Backend/docs/DEVELOPMENT_STANDARDS.md)
> **编制日期**：2026-05-14
