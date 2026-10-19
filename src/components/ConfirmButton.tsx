import { useState, type ReactNode } from 'react'
import { Button, Popconfirm, type ButtonProps } from 'antd'

interface ConfirmButtonProps extends Omit<ButtonProps, 'onClick'> {
  title?: string
  description: string | ReactNode
  onConfirm: () => Promise<void> | void
  children: ReactNode
}

export function ConfirmButton({
  title = '确认操作',
  description,
  onConfirm,
  children,
  ...buttonProps
}: ConfirmButtonProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [failure, setFailure] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    setFailure('')
    try {
      await onConfirm()
      setOpen(false)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : '操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popconfirm
      title={title}
      open={open}
      onOpenChange={value => { if (!loading) { setOpen(value); setFailure('') } }}
      description={<>{description}{failure && <div role='alert' style={{ color: 'var(--ant-color-error, #ff4d4f)', marginTop: 8 }}>{failure}</div>}</>}
      onCancel={() => { setOpen(false); setFailure('') }}
      okButtonProps={{ loading, onClick: event => { event.stopPropagation(); void handleConfirm() } }}
      cancelButtonProps={{ disabled: loading }}
    >
      <Button {...buttonProps}>{children}</Button>
    </Popconfirm>
  )
}
