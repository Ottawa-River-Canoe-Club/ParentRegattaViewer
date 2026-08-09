import { useState } from 'react'
import { ChevronDown, Trophy } from 'lucide-react'
import { formatClubs, formatNames } from '../lib/format'

const RANK_STYLES = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-800',
  3: 'bg-orange-300 text-orange-950',
}

export function OverallRankings({ groups }) {
  const [openKeys, setOpenKeys] = useState(() => new Set())

  const toggleOpen = (key) => {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const isOpen = openKeys.has(group.key)
        return (
          <div key={group.key} className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggleOpen(group.key)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-slate-50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Trophy className="h-4 w-4 shrink-0 text-sky-700" />
                <span className="truncate text-base font-bold text-slate-900">{group.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                  {group.rankings.length}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {isOpen && (
              <ul className="flex flex-col gap-1 border-t border-slate-100 p-2 md:gap-1.5">
                {group.rankings.map((entry) => (
                  <li
                    key={`${entry.raceNumber}-${entry.laneNumber}`}
                    className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 md:gap-3 md:py-2.5"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        RANK_STYLES[entry.rank] ?? 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold leading-snug text-slate-900">
                        {formatNames(entry.names)}
                      </p>
                      {entry.clubs.length > 0 && (
                        <p className="text-sm font-medium leading-snug text-slate-500">{formatClubs(entry.clubs)}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-700">{entry.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
