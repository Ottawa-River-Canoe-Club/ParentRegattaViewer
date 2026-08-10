/** Reduces a Date or an already-YYYY-MM-DD-ish string down to just the date
 * part, using *local* calendar components for a Date object rather than
 * `toISOString()` — that's UTC-based and can land on the wrong calendar day
 * near midnight in any timezone behind UTC. */
function toDateOnlyString(value) {
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return (value ?? '').toString().slice(0, 10)
}

/**
 * True if `referenceDate` (defaults to right now) falls within the
 * regatta's [start_date, end_date] window, inclusive. Compared as
 * YYYY-MM-DD strings — which sort identically to a real date comparison —
 * rather than as Date objects, so neither the viewer's timezone nor the
 * exact time of day can shift which calendar day "today" or a boundary date
 * lands on. Falls back to the legacy single `date` column for regattas
 * created before start_date/end_date existed.
 */
export function isWithinRegattaWindow(regatta, referenceDate = new Date()) {
  const startDate = regatta?.start_date ?? regatta?.date
  const endDate = regatta?.end_date ?? regatta?.date
  if (!startDate || !endDate) return false

  const today = toDateOnlyString(referenceDate)
  return today >= toDateOnlyString(startDate) && today <= toDateOnlyString(endDate)
}
