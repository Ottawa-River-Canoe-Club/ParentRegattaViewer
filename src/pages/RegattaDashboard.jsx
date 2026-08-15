import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { AlertTriangle, ChevronDown, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useRegattaMeta } from '../hooks/useRegattaMeta'
import { useRegattaData } from '../hooks/useRegattaData'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { buildSearchIndex, getMatchedNameSet, findDisambiguationCandidates, annotateEntries } from '../lib/search'
import { findLastCompletedRaceNumber } from '../lib/lastCompletedRace'
import { buildOverallRankings } from '../lib/rankings'
import { isWithinRegattaWindow } from '../lib/regattaWindow'
import { StatusHeader } from '../components/StatusHeader'
import { SearchBar } from '../components/SearchBar'
import { AthleteFilterChips } from '../components/AthleteFilterChips'
import { ClubFilterChips } from '../components/ClubFilterChips'
import { ClubLegend } from '../components/ClubLegend'
import { FilterChips } from '../components/FilterChips'
import { DisambiguationPrompt } from '../components/DisambiguationPrompt'
import { RaceCard } from '../components/RaceCard'
import { BreakDivider } from '../components/BreakDivider'
import { EmptyState } from '../components/EmptyState'
import { OverallRankings } from '../components/OverallRankings'
import { DayToggle } from '../components/DayToggle'

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
    regatta?.start_race_number,
  )

  const [searchInput, setSearchInput] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [selectedAthletes, setSelectedAthletes] = useState([])
  const [selectedClubs, setSelectedClubs] = useState(() => new Set())
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const debouncedQuery = useDebouncedValue(searchInput, 150)
  const wasFilterEmptyRef = useRef(true)
  const hasScrolledOnLoadRef = useRef(false)
  const pendingScrollRaceRef = useRef(null)
  // Captures whatever `data` is on the very first render — null if there was
  // no cache, or the cached snapshot if there was. Comparing against this by
  // *reference* (parseRegattaData always returns a fresh object) tells the
  // auto-scroll effect below whether a real fetch has actually landed yet,
  // without depending on ever observing `isRefreshing` flip through `true` —
  // which isn't guaranteed: a fast-resolving fetch can have its whole
  // true→false cycle batched into one commit that never renders `true`.
  const initialDataRef = useRef(data)

  // Selecting from the dropdown adds a persistent chip and instantly clears
  // the search box (see the DisambiguationPrompt `candidates` prop below,
  // which is gated on this same searchInput so the dropdown disappears in
  // the same tick rather than lagging behind the 150ms debounce). Deduped by
  // id so re-picking an already-selected athlete is a harmless no-op.
  const handleSelectAthlete = (candidate) => {
    setSelectedAthletes((prev) => (prev.some((a) => a.id === candidate.id) ? prev : [...prev, candidate]))
    setSearchInput('')
  }

  const handleRemoveAthlete = (id) => {
    setSelectedAthletes((prev) => prev.filter((a) => a.id !== id))
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
  const hasActiveFilter = debouncedQuery.trim() !== '' || selectedAthletes.length > 0 || hasActiveClubFilter

  // Typing a search or tapping a club chip instantly filters (per spec);
  // jumping back to "All Races" manually is still respected once the user
  // does it themselves.
  useEffect(() => {
    const isEmpty = !hasActiveFilter
    if (wasFilterEmptyRef.current && !isEmpty && filterMode === 'all') setFilterMode('filtered')
    if (!wasFilterEmptyRef.current && isEmpty && filterMode === 'filtered') setFilterMode('all')
    wasFilterEmptyRef.current = isEmpty
  }, [hasActiveFilter, filterMode])

  // Jump straight to the most recently completed race on first load, so a
  // parent following along live doesn't have to scroll down through
  // everything that's already happened. Runs exactly once — guarded by a ref
  // rather than state so it can't re-fire and fight a parent who has since
  // scrolled away on their own. Only figures out *what* to scroll to and
  // switches to its day if needed; the actual DOM lookup happens in the
  // effect below, since a day switch re-renders the list before the target's
  // card exists to scroll to.
  //
  // Gated on the regatta's own start/end dates rather than on race
  // completion: a regatta can skip races to weather with no result ever
  // posted for them, so "does the most recent race have a result" is not a
  // reliable signal for "is this regatta currently happening." The date
  // gate runs first — outside its active window this effect does nothing
  // at all, so the page simply opens at the top of Day 1.
  useEffect(() => {
    if (hasScrolledOnLoadRef.current || isLoading || !data) return
    // A cached regatta loads with isLoading already false, before the
    // background refetch this hook always kicks off has actually resolved —
    // acting on that stale snapshot could point at yesterday's target race
    // (or, worse now, yesterday's day) instead of today's. Wait until `data`
    // has actually been replaced by that fetch's result — unless the fetch
    // has confirmed it failed, in which case there's nothing better coming
    // and the stale cache is still more useful than not scrolling at all.
    if (data === initialDataRef.current && !error) return
    hasScrolledOnLoadRef.current = true

    if (!isWithinRegattaWindow(regatta)) return

    const targetRaceNumber = findLastCompletedRaceNumber(data.entries)
    if (targetRaceNumber == null) return

    const targetRace = data.entries.find((e) => e.type === 'race' && e.raceNumber === targetRaceNumber)
    if (targetRace?.day != null) setSelectedDay(targetRace.day)
    pendingScrollRaceRef.current = targetRaceNumber
  }, [isLoading, data, error, regatta])

  // Fires once right after the effect above on the same load (single-day —
  // the target's day, if any, already matches what's rendered) and again
  // after a day switch actually re-renders the list, so the lookup below is
  // guaranteed to run against a DOM that could contain the target card.
  useEffect(() => {
    const targetRaceNumber = pendingScrollRaceRef.current
    if (targetRaceNumber == null) return
    const element = document.getElementById(`race-${targetRaceNumber}`)
    if (!element) return

    pendingScrollRaceRef.current = null
    // Centering (rather than aligning to the top) means landing here never
    // depends on the sticky header's height — a card centered in the
    // viewport is never underneath a header docked at the very top.
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })

  const entries = data?.entries ?? null
  const clubs = data?.clubs ?? []

  const availableDays = useMemo(() => {
    if (!entries) return []
    const days = new Set()
    for (const entry of entries) {
      if (entry.type === 'race' && entry.day != null) days.add(entry.day)
    }
    return [...days].sort((a, b) => a - b)
  }, [entries])
  const activeDay = selectedDay ?? availableDays[0] ?? null

  const searchIndex = useMemo(() => buildSearchIndex(entries ?? []), [entries])
  const matchedNameSet = useMemo(() => getMatchedNameSet(searchIndex, debouncedQuery), [searchIndex, debouncedQuery])
  const disambiguationCandidates = useMemo(
    () => findDisambiguationCandidates(searchIndex, debouncedQuery),
    [searchIndex, debouncedQuery],
  )
  // So a parent who collapsed the panel can still tell there's something in
  // it worth reopening for — a club filter still narrowing results, an
  // athlete chip already selected, or a name match still waiting to be added.
  const hasHiddenFilterState = hasActiveClubFilter || selectedAthletes.length > 0 || disambiguationCandidates.length > 0

  const annotatedEntries = useMemo(() => {
    if (!entries) return null
    return annotateEntries(entries, { query: debouncedQuery, selectedAthletes, matchedNameSet, selectedClubs })
  }, [entries, debouncedQuery, selectedAthletes, matchedNameSet, selectedClubs])

  // Independent of search/club filters by design — the whole point of this
  // tab is to show the full qualification picture across all heats, not a
  // subset of it.
  const rankingGroups = useMemo(() => buildOverallRankings(entries ?? []), [entries])

  // Entries with no day at all (every single-day regatta) always pass this
  // check, so day-filtering is a no-op unless the sheet actually has one.
  const onActiveDay = (entry) => entry.day == null || entry.day === activeDay

  const counts = useMemo(() => {
    if (!annotatedEntries) return { all: 0, filtered: 0, rankings: 0 }
    const races = annotatedEntries.filter((e) => e.type === 'race' && onActiveDay(e))
    return {
      all: races.length,
      filtered: races.filter((r) => r.matched).length,
      rankings: rankingGroups.length,
    }
  }, [annotatedEntries, rankingGroups, activeDay])

  const visibleEntries = useMemo(() => {
    if (!annotatedEntries) return []
    const dayFiltered = annotatedEntries.filter(onActiveDay)
    if (filterMode === 'filtered') return dayFiltered.filter((e) => e.type === 'race' && e.matched)
    return dayFiltered
  }, [annotatedEntries, filterMode, activeDay])

  let emptyState = null
  if (annotatedEntries && visibleEntries.length === 0) {
    if (filterMode === 'filtered' && !hasActiveFilter) {
      emptyState = { title: 'Type a name or tap a club to filter', message: 'Try an athlete name or select a club below.' }
    } else if (filterMode === 'filtered') {
      const clubList = [...selectedClubs].join(', ')
      const nameLabel = [...selectedAthletes.map((a) => a.name), searchInput.trim()].filter(Boolean).join(', ')
      if (nameLabel && hasActiveClubFilter) {
        emptyState = {
          title: 'No races found',
          message: `No races for "${nameLabel}" or ${clubList} in today's schedule.`,
        }
      } else if (hasActiveClubFilter) {
        emptyState = { title: 'No races found', message: `No one from ${clubList} is in today's schedule.` }
      } else {
        emptyState = { title: 'No races found', message: `Nobody matching "${nameLabel}" is in today's schedule.` }
      }
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
      <div className="sticky top-0 z-20 shadow-md">
        <StatusHeader
          title={regatta?.name || data?.title}
          lastUpdated={lastUpdated}
          isOffline={isOffline}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
        />
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100/95 p-3 backdrop-blur">
          <SearchBar value={searchInput} onChange={setSearchInput} />
          <DayToggle days={availableDays} activeDay={activeDay} onChange={setSelectedDay} />
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
              <AthleteFilterChips athletes={selectedAthletes} onRemove={handleRemoveAthlete} />
              <ClubFilterChips clubs={clubs} selectedClubs={selectedClubs} onToggle={toggleClub} />
              <ClubLegend clubs={clubs} />
              <FilterChips mode={filterMode} onChange={setFilterMode} counts={counts} />
              {/* Gated on the live (undebounced) searchInput, not debouncedQuery,
                  so selecting a candidate clears the box in the same render —
                  waiting for the 150ms debounce to catch up would leave the
                  dropdown visibly lingering after a chip is already added. */}
              <DisambiguationPrompt
                candidates={searchInput.trim() ? disambiguationCandidates : []}
                onSelect={handleSelectAthlete}
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
          (filterMode === 'rankings' ? (
            rankingGroups.length === 0 ? (
              <EmptyState
                title="No rankings yet"
                message="Overall rankings will appear here once heats start finishing."
              />
            ) : (
              <OverallRankings groups={rankingGroups} />
            )
          ) : emptyState ? (
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
