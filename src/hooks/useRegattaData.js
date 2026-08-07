import { useCallback, useEffect, useRef, useState } from 'react'
import { parseRegattaCsv } from '../lib/csvParser'
import { loadCache, saveCache } from '../lib/cache'

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/10sjjgYS5cEJladjNqQ0Z2tRqiTIvIES6/export?format=csv'
const POLL_INTERVAL_MS = 60_000
const FETCH_TIMEOUT_MS = 15_000

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
      const res = await fetch(CSV_URL, { signal: controller.signal, cache: 'no-store' })
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)

      const text = await res.text()
      if (/^\s*<(!doctype|html)/i.test(text)) {
        throw new Error('Sheet did not return CSV — check that it is shared as "Anyone with the link"')
      }

      const parsed = parseRegattaCsv(text)
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
