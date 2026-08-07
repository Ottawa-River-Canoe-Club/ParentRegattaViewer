const CACHE_PREFIX = 'regattaparent:cache:v1'

// Keyed per regatta id so switching between regattas doesn't show one
// regatta's cached data while another's is still loading, and so each stays
// available offline independently.
function cacheKey(regattaId) {
  return `${CACHE_PREFIX}:${regattaId}`
}

export function loadCache(regattaId) {
  try {
    const raw = localStorage.getItem(cacheKey(regattaId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveCache(regattaId, data) {
  try {
    localStorage.setItem(cacheKey(regattaId), JSON.stringify(data))
  } catch {
    // Best-effort only — private browsing / quota limits shouldn't break the app.
  }
}
