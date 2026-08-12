import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { AdminRegattaForm, DRAFT_KEY } from '../AdminRegattaForm'
import { useAdminActions } from '../../hooks/useAdminActions'

vi.mock('../../hooks/useAdminActions')

afterEach(cleanup)

// Every test gets a fresh drawer — jsdom's localStorage otherwise persists
// across tests in this file, so a draft saved by one test would silently
// pre-fill the next one's "blank form" assumptions.
beforeEach(() => localStorage.clear())

function fillCommonFields() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Regatta' } })
  fireEvent.change(screen.getByLabelText('Schedule Sheet URL'), {
    target: { value: 'https://docs.google.com/spreadsheets/d/abc123/edit' },
  })
  // exact:false because this label's accessible name also swallows its
  // trailing helper-text span ("Paste the URL from...") — pre-existing, and
  // unrelated to the date-field changes this test suite is actually about.
  fireEvent.change(screen.getByLabelText('Results Tab URL', { exact: false }), {
    target: { value: 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=456' },
  })
}

describe('AdminRegattaForm', () => {
  let addRegatta

  beforeEach(() => {
    addRegatta = vi.fn().mockResolvedValue({ error: null })
    useAdminActions.mockReturnValue({ addRegatta })
  })

  it('renders separate start and end date inputs instead of a single date field', () => {
    render(<AdminRegattaForm />)
    expect(screen.getByLabelText('Start Date')).toBeTruthy()
    expect(screen.getByLabelText('End Date')).toBeTruthy()
    expect(screen.queryByLabelText('Date')).toBeNull()
  })

  it('submits startDate and endDate as separate fields', async () => {
    render(<AdminRegattaForm />)
    fillCommonFields()
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-08-16' } })
    fireEvent.click(screen.getByRole('button', { name: /add regatta/i }))

    await vi.waitFor(() => expect(addRegatta).toHaveBeenCalledTimes(1))
    const submitted = addRegatta.mock.calls[0][0]
    expect(submitted.startDate).toBe('2026-08-15')
    expect(submitted.endDate).toBe('2026-08-16')
  })

  it('auto-fills the end date to match the start date, for the common one-day event', () => {
    render(<AdminRegattaForm />)
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    expect(screen.getByLabelText('End Date').value).toBe('2026-08-15')
  })

  it('stops auto-following the end date once the admin sets it independently', () => {
    render(<AdminRegattaForm />)
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-08-17' } })
    // Changing the start date again should not clobber the now-independent end date.
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-16' } })
    expect(screen.getByLabelText('End Date').value).toBe('2026-08-17')
  })

  it('constrains the end date input to not precede the start date', () => {
    render(<AdminRegattaForm />)
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    expect(screen.getByLabelText('End Date').min).toBe('2026-08-15')
  })

  it('clears the form and reports success after a successful submission', async () => {
    render(<AdminRegattaForm />)
    fillCommonFields()
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    fireEvent.click(screen.getByRole('button', { name: /add regatta/i }))

    // Waiting on the mock's call count alone isn't enough — it's already
    // incremented synchronously at call time, before handleSubmit's `await`
    // continuation (the part that actually clears the form) has run. Poll
    // the real observable outcome instead.
    await vi.waitFor(() => expect(screen.getByLabelText('Start Date').value).toBe(''))
    expect(screen.getByLabelText('End Date').value).toBe('')
  })

  it('shows the error message and keeps the form filled in when submission fails', async () => {
    addRegatta.mockResolvedValue({ error: "Couldn't find a Sheet ID in that Schedule Sheet URL" })
    render(<AdminRegattaForm />)
    fillCommonFields()
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    fireEvent.click(screen.getByRole('button', { name: /add regatta/i }))

    await screen.findByText("Couldn't find a Sheet ID in that Schedule Sheet URL")
    expect(screen.getByLabelText('Start Date').value).toBe('2026-08-15')
  })

  it('saves the draft to localStorage as the admin types', () => {
    render(<AdminRegattaForm />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Regatta' } })

    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY))
    expect(saved.name).toBe('Test Regatta')
  })

  it('restores a saved draft when the form mounts', () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        name: 'Draft Regatta',
        startDate: '2026-08-15',
        endDate: '2026-08-16',
        scheduleUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit',
        resultsUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=456',
      }),
    )

    render(<AdminRegattaForm />)

    expect(screen.getByLabelText('Name').value).toBe('Draft Regatta')
    expect(screen.getByLabelText('Start Date').value).toBe('2026-08-15')
    expect(screen.getByLabelText('End Date').value).toBe('2026-08-16')
  })

  it('ignores a corrupted draft instead of crashing on mount', () => {
    localStorage.setItem(DRAFT_KEY, '{not valid json')
    render(<AdminRegattaForm />)
    expect(screen.getByLabelText('Name').value).toBe('')
  })

  it('clears the saved draft from localStorage after a successful submission', async () => {
    render(<AdminRegattaForm />)
    fillCommonFields()
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    fireEvent.click(screen.getByRole('button', { name: /add regatta/i }))

    await vi.waitFor(() => expect(screen.getByLabelText('Name').value).toBe(''))
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('keeps the saved draft in localStorage when submission fails', async () => {
    addRegatta.mockResolvedValue({ error: "Couldn't find a Sheet ID in that Schedule Sheet URL" })
    render(<AdminRegattaForm />)
    fillCommonFields()
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    fireEvent.click(screen.getByRole('button', { name: /add regatta/i }))

    await screen.findByText("Couldn't find a Sheet ID in that Schedule Sheet URL")
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY))
    expect(saved.name).toBe('Test Regatta')
  })

  it('renders an optional Start Race Number input', () => {
    render(<AdminRegattaForm />)
    const input = screen.getByLabelText('Start Race Number', { exact: false })
    expect(input).toBeTruthy()
    expect(input.required).toBe(false)
  })

  it('submits the start race number when the organizer sets one', async () => {
    render(<AdminRegattaForm />)
    fillCommonFields()
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    fireEvent.change(screen.getByLabelText('Start Race Number', { exact: false }), { target: { value: '93' } })
    fireEvent.click(screen.getByRole('button', { name: /add regatta/i }))

    await vi.waitFor(() => expect(addRegatta).toHaveBeenCalledTimes(1))
    expect(addRegatta.mock.calls[0][0].startRaceNumber).toBe('93')
  })

  it('submits with no start race number when the field is left blank', async () => {
    render(<AdminRegattaForm />)
    fillCommonFields()
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    fireEvent.click(screen.getByRole('button', { name: /add regatta/i }))

    await vi.waitFor(() => expect(addRegatta).toHaveBeenCalledTimes(1))
    expect(addRegatta.mock.calls[0][0].startRaceNumber).toBe('')
  })

  it('restores a saved start race number from draft', () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        name: 'Draft Regatta',
        startDate: '2026-08-15',
        endDate: '2026-08-16',
        scheduleUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit',
        resultsUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=456',
        startRaceNumber: '93',
      }),
    )
    render(<AdminRegattaForm />)
    expect(screen.getByLabelText('Start Race Number', { exact: false }).value).toBe('93')
  })

  it('clears the start race number after a successful submission', async () => {
    render(<AdminRegattaForm />)
    fillCommonFields()
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-08-15' } })
    fireEvent.change(screen.getByLabelText('Start Race Number', { exact: false }), { target: { value: '93' } })
    fireEvent.click(screen.getByRole('button', { name: /add regatta/i }))

    await vi.waitFor(() => expect(screen.getByLabelText('Start Race Number', { exact: false }).value).toBe(''))
  })
})
