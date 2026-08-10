import { describe, it, expect } from 'vitest'
import { formatDate, formatDateRange } from '../time'

describe('formatDate', () => {
  it('formats a plain YYYY-MM-DD date without shifting a day', () => {
    // Regression guard: new Date("2026-08-15") parses as UTC midnight, which
    // renders as Aug 14 in any timezone west of UTC — this must not happen.
    expect(formatDate('2026-08-15')).toBe('Saturday, August 15, 2026')
  })

  it('handles a date at the very start of the month', () => {
    expect(formatDate('2026-01-01')).toBe('Thursday, January 1, 2026')
  })

  it('returns the input unchanged when it is not a recognizable date', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDateRange', () => {
  it('collapses to a single date when start and end are the same day', () => {
    expect(formatDateRange('2026-08-15', '2026-08-15')).toBe('Saturday, August 15, 2026')
  })

  it('collapses to a single date when there is no end date', () => {
    expect(formatDateRange('2026-08-15', null)).toBe('Saturday, August 15, 2026')
    expect(formatDateRange('2026-08-15', undefined)).toBe('Saturday, August 15, 2026')
  })

  it('shows a range when start and end differ', () => {
    expect(formatDateRange('2026-08-15', '2026-08-16')).toBe('Saturday, August 15, 2026 – Sunday, August 16, 2026')
  })
})
