import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmButton } from '@/components/ConfirmButton'

afterEach(cleanup)

describe('ConfirmButton failure handling', () => {
  it('catches a rejected action, preserves its message and permits retry', async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error('批次配置不可发布，请重新选择项目配置')).mockResolvedValueOnce(undefined)
    render(<ConfirmButton description='确认发布？' onConfirm={action}>发布批次</ConfirmButton>)
    fireEvent.click(screen.getByRole('button', { name: '发布批次' }))
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('批次配置不可发布，请重新选择项目配置')
    expect(action).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})
