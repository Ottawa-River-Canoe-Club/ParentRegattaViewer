const OPTIONS = [
  { key: 'all', label: 'All Races' },
  { key: 'filtered', label: 'Filtered Results' },
]

export function FilterChips({ mode, onChange, counts }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Race filters">
      {OPTIONS.map((opt) => {
        const active = mode === opt.key
        const count = counts?.[opt.key]
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${
              active
                ? 'bg-sky-700 text-white'
                : 'bg-slate-100 text-slate-600 active:bg-slate-200'
            }`}
          >
            {opt.label}
            {typeof count === 'number' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  active ? 'bg-white/20' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
