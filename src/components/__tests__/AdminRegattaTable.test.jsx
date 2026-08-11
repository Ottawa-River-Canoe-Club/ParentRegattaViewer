import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AdminRegattaTable } from '../AdminRegattaTable'
import { useAdminActions } from '../../hooks/useAdminActions'

vi.mock('../../hooks/useAdminActions')

afterEach(cleanup)

const REGATTA = {
  id: 'regatta-1',
  name: 'EOD U12 & U14 Championships',
  start_date: '2026-08-15',
  end_date: '2026-08-15',
  sheet_url: 'abc123',
  results_gid: '456',
  status: 'active',
}

function renderTable(regattas, onChanged = vi.fn()) {
  return render(
    <MemoryRouter>
      <AdminRegattaTable regattas={regattas} onChanged={onChanged} />
    </MemoryRouter>,
  )
}

describe('AdminRegattaTable', () => {
  let toggleRegattaStatus
  let updateRegatta
  let deleteRegatta

  beforeEach(() => {
    toggleRegattaStatus = vi.fn().mockResolvedValue({ error: null })
    updateRegatta = vi.fn().mockResolvedValue({ error: null })
    deleteRegatta = vi.fn().mockResolvedValue({ error: null })
    useAdminActions.mockReturnValue({ toggleRegattaStatus, updateRegatta, deleteRegatta })
  })

  it('shows a placeholder when there are no regattas', () => {
    renderTable([])
    expect(screen.getByText('No regattas yet.')).toBeTruthy()
  })

  it('renders the regatta name, date range, and active status', () => {
    renderTable([REGATTA])
    expect(screen.getByText('EOD U12 & U14 Championships')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
  })

  it('archives an active regatta and refreshes the list', async () => {
    const onChanged = vi.fn()
    renderTable([REGATTA], onChanged)
    fireEvent.click(screen.getByRole('button', { name: /archive/i }))
    await vi.waitFor(() => expect(toggleRegattaStatus).toHaveBeenCalledWith(REGATTA))
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('opens and closes the row action menu', () => {
    renderTable([REGATTA])
    expect(screen.queryByRole('menuitem', { name: /edit/i })).toBeNull()

    fireEvent.click(screen.getByLabelText('More actions'))
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeTruthy()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menuitem', { name: /edit/i })).toBeNull()
  })

  it('opens the edit modal, pre-filled, from the row menu', () => {
    renderTable([REGATTA])
    fireEvent.click(screen.getByLabelText('More actions'))
    fireEvent.click(screen.getByRole('menuitem', { name: /edit/i }))

    expect(screen.getByText('Edit Regatta')).toBeTruthy()
    expect(screen.getByLabelText('Name').value).toBe('EOD U12 & U14 Championships')
  })

  it('opens a delete confirmation naming the regatta, from the row menu', () => {
    renderTable([REGATTA])
    fireEvent.click(screen.getByLabelText('More actions'))
    fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }))

    expect(
      screen.getByText('Are you sure you want to permanently delete "EOD U12 & U14 Championships"? This cannot be undone.'),
    ).toBeTruthy()
  })

  it('removes the row immediately on confirmed delete, without waiting for onChanged', async () => {
    renderTable([REGATTA])
    fireEvent.click(screen.getByLabelText('More actions'))
    fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    // The row (and its confirm dialog) is gone from the very next render,
    // before the mocked deleteRegatta's promise has even been awaited.
    expect(screen.queryByText('EOD U12 & U14 Championships')).toBeNull()
    await vi.waitFor(() => expect(deleteRegatta).toHaveBeenCalledWith('regatta-1'))
  })

  it('brings the row back with an error if the delete is rejected', async () => {
    deleteRegatta.mockResolvedValue({ error: 'permission denied' })
    renderTable([REGATTA])
    fireEvent.click(screen.getByLabelText('More actions'))
    fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await screen.findByText('permission denied')
    expect(screen.getByText('EOD U12 & U14 Championships')).toBeTruthy()
  })
})
