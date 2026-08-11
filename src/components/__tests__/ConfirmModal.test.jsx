import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ConfirmModal } from '../ConfirmModal'

afterEach(cleanup)

describe('ConfirmModal', () => {
  it('renders the title and message', () => {
    render(
      <ConfirmModal
        title="Delete regatta"
        message='Are you sure you want to permanently delete "Test Regatta"? This cannot be undone.'
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Delete regatta')).toBeTruthy()
    expect(
      screen.getByText('Are you sure you want to permanently delete "Test Regatta"? This cannot be undone.'),
    ).toBeTruthy()
  })

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmModal title="Delete regatta" message="Sure?" confirmLabel="Delete" onConfirm={onConfirm} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose (not onConfirm) when Cancel is clicked', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<ConfirmModal title="Delete regatta" message="Sure?" onConfirm={onConfirm} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
