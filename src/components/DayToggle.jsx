// Single-day regattas never see this — it renders nothing until a sheet
// actually has a second day's races to switch to.
export function DayToggle({ days, activeDay, onChange }) {
  if (days.length < 2) return null

  return (
    <div className="flex gap-2" role="tablist" aria-label="Regatta day">
      {days.map((day) => {
        const active = day === activeDay
        return (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(day)}
            className={`h-10 flex-1 rounded-xl border-2 text-sm font-bold transition-colors ${
              active
                ? 'border-sky-700 bg-sky-700 text-white'
                : 'border-slate-200 bg-white text-slate-600 active:bg-slate-100'
            }`}
          >
            Day {day}
          </button>
        )
      })}
    </div>
  )
}
