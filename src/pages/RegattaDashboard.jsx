import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { AlertTriangle, ChevronDown, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useRegattaMeta } from '../hooks/useRegattaMeta'
import { useRegattaData } from '../hooks/useRegattaData'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { buildSearchIndex, getMatchedNameSet, findDisambiguationCandidates, annotateEntries } from '../lib/search'
import { findCurrentRaceNumber } from '../lib/currentRace'
import { StatusHeader } from '../components/StatusHeader'
import { SearchBar } from '../components/SearchBar'
import { ClubFilterChips } from '../components/ClubFilterChips'
import { FilterChips } from '../components/FilterChips'
import { DisambiguationPrompt } from '../components/DisambiguationPrompt'
import { RaceCard } from '../components/RaceCard'
import { BreakDivider } from '../components/BreakDivider'
import { EmptyState } from '../components/EmptyState'

// Wrapper keyed by :id so switching between two different regattas fully
// remounts the dashboard below — otherwise React would reuse the same
// component instance and old search/cache state could leak across regattas.
export function RegattaDashboard() {
  const { id } = useParams()
  return <RegattaDashboardForId key={id} regattaId={id} />
}

function RegattaDashboardForId({ regattaId }) {
  const { regatta, isLoading: isMetaLoading, error: metaError } = useRegattaMeta(regattaId)
  const { data, lastUpdated, isLoading, isRefreshing, isOffline, error, refresh } = useRegattaData(
    regattaId,
    regatta?.sheet_url,
    regatta?.results_gid,
  )

  const [searchInput, setSearchInput] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [selectedIdentity, setSelectedIdentity] = useState(null)
  const [selectedClubs, setSelectedClubs] = useState(() => new Set())
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const debouncedQuery = useDebouncedValue(searchInput, 150)
  const wasFilterEmptyRef = useRef(true)
  const stickyHeaderRef = useRef(null)
  const hasScrolledToActiveRaceRef = useRef(false)

  const handleSearchChange = (value) => {
    setSearchInput(value)
    setSelectedIdentity(null)
  }

  const toggleClub = (club) => {
    setSelectedClubs((prev) => {
      const next = new Set(prev)
      if (next.has(club)) next.delete(club)
      else next.add(club)
      return next
    })
  }

  const hasActiveClubFilter = selectedClubs.size > 0
  const hasActiveFilter = debouncedQuery.trim() !== '' || !!selectedIdentity || hasActiveClubFilter

  // Typing a search or tapping a club chip instantly filters (per spec);
  // jumping back to "All Races" manually is still respected once the user
  // does it themselves.
  useEffect(() => {
    const isEmpty = !hasActiveFilter
    if (wasFilterEmptyRef.current && !isEmpty && filterMode === 'all') setFilterMode('filtered')
    if (!wasFilterEmptyRef.current && isEmpty && filterMode === 'filtered') setFilterMode('all')
    wasFilterEmptyRef.current = isEmpty
  }, [hasActiveFilter, filterMode])

  // Jump straight to the active race on first load instead of leaving the
  // parent to scroll past everything already finished. Runs exactly once —
  // guarded by a ref rather than state so it can't re-fire and fight a
  // parent who has since scrolled away on their own.
  useEffect(() => {
    if (hasScrolledToActiveRaceRef.current || isLoading || !data) return
    hasScrolledToActiveRaceRef.current = true

    const targetRaceNumber = findCurrentRaceNumber(data.entries)
    if (targetRaceNumber == null) return
    const element = document.getElementById(`race-${targetRaceNumber}`)
    if (!element) return

    element.scrollIntoView({ behavior: 'auto', block: 'start' })
    // The header is sticky, not static, so block: 'start' alone would land
    // the card right underneath it; pull back up by however tall the header
    // actually rendered (search bar + filters expanded or not).
    const headerHeight = stickyHeaderRef.current?.offsetHeight ?? 0
    if (headerHeight) window.scrollBy(0, -headerHeight)
  }, [isLoading, data])

  const entries = data?.entries ?? null
  const clubs = data?.clubs ?? []

  const searchIndex = useMemo(() => buildSearchIndex(entries ?? []), [entries])
  const matchedNameSet = useMemo(() => getMatchedNameSet(searchIndex, debouncedQuery), [searchIndex, debouncedQuery])
  const disambiguationCandidates = useMemo(
    () => findDisambiguationCandidates(searchIndex, debouncedQuery),
    [searchIndex, debouncedQuery],
  )
  // So a parent who collapsed the panel can still tell there's something in
  // it worth reopening for — a club filter still narrowing results, or a
  // name match still waiting to be disambiguated.
  const hasHiddenFilterState = hasActiveClubFilter || disambiguationCandidates.length >= 2

  const annotatedEntries = useMemo(() => {
    if (!entries) return null
    return annotateEntries(entries, { query: debouncedQuery, selectedIdentity, matchedNameSet, selectedClubs })
  }, [entries, debouncedQuery, selectedIdentity, matchedNameSet, selectedClubs])

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
      return annotatedEntries.filter((e) => e.type === 'race' && e.hasResults && (!hasActiveFilter || e.matched))
    }
    return annotatedEntries
  }, [annotatedEntries, filterMode, hasActiveFilter])

  let emptyState = null
  if (annotatedEntries && visibleEntries.length === 0) {
    if (filterMode === 'filtered' && !hasActiveFilter) {
      emptyState = { title: 'Type a name or tap a club to filter', message: 'Try an athlete name or select a club below.' }
    } else if (filterMode === 'filtered') {
      const clubList = [...selectedClubs].join(', ')
      if (searchInput.trim() && hasActiveClubFilter) {
        emptyState = {
          title: 'No races found',
          message: `Nobody matching "${searchInput}" from ${clubList} is in today's schedule.`,
        }
      } else if (hasActiveClubFilter) {
        emptyState = { title: 'No races found', message: `No one from ${clubList} is in today's schedule.` }
      } else {
        emptyState = { title: 'No races found', message: `Nobody matching "${searchInput}" is in today's schedule.` }
      }
    } else if (filterMode === 'live') {
      emptyState = { title: 'No results posted yet', message: 'Finished races will show up here as they come in.' }
    } else {
      emptyState = { title: 'No races in the schedule yet', message: 'Check back once the schedule is published.' }
    }
  }

  if (isMetaLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-slate-100 text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <p className="font-semibold">Loading regatta…</p>
      </div>
    )
  }

  if (metaError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-slate-100 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-rose-400" />
        <p className="font-bold text-rose-700">{metaError}</p>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-slate-100 pb-10">
      <div ref={stickyHeaderRef} className="sticky top-0 z-20 shadow-md">
        <StatusHeader
          title={regatta?.name || data?.title}
          lastUpdated={lastUpdated}
          isOffline={isOffline}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100/95 p-3 backdrop-blur">
          <SearchBar value={searchInput} onChange={handleSearchChange} />
          <button
            type="button"
            aria-expanded={filtersExpanded}
            onClick={() => setFiltersExpanded((v) => !v)}
            className="flex h-10 shrink-0 items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 active:bg-slate-50"
          >
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4" />
              Filters &amp; suggestions
              {!filtersExpanded && hasHiddenFilterState && (
                <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
              )}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {filtersExpanded && (
            <>
              <ClubFilterChips clubs={clubs} selectedClubs={selectedClubs} onToggle={toggleClub} />
              <FilterChips mode={filterMode} onChange={setFilterMode} counts={counts} />
              <DisambiguationPrompt
                candidates={disambiguationCandidates}
                selectedIdentity={selectedIdentity}
                onSelect={setSelectedIdentity}
                onClear={() => setSelectedIdentity(null)}
              />
            </>
          )}
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
