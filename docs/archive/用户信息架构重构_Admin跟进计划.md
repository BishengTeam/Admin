# 用户信息架构重构 — Admin 后台跟进计划

> 归档于 2026-08-09：该跟进计划已经由现行用户审核与人社专用流程取代。

> 日期：2026-06-10
> 前提：后端按 [`用户信息架构重构方案.md`](用户信息架构重构方案.md) 完成迁移后，Admin 前端跟进。

---

## 前置依赖

| 依赖项 | 说明 | 负责方 |
|--------|------|--------|
| 数据库迁移完成 | 新增 `user_profile` / `user_realname` / `user_student` / `user_enterprise` 表 | 后端 |
| 新增管理端 API | `student/review` / `enterprise/review` 端点 | 后端 |
| `GET /admin/users/{id}/profile` 返回新聚合结构 | 适配 level-1 + level-2 分离 | 后端 |
| `GET /admin/users` 列表新增 `identity_status` 拆分字段 | 适配审核分三类 | 后端 |

---

## Phase 1: 类型与服务层适配

- [ ] **1.1 更新 `UserProfileDetail` 类型**  
  适配后端新聚合结构：`profile` (level-1) + `realname` (实名) + `student` / `enterprise` (互斥)

- [ ] **1.2 新增审核子类型**  
  `StudentInfo` / `EnterpriseInfo`，各自包含 `status: 'pending' | 'verified' | 'rejected'` 和 `verified_at`

- [ ] **1.3 更新 `UserDetail` 类型**  
  `identity?` → `realname?` + `student?` + `enterprise?`

- [ ] **1.4 新增 service 方法**  
  `reviewStudent(id, { status, comment? })` → `PUT /admin/users/{id}/student/review`  
  `reviewEnterprise(id, { status, comment? })` → `PUT /admin/users/{id}/enterprise/review`

- [ ] **1.5 删除 `updateProfile` 方法**  
  管理员不再直接修改用户信息

- [ ] **1.6 更新列表 `User` 类型**  
  `identity_status` → 适配后端拆分后的审核状态字段

---

## Phase 2: 用户详情抽屉重构

- [ ] **2.1 资料展示区拆分**  
  当前展示和编辑混为一体。重构为三块独立展示区，各自只读展示：
  ```
  基本信息（不可变）
    openid、手机号、注册时间、账户状态

  Level-1 资料（用户自由修改，只读展示）
    nickname、邮箱、手机号

  Level-2 实名信息（待审核 / 已通过 / 已驳回）
    姓名、性别、年龄、身份证号、户籍地、证件照

  Level-2 学生信息（仅 student，待审核 / 已通过 / 已驳回）
    学历、学校、专业、学生证

  Level-2 企业信息（仅 enterprise，待审核 / 已通过 / 已驳回）
    单位名称
  ```

- [ ] **2.2 移除编辑功能**  
  删除「编辑资料」按钮、`handleStartEdit`、`handleSaveProfile`、`editForm`、`renderCell` 编辑分支

- [ ] **2.3 审核区块拆分**  
  当前只有一个「实名认证」审核区块 → 拆分为 3 个独立审核区块：
  - 实名审核：`status === 'pending'` 时显示「通过」「驳回」
  - 学生信息审核：同上
  - 企业信息审核：同上

- [ ] **2.4 驳回弹窗复用**  
  抽取 `ReviewActions` 组件或 hook，避免 3 个审核区块重复「通过/驳回」逻辑

---

## Phase 3: 列表页适配

- [ ] **3.1 审核状态列拆分**  
  当前只有一列「审核」显示 `identity_status`。重构后可能需要展示更细粒度的审核状态（具体依赖后端列表接口返回的字段）

- [ ] **3.2 列表 identity_status 批量拉取适配**  
  `useEffect` 中 `getProfile` 返回的结构变化，`identity_status` 提取逻辑需更新

---

## Phase 4: 验证

- [ ] **4.1 构建验证** — `npm run build` 无报错

- [ ] **4.2 功能验证清单**  
  - 用户列表正常加载，审核列正确显示  
  - 点击用户 → 详情抽屉正确展示三块资料区  
  - Level-1 资料区只读（无编辑按钮）  
  - 实名审核 pending → 通过/驳回正常工作  
  - 学生/企业审核 pending → 通过/驳回正常工作  
  - 驳回弹窗可输入原因（复用现有 Modal 逻辑）  
  - 关闭抽屉后列表自动刷新审核状态

---

## 涉及文件

| 文件 | Phase |
|------|-------|
| `src/types/user.ts` | 1 |
| `src/services/users.ts` | 1 |
| `src/pages/users/index.tsx` | 3 |
| `src/pages/users/components/UserDetailDrawer.tsx` | 2 |

---

## 总任务数：13

Phase 1: 6 | Phase 2: 4 | Phase 3: 2 | Phase 4: 2（含验证清单）
