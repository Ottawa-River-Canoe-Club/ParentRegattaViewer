const CACHE_KEY = 'regattaparent:cache:v1'

export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Best-effort only — private browsing / quota limits shouldn't break the app.
  }
}
