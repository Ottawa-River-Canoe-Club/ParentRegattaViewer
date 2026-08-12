import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EditRegattaModal } from '../EditRegattaModal'
import { useAdminActions } from '../../hooks/useAdminActions'

vi.mock('../../hooks/useAdminActions')

afterEach(cleanup)

const REGATTA = {
  id: 'regatta-1',
  name: 'EOD U12 & U14 Championships',
  start_date: '2026-08-15',
  end_date: '2026-08-16',
  sheet_url: 'abc123',
  results_gid: '456',
  start_race_number: 93,
}

describe('EditRegattaModal', () => {
  let updateRegatta

  beforeEach(() => {
    updateRegatta = vi.fn().mockResolvedValue({ error: null })
    useAdminActions.mockReturnValue({ updateRegatta })
  })

  it('pre-fills every field from the given regatta', () => {
    render(<EditRegattaModal regatta={REGATTA} onSaved={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Name').value).toBe('EOD U12 & U14 Championships')
    expect(screen.getByLabelText('Start Date').value).toBe('2026-08-15')
    expect(screen.getByLabelText('End Date').value).toBe('2026-08-16')
    expect(screen.getByLabelText('Schedule Sheet URL').value).toBe('https://docs.google.com/spreadsheets/d/abc123/edit')
    expect(screen.getByLabelText('Results Tab URL').value).toBe(
      'https://docs.google.com/spreadsheets/d/abc123/edit#gid=456',
    )
    expect(screen.getByLabelText('Start Race Number', { exact: false }).value).toBe('93')
  })

  it('falls back to the legacy single date column when start_date/end_date are absent', () => {
    render(<EditRegattaModal regatta={{ ...REGATTA, start_date: null, end_date: null, date: '2026-08-15' }} onSaved={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Start Date').value).toBe('2026-08-15')
    expect(screen.getByLabelText('End Date').value).toBe('2026-08-15')
  })

  it('leaves Start Race Number blank when the regatta has no override set', () => {
    render(<EditRegattaModal regatta={{ ...REGATTA, start_race_number: null }} onSaved={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Start Race Number', { exact: false }).value).toBe('')
  })

  it('submits an updated start race number', async () => {
    render(<EditRegattaModal regatta={REGATTA} onSaved={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Start Race Number', { exact: false }), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await vi.waitFor(() => expect(updateRegatta).toHaveBeenCalledTimes(1))
    const [, fields] = updateRegatta.mock.calls[0]
    expect(fields.startRaceNumber).toBe('100')
  })

  it('calls updateRegatta with the regatta id and the edited fields on submit', async () => {
    render(<EditRegattaModal regatta={REGATTA} onSaved={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed Regatta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await vi.waitFor(() => expect(updateRegatta).toHaveBeenCalledTimes(1))
    const [id, fields] = updateRegatta.mock.calls[0]
    expect(id).toBe('regatta-1')
    expect(fields.name).toBe('Renamed Regatta')
    expect(fields.startDate).toBe('2026-08-15')
  })

  it('calls onSaved after a successful update', async () => {
    const onSaved = vi.fn()
    render(<EditRegattaModal regatta={REGATTA} onSaved={onSaved} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })

  it('shows the error and does not call onSaved when the update fails', async () => {
    updateRegatta.mockResolvedValue({ error: "Couldn't find a Sheet ID in that Schedule Sheet URL" })
    const onSaved = vi.fn()
    render(<EditRegattaModal regatta={REGATTA} onSaved={onSaved} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await screen.findByText("Couldn't find a Sheet ID in that Schedule Sheet URL")
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('calls onClose (without saving) when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<EditRegattaModal regatta={REGATTA} onSaved={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(updateRegatta).not.toHaveBeenCalled()
  })
})
