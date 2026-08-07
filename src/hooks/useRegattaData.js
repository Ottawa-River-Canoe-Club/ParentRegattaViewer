import { useCallback, useEffect, useRef, useState } from 'react'
import { parseRegattaData } from '../lib/csvParser'
import { loadCache, saveCache } from '../lib/cache'

const SHEET_ID = '10sjjgYS5cEJladjNqQ0Z2tRqiTIvIES6'
const SCHEDULE_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
// The schedule and the draw/results live on two separate tabs of the same sheet —
// a plain export without a gid only ever returns the first (schedule) tab.
const RESULTS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1191136310`

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

export function useRegattaData() {
  const cachedRef = useRef(undefined)
  if (cachedRef.current === undefined) cachedRef.current = loadCache()
  const cached = cachedRef.current

  const [data, setData] = useState(cached?.parsed ?? null)
  const [lastUpdated, setLastUpdated] = useState(cached?.parsed?.parsedAt ?? null)
  const [isLoading, setIsLoading] = useState(!cached)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [error, setError] = useState(null)

  const fetchAndParse = useCallback(async () => {
    setIsRefreshing(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      // Fetched together and merged only on full success — a half-updated view
      // (new lane draws paired with stale times, or vice versa) would be worse
      // than briefly-stale-but-consistent cached data.
      const [scheduleText, resultsText] = await Promise.all([
        fetchCsv(SCHEDULE_CSV_URL, controller.signal),
        fetchCsv(RESULTS_CSV_URL, controller.signal),
      ])

      const parsed = parseRegattaData(scheduleText, resultsText)
      setData(parsed)
      setLastUpdated(parsed.parsedAt)
      setIsOffline(false)
      setError(null)
      saveCache({ parsed })
    } catch (err) {
      setIsOffline(true)
      setError(err?.message || 'Failed to fetch the latest schedule')
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAndParse()
    const id = setInterval(fetchAndParse, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchAndParse])

  return { data, lastUpdated, isLoading, isRefreshing, isOffline, error, refresh: fetchAndParse }
}
