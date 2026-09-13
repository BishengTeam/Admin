import { FileAddOutlined, FileTextOutlined } from '@ant-design/icons'
import type { AgreementTemplateItem, AgreementTemplateType } from '@/types/agreementTemplate'
import styles from './index.module.css'

interface ProtocolCardProps {
  type: AgreementTemplateType
  typeText: string
  item?: AgreementTemplateItem
  canWrite: boolean
  onPreview: (item: AgreementTemplateItem) => void
  onCreate: (type: AgreementTemplateType) => void
  onHistory: (type: AgreementTemplateType) => void
}

export default function ProtocolCard({
  type,
  typeText,
  item,
  canWrite,
  onPreview,
  onCreate,
  onHistory,
}: ProtocolCardProps) {
  const coverLabel = item
    ? `预览 ${item.title} 第 ${item.version} 版全文`
    : canWrite
      ? `创建${typeText}`
      : `${typeText}暂无生效版本`

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
          {item ? (
            <span className={styles.bookCover}>
              <strong className={styles.bookTitle}>{item.title}</strong>
              <span className={styles.bookFoot}>
                {typeText} · v{item.version}
              </span>
            </span>
          ) : (
            <span className={styles.coverPlaceholder}>
              {canWrite ? <FileAddOutlined /> : <FileTextOutlined />}
              <strong>{canWrite ? '点击创建' : '暂无生效版本'}</strong>
              <span>{`${typeText}尚未配置`}</span>
            </span>
          )}
        </button>
      </div>

      {!item && (
        <button type="button" className={styles.historyLink} onClick={() => onHistory(type)}>
          查看历史
        </button>
      )}
    </article>
  )
}
