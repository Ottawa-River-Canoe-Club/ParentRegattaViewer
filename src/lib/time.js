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
