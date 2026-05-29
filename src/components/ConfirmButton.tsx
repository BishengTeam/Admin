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

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popconfirm title={title} description={description} onConfirm={handleConfirm} okButtonProps={{ loading }}>
      <Button {...buttonProps}>{children}</Button>
    </Popconfirm>
  )
}
