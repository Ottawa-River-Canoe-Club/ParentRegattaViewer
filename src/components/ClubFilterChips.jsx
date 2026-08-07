/** Horizontally scrollable row of per-club toggle chips, sitting right below
 * the search bar. Kept as an exact, dedicated filter (see laneMatchesClubs)
 * rather than folded into free-text search, so a club code can never
 * fuzzy-match a different club (e.g. "ORCC" vs "RCC"). */
export function ClubFilterChips({ clubs, selectedClubs, onToggle }) {
  if (!clubs || clubs.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by club">
      {clubs.map((club) => {
        const active = selectedClubs.has(club)
        return (
          <button
            key={club}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(club)}
            className={`h-10 shrink-0 rounded-full border-2 px-4 text-sm font-semibold transition-colors ${
              active
                ? 'border-sky-700 bg-sky-700 text-white'
                : 'border-slate-200 bg-white text-slate-600 active:bg-slate-100'
            }`}
          >
            {club}
          </button>
        )
      })}
    </div>
  )
}
