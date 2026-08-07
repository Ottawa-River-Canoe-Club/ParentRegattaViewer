import { Users, X } from 'lucide-react'

export function DisambiguationPrompt({ candidates, selectedIdentity, onSelect, onClear }) {
  // A single candidate means the name resolved to one athlete (possibly merged
  // across a solo + mixed-crew appearance) — nothing to disambiguate.
  if (candidates.length < 2) return null

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Users className="h-4 w-4" />
        Multiple athletes match — which one?
      </div>
      <div className="flex flex-wrap gap-2">
        {candidates.map((c) => {
          const active = selectedIdentity?.id === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className={`h-10 rounded-full px-4 text-sm font-semibold ${
                active ? 'bg-amber-500 text-white' : 'bg-white text-amber-900 border border-amber-300 active:bg-amber-100'
              }`}
            >
              {c.name} {c.club ? `(${c.club})` : ''}
            </button>
          )
        })}
        {selectedIdentity && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear athlete selection"
            className="flex h-10 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold text-slate-500 border border-slate-200 active:bg-slate-100"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
