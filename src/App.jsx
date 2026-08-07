import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useRegattaData } from './hooks/useRegattaData'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { buildSearchIndex, getMatchedNameSet, findDisambiguationCandidates, annotateEntries } from './lib/search'
import { StatusHeader } from './components/StatusHeader'
import { SearchBar } from './components/SearchBar'
import { FilterChips } from './components/FilterChips'
import { DisambiguationPrompt } from './components/DisambiguationPrompt'
import { RaceCard } from './components/RaceCard'
import { BreakDivider } from './components/BreakDivider'
import { EmptyState } from './components/EmptyState'

export default function App() {
  const { data, lastUpdated, isLoading, isRefreshing, isOffline, error, refresh } = useRegattaData()

  const [searchInput, setSearchInput] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [selectedIdentity, setSelectedIdentity] = useState(null)
  const debouncedQuery = useDebouncedValue(searchInput, 150)
  const wasQueryEmptyRef = useRef(true)

  const handleSearchChange = (value) => {
    setSearchInput(value)
    setSelectedIdentity(null)
  }

  const hasActiveQuery = debouncedQuery.trim() !== '' || !!selectedIdentity

  // Typing a search instantly filters (per spec); jumping back to "All Races"
  // manually is still respected once the user does it themselves.
  useEffect(() => {
    const isEmpty = debouncedQuery.trim() === ''
    if (wasQueryEmptyRef.current && !isEmpty && filterMode === 'all') setFilterMode('filtered')
    if (!wasQueryEmptyRef.current && isEmpty && filterMode === 'filtered') setFilterMode('all')
    wasQueryEmptyRef.current = isEmpty
  }, [debouncedQuery, filterMode])

  const entries = data?.entries ?? null

  const searchIndex = useMemo(() => buildSearchIndex(entries ?? []), [entries])
  const matchedNameSet = useMemo(() => getMatchedNameSet(searchIndex, debouncedQuery), [searchIndex, debouncedQuery])
  const disambiguationCandidates = useMemo(
    () => findDisambiguationCandidates(searchIndex, debouncedQuery),
    [searchIndex, debouncedQuery],
  )

  const annotatedEntries = useMemo(() => {
    if (!entries) return null
    return annotateEntries(entries, { query: debouncedQuery, selectedIdentity, matchedNameSet })
  }, [entries, debouncedQuery, selectedIdentity, matchedNameSet])

  const counts = useMemo(() => {
    if (!annotatedEntries) return { all: 0, filtered: 0, live: 0 }
    const races = annotatedEntries.filter((e) => e.type === 'race')
    return {
      all: races.length,
      filtered: races.filter((r) => r.matched).length,
      live: races.filter((r) => r.hasResults).length,
    }
  }, [annotatedEntries])

  const visibleEntries = useMemo(() => {
    if (!annotatedEntries) return []
    if (filterMode === 'filtered') return annotatedEntries.filter((e) => e.type === 'race' && e.matched)
    if (filterMode === 'live') {
      return annotatedEntries.filter((e) => e.type === 'race' && e.hasResults && (!hasActiveQuery || e.matched))
    }
    return annotatedEntries
  }, [annotatedEntries, filterMode, hasActiveQuery])

  let emptyState = null
  if (annotatedEntries && visibleEntries.length === 0) {
    if (filterMode === 'filtered' && !hasActiveQuery) {
      emptyState = { title: 'Type a name or club to filter', message: 'Try an athlete name or a club code like ORCC.' }
    } else if (filterMode === 'filtered') {
      emptyState = { title: `No races found`, message: `Nobody matching "${searchInput}" is in today's schedule.` }
    } else if (filterMode === 'live') {
      emptyState = { title: 'No results posted yet', message: 'Finished races will show up here as they come in.' }
    } else {
      emptyState = { title: 'No races in the schedule yet', message: 'Check back once the schedule is published.' }
    }
  }

  return (
    <div className="min-h-svh bg-slate-100 pb-10">
      <div className="sticky top-0 z-20 shadow-md">
        <StatusHeader
          title={data?.title}
          lastUpdated={lastUpdated}
          isOffline={isOffline}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100/95 p-3 backdrop-blur">
          <SearchBar value={searchInput} onChange={handleSearchChange} />
          <FilterChips mode={filterMode} onChange={setFilterMode} counts={counts} />
          <DisambiguationPrompt
            candidates={disambiguationCandidates}
            selectedIdentity={selectedIdentity}
            onSelect={setSelectedIdentity}
            onClear={() => setSelectedIdentity(null)}
          />
        </div>
      </div>

      <main className="mx-auto flex max-w-xl flex-col gap-3 p-3">
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="font-semibold">Loading today's schedule…</p>
          </div>
        )}

        {!isLoading && !data && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
            <p className="font-bold text-rose-700">Couldn't load the schedule</p>
            <p className="text-sm font-medium text-rose-500">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-2 h-11 rounded-full bg-rose-600 px-5 text-sm font-bold text-white active:bg-rose-700"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading &&
          data &&
          (emptyState ? (
            <EmptyState title={emptyState.title} message={emptyState.message} />
          ) : (
            visibleEntries.map((entry, idx) =>
              entry.type === 'break' ? (
                <BreakDivider key={`break-${idx}`} label={entry.label} />
              ) : (
                <RaceCard key={entry.raceNumber} race={entry} />
              ),
            )
          ))}
      </main>
    </div>
  )
}
