import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ClubLegend } from '../ClubLegend'

afterEach(cleanup)

describe('ClubLegend', () => {
  it('renders nothing when none of the given clubs have a known full name', () => {
    const { container } = render(<ClubLegend clubs={['PICC', 'SLCC']} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing for an empty club list', () => {
    const { container } = render(<ClubLegend clubs={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('starts collapsed', () => {
    render(<ClubLegend clubs={['ORCC']} />)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Ottawa River Canoe Club')).toBeNull()
  })

  it('reveals each club\'s full name when expanded, and hides it again when collapsed', () => {
    render(<ClubLegend clubs={['ORCC', 'RCC']} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Ottawa River Canoe Club')).toBeTruthy()
    expect(screen.getByText('Rideau Canoe Club')).toBeTruthy()

    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Ottawa River Canoe Club')).toBeNull()
  })

  it('only lists clubs actually present in this regatta, not the entire legend', () => {
    render(<ClubLegend clubs={['ORCC']} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Ottawa River Canoe Club')).toBeTruthy()
    expect(screen.queryByText('Rideau Canoe Club')).toBeNull()
  })

  it('skips an unknown acronym but still shows the ones it does recognize', () => {
    render(<ClubLegend clubs={['ORCC', 'PICC']} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Ottawa River Canoe Club')).toBeTruthy()
    expect(screen.queryByText('PICC')).toBeNull()
  })
})
