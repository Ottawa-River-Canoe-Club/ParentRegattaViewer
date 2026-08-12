import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ClubLegend } from '../ClubLegend'

afterEach(cleanup)

describe('ClubLegend', () => {
  it('renders nothing when none of the given clubs have a known full name', () => {
    const { container } = render(<ClubLegend clubs={['ZZZ', 'QQQ']} />)
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
    render(<ClubLegend clubs={['ORCC', 'ZZZ']} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Ottawa River Canoe Club')).toBeTruthy()
    expect(screen.queryByText('ZZZ')).toBeNull()
  })

  it('explains every newer club acronym added alongside the original set', () => {
    render(<ClubLegend clubs={['CPC', 'PR', 'SLCC', 'PICC', 'EXH']} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Collingwood Paddle Club')).toBeTruthy()
    expect(screen.getByText('Pickering Rouge Canoe Club')).toBeTruthy()
    expect(screen.getByText('Sydenham Lake Canoe Club')).toBeTruthy()
    expect(screen.getByText('Petrie Island Canoe Club')).toBeTruthy()
    expect(screen.getByText('Exhibition (Non-Scoring)')).toBeTruthy()
  })

  it('caps the expanded list height and scrolls it internally instead of the page', () => {
    render(<ClubLegend clubs={['ORCC', 'RCC']} />)
    fireEvent.click(screen.getByRole('button'))
    const list = screen.getByRole('list')
    expect(list.className).toMatch(/max-h-/)
    expect(list.className).toContain('overflow-y-auto')
    expect(list.className).toContain('overscroll-contain')
  })
})
