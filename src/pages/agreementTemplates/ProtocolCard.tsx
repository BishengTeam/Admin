import { useEffect, useState } from 'react'
import { Button, Popconfirm } from 'antd'
import {
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileTextOutlined,
  HistoryOutlined,
  InboxOutlined,
  PictureOutlined,
} from '@ant-design/icons'
import type { AgreementTemplateItem, AgreementTemplateType } from '@/types/agreementTemplate'
import { formatDate } from '@/utils/format'
import styles from './index.module.css'

interface ProtocolCardProps {
  type: AgreementTemplateType
  typeText: string
  signDesc: string
  item?: AgreementTemplateItem
  canWrite: boolean
  onPreview: (item: AgreementTemplateItem) => void
  onCreate: (type: AgreementTemplateType) => void
  onEdit: (item: AgreementTemplateItem) => void
  onArchive: (item: AgreementTemplateItem) => void
  onHistory: (type: AgreementTemplateType) => void
}

export default function ProtocolCard({
  type,
  typeText,
  signDesc,
  item,
  canWrite,
  onPreview,
  onCreate,
  onEdit,
  onArchive,
  onHistory,
}: ProtocolCardProps) {
  const [coverFailed, setCoverFailed] = useState(false)
  const coverUrl = item?.cover_url ?? null

  useEffect(() => {
    setCoverFailed(false)
  }, [coverUrl])

  const showCover = Boolean(coverUrl && !coverFailed)
  const coverLabel = item
    ? `预览 ${item.title} 第 ${item.version} 版全文`
    : canWrite
      ? `创建${typeText}`
      : `${typeText}暂无生效版本`

  const actionButtons = (
    <>
      {item && (
        <Button type="text" icon={<EyeOutlined />} onClick={() => onPreview(item)}>
          预览
        </Button>
      )}
      {item && canWrite && (
        <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(item)}>
          编辑
        </Button>
      )}
      {item && canWrite && (
        <Popconfirm
          title="归档后该类型无生效模板，对应业务拦截自动放行。确定归档？"
          onConfirm={() => onArchive(item)}
        >
          <Button type="text" danger icon={<InboxOutlined />}>
            归档
          </Button>
        </Popconfirm>
      )}
      <Button type="text" icon={<HistoryOutlined />} onClick={() => onHistory(type)}>
        历史
      </Button>
    </>
  )

  return (
    <article className={styles.protocolCard} data-type={type}>
      <div className={styles.coverRegion}>
        <span
          className={
            item ? styles.statusBadge : `${styles.statusBadge} ${styles.inactiveBadge}`
          }
        >
          {item ? '生效中' : '未配置'}
        </span>

        <button
          type="button"
          className={styles.coverButton}
          onClick={() => {
            if (item) onPreview(item)
            else if (canWrite) onCreate(type)
          }}
          disabled={!item && !canWrite}
          aria-label={coverLabel}
        >
          {showCover ? (
            <img
              src={coverUrl ?? undefined}
              alt={`${item?.title ?? typeText}内容缩略图`}
              loading="lazy"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <span className={styles.coverPlaceholder}>
              {item ? <PictureOutlined /> : <FileAddOutlined />}
              <strong>{item ? '封面暂不可用' : canWrite ? '点击创建' : '暂无生效版本'}</strong>
              <span>{item ? '可点击查看协议全文' : `${typeText}尚未配置`}</span>
            </span>
          )}
        </button>

        <div className={styles.coverActions}>{actionButtons}</div>
      </div>

      <div className={styles.cardInfo}>
        <div className={styles.cardTags}>
          <span className={styles.typeTag}>{typeText}</span>
          <span className={styles.signTag}>
            <FileTextOutlined />
            {signDesc}
          </span>
        </div>
        <h3 className={styles.cardTitle}>{item?.title ?? typeText}</h3>
        <p className={styles.cardMeta}>
          {item ? (
            <>
              <span>版本 v{item.version}</span>
              <span>更新于 {formatDate(item.updated_at)}</span>
            </>
          ) : (
            <span>等待管理员配置生效版本</span>
          )}
        </p>
        <div className={styles.persistentActions}>{actionButtons}</div>
      </div>
    </article>
  )
}
