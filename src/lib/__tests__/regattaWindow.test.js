import { describe, it, expect } from 'vitest'
import { isWithinRegattaWindow } from '../regattaWindow'

describe('isWithinRegattaWindow', () => {
  const regatta = { start_date: '2026-08-15', end_date: '2026-08-16' }

  it('is false the day before the regatta starts', () => {
    expect(isWithinRegattaWindow(regatta, '2026-08-14')).toBe(false)
  })

  it('is true on the start date', () => {
    expect(isWithinRegattaWindow(regatta, '2026-08-15')).toBe(true)
  })

  it('is true on a day inside a multi-day regatta', () => {
    const threeDayRegatta = { start_date: '2026-08-15', end_date: '2026-08-17' }
    expect(isWithinRegattaWindow(threeDayRegatta, '2026-08-16')).toBe(true)
  })

  it('is true on the end date', () => {
    expect(isWithinRegattaWindow(regatta, '2026-08-16')).toBe(true)
  })

  it('is false the day after the regatta ends', () => {
    expect(isWithinRegattaWindow(regatta, '2026-08-17')).toBe(false)
  })

  it('works for a single-day regatta (start === end)', () => {
    const oneDayRegatta = { start_date: '2026-08-15', end_date: '2026-08-15' }
    expect(isWithinRegattaWindow(oneDayRegatta, '2026-08-14')).toBe(false)
    expect(isWithinRegattaWindow(oneDayRegatta, '2026-08-15')).toBe(true)
    expect(isWithinRegattaWindow(oneDayRegatta, '2026-08-16')).toBe(false)
  })

  it('falls back to the legacy `date` column when start_date/end_date are absent', () => {
    const legacyRegatta = { date: '2026-08-15' }
    expect(isWithinRegattaWindow(legacyRegatta, '2026-08-14')).toBe(false)
    expect(isWithinRegattaWindow(legacyRegatta, '2026-08-15')).toBe(true)
    expect(isWithinRegattaWindow(legacyRegatta, '2026-08-16')).toBe(false)
  })

  it('is false when there is no regatta, or no date information at all', () => {
    expect(isWithinRegattaWindow(null, '2026-08-15')).toBe(false)
    expect(isWithinRegattaWindow({}, '2026-08-15')).toBe(false)
  })

  it('accepts a real Date object for the reference date, using local calendar components', () => {
    // Regression guard: new Date(2026, 7, 15) is already local midnight on
    // Aug 15 — must not get shifted a day by an accidental UTC conversion.
    expect(isWithinRegattaWindow(regatta, new Date(2026, 7, 15, 0, 0, 0))).toBe(true)
    expect(isWithinRegattaWindow(regatta, new Date(2026, 7, 15, 23, 59, 59))).toBe(true)
    expect(isWithinRegattaWindow(regatta, new Date(2026, 7, 14, 23, 59, 59))).toBe(false)
  })

  it('defaults the reference date to now when not provided', () => {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const todayOnlyRegatta = { start_date: `${y}-${m}-${d}`, end_date: `${y}-${m}-${d}` }
    expect(isWithinRegattaWindow(todayOnlyRegatta)).toBe(true)
  })
})
