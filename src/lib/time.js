/** Formats a "H:MM:SS" / "H:MM" schedule time as "H:MM AM/PM". Returns the raw
 * value unchanged if it doesn't look like a time (e.g. already blank). */
export function formatRaceTime(raw) {
  const value = (raw ?? '').toString().trim()
  if (!value) return ''
  const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return value

  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${hours}:${minutes} ${period}`
}

/** Formats a plain "YYYY-MM-DD" date (as Postgres `date` columns serialize)
 * for display. Builds the Date from its parts rather than parsing the string
 * directly — `new Date("2026-08-15")` parses as UTC midnight, which renders
 * as the previous day in any timezone west of UTC. */
export function formatDate(isoDate) {
  const value = (isoDate ?? '').toString().trim()
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return value

  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

/** Formats a regatta's [startDate, endDate] window for display, collapsing
 * to a single formatted date when they're the same day (or endDate is
 * missing) rather than showing a redundant "Aug 15 – Aug 15". */
export function formatDateRange(startDate, endDate) {
  const start = formatDate(startDate)
  if (!endDate || endDate === startDate) return start
  return `${start} – ${formatDate(endDate)}`
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return ''
  const diffMs = Date.now() - timestamp
  const diffSec = Math.round(diffMs / 1000)
  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  return `${diffHr}h ago`
}
