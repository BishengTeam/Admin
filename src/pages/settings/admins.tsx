import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { usePagination } from '@/hooks/usePagination'
import { useReauthentication } from '@/hooks/useReauthentication'
import { adminManagementService } from '@/services/adminManagement'
import { isApiError, isPermissionError } from '@/core/request'
import { clearReauthCredential } from '@/core/reauth'
import { ADMIN_CREATABLE_ROLE_OPTIONS, ADMIN_ROLE_LABELS, getAdminRoleLabel } from '@/core/permission'
import { formatDate } from '@/utils/format'
import type {
  AdminAccount,
  AdminAccountFilters,
  AdminAccountMutationResult,
  AdminCreatableRole,
  AdminPermissionCatalog,
  AdminSettingsAccount,
} from '@/types/admin'

const { Paragraph, Text } = Typography

interface AdminCreateValues {
  username: string
  display_name: string
  role: AdminCreatableRole
  permissions: string[]
}

interface AdminEditValues {
  display_name: string
  permissions: string[]
}

const booleanOptions = [
  { label: '是', value: true },
  { label: '否', value: false },
]

// 默认只看启用账号：停用账号仍可查（启用选「否」或清空），只是不占默认视图
const DEFAULT_FILTERS: AdminAccountFilters = { is_active: true }

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : '操作失败，请稍后重试'
}

function handleMutationError(error: unknown): void {
  if (isPermissionError(error)) clearReauthCredential()
  message.error(errorMessage(error))
}

export function isAdminLocked(admin: AdminAccount, now = Date.now()): boolean {
  return Boolean(admin.is_active && admin.locked_until && new Date(admin.locked_until).getTime() > now)
}

export function getAdminStatus(admin: AdminAccount): { text: string; color: string } {
  if (!admin.is_active) return { text: '已停用', color: 'default' }
  if (isAdminLocked(admin)) return { text: '临时锁定', color: 'error' }
  if (admin.must_change_password) return { text: '待首次改密', color: 'warning' }
  return { text: '正常', color: 'success' }
}

function TemporaryPasswordModal({
  result,
  onClose,
}: {
  result: AdminAccountMutationResult | null
  onClose: () => void
}) {
  return (
    <Modal
      title="一次性临时密码"
      open={Boolean(result)}
      footer={<Button type="primary" onClick={onClose}>我已安全保存</Button>}
      closable={false}
      maskClosable={false}
    >
      {result && (
        <>
          <Alert
            type="warning"
            showIcon
            message="此密码关闭后不再显示"
            description="请通过安全的线下方式交付给管理员。对方首次登录后必须立即修改密码。"
            style={{ marginBottom: 16 }}
          />
          <Paragraph>账号：<Text strong>{result.admin.username}</Text></Paragraph>
          <Paragraph>
            临时密码：<Text code copyable>{result.temporary_password}</Text>
          </Paragraph>
        </>
      )}
    </Modal>
  )
}

function ReadonlySuperAdminActions() {
  const reason = '系统唯一超级管理员只能通过本人账号菜单修改密码，不能在管理员列表中变更'
  return (
    <Tooltip title={reason}>
      <span>
        <Space size={0}>
          <Button type="link" size="small" disabled>编辑</Button>
          <Button type="link" size="small" disabled>停用</Button>
          <Button type="link" size="small" disabled>重置密码</Button>
        </Space>
      </span>
    </Tooltip>
  )
}

// 受控分组勾选：作为 Form.Item 的单一子元素，由 antd 注入 value/onChange。
function PermissionCheckboxes({
  value = [],
  onChange,
  catalog,
}: {
  value?: string[]
  onChange?: (next: string[]) => void
  catalog: AdminPermissionCatalog
}) {
  const toggle = (permission: string, checked: boolean) => {
    onChange?.(checked ? [...value, permission] : value.filter((item) => item !== permission))
  }
  return (
    <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: '8px 12px' }}>
      {catalog.groups.map((group) => {
        const groupValues = group.permissions.map((item) => item.permission)
        const allChecked = groupValues.every((item) => value.includes(item))
        return (
          <div key={group.key} style={{ marginBottom: 8 }}>
            <Space size={8}>
              <Checkbox
                checked={allChecked}
                indeterminate={!allChecked && groupValues.some((item) => value.includes(item))}
                onChange={(event) => {
                  const next = event.target.checked
                    ? Array.from(new Set([...value, ...groupValues]))
                    : value.filter((item) => !groupValues.includes(item))
                  onChange?.(next)
                }}
              >
                <Text strong>{group.label}</Text>
              </Checkbox>
            </Space>
            <div style={{ paddingLeft: 24 }}>
              <Checkbox.Group
                options={group.permissions.map((item) => ({ label: item.label, value: item.permission }))}
                value={groupValues.filter((item) => value.includes(item))}
                onChange={(next) => onChange?.([...next, ...value.filter((item) => !groupValues.includes(item))])}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminAccountsPage() {
  const [filters, setFilters] = useState<AdminAccountFilters>(DEFAULT_FILTERS)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AdminSettingsAccount | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<AdminAccountMutationResult | null>(null)
  const [mutationKey, setMutationKey] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<AdminPermissionCatalog | null>(null)
  const [createForm] = Form.useForm<AdminCreateValues>()
  const [editForm] = Form.useForm<AdminEditValues>()
  const [searchForm] = Form.useForm<AdminAccountFilters>()
  const { ensureReauthenticated, reauthDialog } = useReauthentication()

  const { data, loading, pagination, refresh } = usePagination(
    (page, signal) => adminManagementService.listAdmins({ ...filters, ...page }, signal),
    [JSON.stringify(filters)],
  )

  useEffect(() => {
    const controller = new AbortController()
    adminManagementService.getPermissionCatalog(controller.signal)
      .then((value) => setCatalog(value))
      .catch((error) => {
        if (!controller.signal.aborted) message.warning(`权限目录加载失败：${errorMessage(error)}`)
      })
    return () => controller.abort()
  }, [])

  const applyRolePreset = useCallback((role: AdminCreatableRole) => {
    if (!catalog) return
    createForm.setFieldValue('permissions', catalog.role_presets[role] ?? [])
  }, [catalog, createForm])

  const finishMutation = useCallback(async (successText: string) => {
    message.success(successText)
    await refresh()
  }, [refresh])

  const runHighRisk = useCallback(async <T,>(
    key: string,
    action: (reauthToken: string) => Promise<T>,
  ): Promise<T | null> => {
    const token = await ensureReauthenticated()
    if (!token) return null
    setMutationKey(key)
    try {
      return await action(token)
    } catch (error) {
      handleMutationError(error)
      return null
    } finally {
      setMutationKey(null)
    }
  }, [ensureReauthenticated])

  const submitCreate = async () => {
    const values = await createForm.validateFields()
    // 目录未加载时不带 permissions（服务端存 NULL、跟随角色预设），优雅降级
    const payload = {
      username: values.username.trim().toLowerCase(),
      display_name: values.display_name.trim(),
      role: values.role,
      ...(catalog ? { permissions: values.permissions ?? [] } : {}),
    }
    const result = await runHighRisk('create', (token) => adminManagementService.createAdmin(payload, token))
    if (!result) return
    setCreateOpen(false)
    createForm.resetFields()
    applyRolePreset('quiz_admin')
    setTemporaryPassword(result)
    await finishMutation('管理员已创建')
  }

  const openEdit = (admin: AdminSettingsAccount) => {
    setEditing(admin)
    editForm.setFieldsValue({ display_name: admin.display_name, permissions: admin.permissions })
  }

  const submitEdit = async () => {
    if (!editing) return
    const values = await editForm.validateFields()
    const payload: { display_name: string; permissions?: string[] } = {
      display_name: values.display_name.trim(),
    }
    if (catalog) payload.permissions = values.permissions ?? []
    const result = await runHighRisk(
      `edit-${editing.id}`,
      (token) => adminManagementService.updateAdmin(editing.id, payload, token),
    )
    if (!result) return
    setEditing(null)
    editForm.resetFields()
    await finishMutation('管理员已更新')
  }

  const confirmHighRiskAction = async (
    admin: AdminAccount,
    action: 'disable' | 'enable' | 'reset' | 'unlock',
  ) => {
    const config = {
      disable: {
        title: `停用管理员「${admin.display_name}」？`,
        content: '停用后，该账号的全部现有会话将立即失效，且无法继续登录。',
        okText: '确认停用',
      },
      enable: {
        title: `重新启用管理员「${admin.display_name}」？`,
        content: '启用会使全部旧会话继续保持失效，并生成只显示一次的新临时密码。',
        okText: '确认启用',
      },
      reset: {
        title: `重置管理员「${admin.display_name}」的密码？`,
        content: '重置后，该账号的全部现有会话将立即失效，并生成只显示一次的新临时密码。',
        okText: '确认重置',
      },
      unlock: {
        title: `解除管理员「${admin.display_name}」的临时锁定？`,
        content: '解除锁定不会启用已停用账号，也不会更改管理员密码。',
        okText: '确认解锁',
      },
    }[action]

    const token = await ensureReauthenticated()
    if (!token) return

    Modal.confirm({
      title: config.title,
      content: config.content,
      okText: config.okText,
      cancelText: '取消',
      okButtonProps: action === 'disable' || action === 'reset' ? { danger: true } : undefined,
      onOk: async () => {
        const key = `${action}-${admin.id}`
        setMutationKey(key)
        try {
          if (action === 'disable') {
            await adminManagementService.disableAdmin(admin.id, token)
            await finishMutation('管理员已停用，列表默认只显示启用账号')
          } else if (action === 'unlock') {
            await adminManagementService.unlockAdmin(admin.id, token)
            await finishMutation('临时锁定已解除')
          } else {
            const result = action === 'enable'
              ? await adminManagementService.enableAdmin(admin.id, token)
              : await adminManagementService.resetPassword(admin.id, token)
            setTemporaryPassword(result)
            await finishMutation(action === 'enable' ? '管理员已重新启用' : '管理员密码已重置')
          }
        } catch (error) {
          handleMutationError(error)
          if (isPermissionError(error)) return
          throw error
        } finally {
          setMutationKey(null)
        }
      },
    })
  }

  const columns: ColumnsType<AdminSettingsAccount> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '用户名', dataIndex: 'username', width: 150 },
    { title: '显示名', dataIndex: 'display_name', width: 150 },
    {
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (role: AdminAccount['role']) => (
        <Tag color={role === 'super_admin' ? 'gold' : 'blue'}>{getAdminRoleLabel(role)}</Tag>
      ),
    },
    {
      title: '权限',
      width: 130,
      render: (_, admin: AdminSettingsAccount) => admin.role === 'super_admin'
        ? <Tag color="gold">全部权限</Tag>
        : (
          <Space size={4}>
            <span>{admin.permissions.length} 项</span>
            <Tag color={admin.permissions_source === 'override' ? 'processing' : 'default'}>
              {admin.permissions_source === 'override' ? '自定义' : '预设'}
            </Tag>
          </Space>
        ),
    },
    {
      title: '综合状态',
      width: 130,
      render: (_, admin) => {
        const status = getAdminStatus(admin)
        return <Tag color={status.color}>{status.text}</Tag>
      },
    },
    {
      title: '最近登录',
      dataIndex: 'last_login_at',
      width: 175,
      render: (value: string | null) => value ? formatDate(value) : '从未登录',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 175,
      render: (value: string) => formatDate(value),
    },
    {
      title: '操作',
      fixed: 'right',
      width: 330,
      render: (_, admin) => {
        if (admin.role === 'super_admin') return <ReadonlySuperAdminActions />
        const locked = isAdminLocked(admin)
        return (
          <Space size={0} wrap>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(admin)}>
              编辑
            </Button>
            {admin.is_active ? (
              <Button
                type="link"
                size="small"
                danger
                icon={<StopOutlined />}
                loading={mutationKey === `disable-${admin.id}`}
                onClick={() => void confirmHighRiskAction(admin, 'disable')}
              >
                停用
              </Button>
            ) : (
              <Button
                type="link"
                size="small"
                icon={<ReloadOutlined />}
                loading={mutationKey === `enable-${admin.id}`}
                onClick={() => void confirmHighRiskAction(admin, 'enable')}
              >
                重新启用
              </Button>
            )}
            {admin.is_active && (
              <Button
                type="link"
                size="small"
                danger
                icon={<LockOutlined />}
                loading={mutationKey === `reset-${admin.id}`}
                onClick={() => void confirmHighRiskAction(admin, 'reset')}
              >
                重置密码
              </Button>
            )}
            {locked && (
              <Button
                type="link"
                size="small"
                icon={<UnlockOutlined />}
                loading={mutationKey === `unlock-${admin.id}`}
                onClick={() => void confirmHighRiskAction(admin, 'unlock')}
              >
                解除锁定
              </Button>
            )}
          </Space>
        )
      },
    },
  ]

  const applyFilters = (values: AdminAccountFilters) => {
    setFilters({
      search: values.search?.trim() || undefined,
      role: values.role,
      is_active: values.is_active,
      is_locked: values.is_locked,
      must_change_password: values.must_change_password,
    })
  }

  return (
    <PageContainer
      title="管理员账号"
      extra={(
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setCreateOpen(true); createForm.setFieldsValue({ role: 'quiz_admin' }); applyRolePreset('quiz_admin') }}
          >
            创建管理员
          </Button>
        </Space>
      )}
    >

      <Form<AdminAccountFilters> form={searchForm} layout="inline" initialValues={DEFAULT_FILTERS} onFinish={applyFilters} style={{ rowGap: 12, marginBottom: 16 }}>
        <Form.Item name="search" label="账号">
          <Input allowClear placeholder="用户名或显示名" style={{ width: 190 }} />
        </Form.Item>
        <Form.Item name="role" label="角色">
          <Select allowClear placeholder="全部" style={{ width: 160 }} options={
            Object.entries(ADMIN_ROLE_LABELS).map(([value, label]) => ({ value, label }))
          } />
        </Form.Item>
        <Form.Item name="is_active" label="启用">
          <Select allowClear placeholder="全部" style={{ width: 100 }} options={booleanOptions} />
        </Form.Item>
        <Form.Item name="is_locked" label="锁定">
          <Select allowClear placeholder="全部" style={{ width: 100 }} options={booleanOptions} />
        </Form.Item>
        <Form.Item name="must_change_password" label="待首次改密">
          <Select allowClear placeholder="全部" style={{ width: 100 }} options={booleanOptions} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={() => { searchForm.resetFields(); setFilters({ ...DEFAULT_FILTERS }) }}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table<AdminSettingsAccount>
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={loading}
        pagination={pagination}
        scroll={{ x: 1280 }}
      />

      <Modal
        title="创建管理员"
        open={createOpen}
        okText="创建"
        cancelText="取消"
        confirmLoading={mutationKey === 'create'}
        maskClosable={false}
        onOk={() => void submitCreate()}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); applyRolePreset('quiz_admin') }}
      >
        <Paragraph type="secondary">系统将生成只显示一次的临时密码；新管理员首次登录时必须修改。</Paragraph>
        <Form<AdminCreateValues>
          form={createForm}
          layout="vertical"
          initialValues={{ role: 'quiz_admin' }}
          onValuesChange={(changed) => {
            if ('role' in changed && typeof changed.role === 'string') applyRolePreset(changed.role as AdminCreatableRole)
          }}
        >
          <Form.Item
            name="role"
            label="管理员角色"
            rules={[{ required: true, message: '请选择管理员角色' }]}
            extra="角色决定权限预设模板；切换角色会按预设重填下方勾选"
          >
            <Select
              options={[...ADMIN_CREATABLE_ROLE_OPTIONS]}
              placeholder="请选择管理员角色"
            />
          </Form.Item>
          <Form.Item
            name="username"
            label="登录用户名"
            normalize={(value: string) => value?.toLowerCase()}
            rules={[
              { required: true, message: '请输入登录用户名' },
              { min: 4, max: 32, message: '用户名长度必须为 4～32 位' },
              { pattern: /^[a-z][a-z0-9._-]*$/, message: '必须以小写字母开头，只能包含小写字母、数字、点、下划线和短横线' },
            ]}
          >
            <Input autoComplete="off" placeholder="例如 quiz.operator" />
          </Form.Item>
          <Form.Item name="display_name" label="管理员显示名" rules={[
            { required: true, whitespace: true, message: '请输入管理员显示名' },
            { max: 64, message: '显示名不能超过 64 个字符' },
          ]}>
            <Input autoComplete="off" placeholder="用于顶部账号区域和审计记录" />
          </Form.Item>
          <Form.Item
            name="permissions"
            label="权限勾选"
          >
            {catalog ? (
              <PermissionCheckboxes catalog={catalog} />
            ) : (
              <Alert type="info" showIcon message="权限目录加载中或加载失败" description="暂不提交权限时，新账号将默认跟随角色预设；可稍后重新打开本弹窗重试。" />
            )}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`编辑管理员 · ${editing?.username ?? ''}`}
        open={Boolean(editing)}
        okText="保存"
        cancelText="取消"
        confirmLoading={Boolean(editing && mutationKey === `edit-${editing.id}`)}
        onOk={() => void submitEdit()}
        onCancel={() => { setEditing(null); editForm.resetFields() }}
      >
        <Form<AdminEditValues> form={editForm} layout="vertical">
          <Form.Item name="display_name" label="管理员显示名" rules={[
            { required: true, whitespace: true, message: '请输入管理员显示名' },
            { max: 64, message: '显示名不能超过 64 个字符' },
          ]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="permissions"
            label={(() => {
              const source = editing?.permissions_source
              const text = source === 'override' ? '当前为自定义权限' : source === 'wildcard' ? '超级管理员' : '当前跟随角色预设'
              return (
                <Space size={8}>
                  <span>权限勾选</span>
                  <Tag color={source === 'override' ? 'processing' : source === 'wildcard' ? 'gold' : 'default'}>{text}</Tag>
                </Space>
              )
            })()}
            extra={editing?.permissions_source !== 'override' ? '保存后将以勾选结果覆盖预设；勾选结果即最终权限' : undefined}
          >
            {catalog ? (
              <PermissionCheckboxes catalog={catalog} />
            ) : (
              <Alert type="info" showIcon message="权限目录加载中或加载失败" description="本次保存将不修改权限，仅更新显示名。" />
            )}
          </Form.Item>
        </Form>
      </Modal>

      <TemporaryPasswordModal result={temporaryPassword} onClose={() => setTemporaryPassword(null)} />
      {reauthDialog}
    </PageContainer>
  )
}
