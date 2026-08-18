import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Descriptions,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd'
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons'
import { PageContainer } from '@/components/PageContainer'
import { systemUpdateService } from '@/services/systemUpdate'
import { formatDate } from '@/utils/format'
import type { SystemUpdateCheck } from '@/types/admin'

const { Paragraph, Text } = Typography

function formatSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return '-'
  if (size >= 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(2)} GiB`
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MiB`
  if (size >= 1024) return `${(size / 1024).toFixed(2)} KiB`
  return `${size} B`
}

async function copyCommand(value: string) {
  await navigator.clipboard.writeText(value)
}

export default function SystemUpdatesPage() {
  const [result, setResult] = useState<SystemUpdateCheck | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      setResult(await systemUpdateService.check(signal))
    } catch (cause) {
      if ((cause as Error).name !== 'AbortError') {
        setError((cause as Error).message || '检查更新失败')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  return (
    <PageContainer
      title="版本与更新"
      extra={(
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void refresh()}
        >
         重新检查
        </Button>
      )}
    >
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        {error && <Alert type="error" showIcon message={error} />}
        {result?.check_status === 'unavailable' && (
          <Alert
            type="warning"
            showIcon
            message="暂时无法获取 GitHub 最新版本"
            description={`服务器会短暂缓存该结果，请稍后重试。原因代码：${result.reason_code || 'unknown'}`}
          />
        )}
        {result?.update_available && (
          <Alert
            type="info"
            showIcon
            message={`发现新版本 ${result.latest?.release_tag ?? '-'}`}
            description="后台只检查版本，不在页面内执行升级。请在后台服务器执行下方命令，并预留维护窗口。"
          />
        )}
        {result && !result.update_available && result.check_status === 'ok' && (
          <Alert type="success" showIcon message="当前已是最新正式版本" />
        )}

        {result && (
          <>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="当前 Release">
                <Tag color="blue">{result.current.release_tag}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="当前 Backend Commit">
                <Text copyable={{ text: result.current.backend_commit }}>
                  {result.current.backend_commit}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="当前 Admin Commit">
                <Text copyable={{ text: result.current.admin_commit }}>
                  {result.current.admin_commit}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="最新 Release">
                {result.latest ? (
                  <Space wrap>
                    <Tag color={result.update_available ? 'green' : 'default'}>
                      {result.latest.release_tag}
                    </Tag>
                    <span>{formatDate(result.latest.published_at)}</span>
                  </Space>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="预计停机时间">
                {Math.ceil(result.estimated_downtime_seconds / 60)} 分钟
              </Descriptions.Item>
              <Descriptions.Item label="检查时间">
                {formatDate(result.checked_at)}
              </Descriptions.Item>
            </Descriptions>

            {result.latest && (
              <Descriptions bordered size="small" column={1} title="最新版本资产">
                {result.latest.assets.map((asset) => (
                  <Descriptions.Item key={asset.name} label={asset.name}>
                    {formatSize(asset.size)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            )}

            {result.latest?.notes && (
              <div>
                <Typography.Title level={5}>Release 说明</Typography.Title>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {result.latest.notes}
                </Paragraph>
              </div>
            )}

            <div>
              <Typography.Title level={5}>1. 先执行预演</Typography.Title>
              <Space.Compact style={{ width: '100%' }}>
                <Input readOnly value={result.dry_run_command} />
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => void copyCommand(result.dry_run_command)}
                >
                  复制
                </Button>
              </Space.Compact>
            </div>

            {result.update_available && (
              <div>
                <Typography.Title level={5}>2. 维护窗口内执行升级</Typography.Title>
                <Space.Compact style={{ width: '100%' }}>
                  <Input readOnly value={result.upgrade_command} />
                  <Button
                    type="primary"
                    danger
                    icon={<CopyOutlined />}
                    onClick={() => void copyCommand(result.upgrade_command)}
                  >
                    复制
                  </Button>
                </Space.Compact>
                <Paragraph type="secondary" style={{ marginTop: 10 }}>
                  升级器会自动下载并校验资产、备份数据库、执行迁移和健康检查；失败时会恢复备份并回滚旧版本。
                </Paragraph>
              </div>
            )}
          </>
        )}
      </Space>
    </PageContainer>
  )
}
