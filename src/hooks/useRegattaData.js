import { useCallback, useEffect, useRef, useState } from 'react'
import { parseRegattaData } from '../lib/csvParser'
import { loadCache, saveCache } from '../lib/cache'
import { buildScheduleCsvUrl, buildResultsCsvUrl } from '../lib/googleSheets'

const POLL_INTERVAL_MS = 60_000
const FETCH_TIMEOUT_MS = 15_000

async function fetchCsv(url, signal) {
  const res = await fetch(url, { signal, cache: 'no-store' })
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`)

  const text = await res.text()
  if (/^\s*<(!doctype|html)/i.test(text)) {
    throw new Error('Sheet did not return CSV — check that it is shared as "Anyone with the link"')
  }
  return text
}

/**
 * Fetches and polls a single regatta's schedule + results CSVs. Callers must
 * remount this hook (e.g. via a `key={regattaId}` on the route element) when
 * switching regattas — it assumes regattaId/sheetId/resultsGid are stable for
 * its whole mounted lifetime, so cached data never leaks between regattas.
 */
export function useRegattaData(regattaId, sheetId, resultsGid, startRaceNumber) {
  const cachedRef = useRef(undefined)
  if (cachedRef.current === undefined) cachedRef.current = loadCache(regattaId)
  const cached = cachedRef.current

  const [data, setData] = useState(cached?.parsed ?? null)
  const [lastUpdated, setLastUpdated] = useState(cached?.parsed?.parsedAt ?? null)
  const [isLoading, setIsLoading] = useState(!cached)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [error, setError] = useState(null)

  const fetchAndParse = useCallback(async () => {
    if (!sheetId) return
    setIsRefreshing(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      // Fetched together and merged only on full success — a half-updated view
      // (new lane draws paired with stale times, or vice versa) would be worse
      // than briefly-stale-but-consistent cached data.
      const [scheduleText, resultsText] = await Promise.all([
        fetchCsv(buildScheduleCsvUrl(sheetId), controller.signal),
        fetchCsv(buildResultsCsvUrl(sheetId, resultsGid), controller.signal),
      ])

      const parsed = parseRegattaData(scheduleText, resultsText, startRaceNumber)
      setData(parsed)
      setLastUpdated(parsed.parsedAt)
      setIsOffline(false)
      setError(null)
      saveCache(regattaId, { parsed })
    } catch (err) {
      setIsOffline(true)
      setError(err?.message || 'Failed to fetch the latest schedule')
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [regattaId, sheetId, resultsGid, startRaceNumber])

  useEffect(() => {
    if (!sheetId) return
    fetchAndParse()
    const id = setInterval(fetchAndParse, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchAndParse, sheetId])

  return { data, lastUpdated, isLoading, isRefreshing, isOffline, error, refresh: fetchAndParse }
}
