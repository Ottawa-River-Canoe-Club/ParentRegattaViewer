const SHEET_BASE = 'https://docs.google.com/spreadsheets/d'

/**
 * Extracts the Sheet ID from a pasted Google Sheets URL (edit link, export
 * link, share link — anything containing `/spreadsheets/d/{id}`). Falls back
 * to treating the input as a bare ID if it doesn't look like a URL at all,
 * since an admin might paste just the ID directly.
 */
export function parseSheetId(input) {
  const trimmed = (input ?? '').trim()
  if (!trimmed) return null

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (match) return match[1]

  if (/^[a-zA-Z0-9-_]{10,}$/.test(trimmed)) return trimmed
  return null
}

/**
 * Extracts a tab's gid from a pasted URL (`?gid=`, `&gid=`, or `#gid=`).
 * Falls back to treating a bare numeric input as the gid itself, and
 * defaults to '0' (the first/default tab) when nothing is found.
 */
export function parseGid(input) {
  const trimmed = (input ?? '').trim()
  if (!trimmed) return '0'

  const match = trimmed.match(/[?#&]gid=(\d+)/)
  if (match) return match[1]

  if (/^\d+$/.test(trimmed)) return trimmed
  return '0'
}

export function buildScheduleCsvUrl(sheetId) {
  return `${SHEET_BASE}/${sheetId}/export?format=csv`
}

export function buildResultsCsvUrl(sheetId, gid) {
  return `${SHEET_BASE}/${sheetId}/export?format=csv&gid=${gid ?? '0'}`
}

/** Rebuilds a real, pasteable edit-view URL from a regatta's stored
 * sheet_url/results_gid (only the extracted parts are stored, not the
 * original URL) — used to pre-fill the edit form's two URL fields so an
 * admin sees a recognizable link rather than a bare ID. */
export function buildEditUrl(sheetId, gid) {
  const base = `${SHEET_BASE}/${sheetId}/edit`
  return gid && gid !== '0' ? `${base}#gid=${gid}` : base
}
