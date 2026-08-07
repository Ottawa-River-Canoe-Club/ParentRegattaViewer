import { useState } from 'react'
import { ChevronDown, Users, X } from 'lucide-react'

function CrewList({ crews }) {
  if (crews.length === 0) {
    return <p className="px-3 py-2 text-sm font-medium text-amber-800">Only solo races today — no crew to show.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-amber-200 px-3 py-1">
      {crews.map((crew, idx) => (
        <div key={`${crew.raceNumber}-${idx}`} className="py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
            {crew.boatType ? `${crew.boatType} Crew Details` : 'Crew Details'}
            <span className="ml-1.5 font-medium normal-case text-amber-700">Race {crew.raceNumber}</span>
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {crew.athletes.map((athlete, i) => (
              <li key={`${athlete.name}-${i}`} className="text-sm font-medium text-amber-900">
                {athlete.name}
                {athlete.club ? ` (${athlete.club})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function DisambiguationPrompt({ candidates, selectedIdentity, onSelect, onClear }) {
  const [openIds, setOpenIds] = useState(() => new Set())

  // A single candidate means the name resolved to one athlete (possibly merged
  // across a solo + mixed-crew appearance) — nothing to disambiguate.
  if (candidates.length < 2) return null

  const toggleOpen = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    // Bounded to a fraction of the viewport with its own scroll: a query that
    // matches many same-named athletes used to grow this box tall enough to
    // push the race cards below entirely off-screen with no way to reach them.
    <div
      className="max-h-[40vh] overflow-y-auto overscroll-contain rounded-2xl border-2 border-amber-300 bg-amber-50"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-amber-50 px-3 pb-2 pt-3 text-sm font-semibold text-amber-900">
        <Users className="h-4 w-4" />
        Multiple athletes match — which one?
      </div>
      <div className="flex flex-col gap-2 px-3 pb-3">
        {candidates.map((c) => {
          const active = selectedIdentity?.id === c.id
          const isOpen = openIds.has(c.id)
          return (
            <div key={c.id} className={`overflow-hidden rounded-xl border ${active ? 'border-amber-500' : 'border-amber-300'}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  onSelect(c)
                  toggleOpen(c.id)
                }}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold ${
                  active ? 'bg-amber-500 text-white' : 'bg-white text-amber-900 active:bg-amber-100'
                }`}
              >
                <span>
                  {c.name} {c.club ? `(${c.club})` : ''}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="bg-amber-100">
                  <CrewList crews={c.crews} />
                </div>
              )}
            </div>
          )
        })}
        {selectedIdentity && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear athlete selection"
            className="flex h-10 items-center gap-1 self-start rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-500 active:bg-slate-100"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
