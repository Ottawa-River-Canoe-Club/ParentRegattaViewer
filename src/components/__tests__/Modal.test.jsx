import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Modal } from '../Modal'

afterEach(cleanup)

describe('Modal', () => {
  it('renders its title and children', () => {
    render(
      <Modal title="Test Modal" onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>,
    )
    expect(screen.getByText('Test Modal')).toBeTruthy()
    expect(screen.getByText('Modal content')).toBeTruthy()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Test Modal" onClose={onClose}>
        <p>Modal content</p>
      </Modal>,
    )
    fireEvent.click(screen.getByRole('dialog').parentElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when the panel itself is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Test Modal" onClose={onClose}>
        <p>Modal content</p>
      </Modal>,
    )
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Test Modal" onClose={onClose}>
        <p>Modal content</p>
      </Modal>,
    )
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Test Modal" onClose={onClose}>
        <p>Modal content</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
