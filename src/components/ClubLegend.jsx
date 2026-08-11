import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { CLUB_LEGEND } from '../lib/csvParser'

// Collapsed by default — most parents never need it, so it shouldn't cost
// any vertical space until asked for. Only shows codes actually present in
// this regatta (via `clubs`, already sorted the same way the filter chips
// are), and silently skips any code CLUB_LEGEND has no full name for rather
// than showing a blank or a guess.
export function ClubLegend({ clubs }) {
  const [isOpen, setIsOpen] = useState(false)
  const entries = clubs.filter((code) => CLUB_LEGEND[code]).map((code) => [code, CLUB_LEGEND[code]])
  if (entries.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="flex h-10 w-full shrink-0 items-center justify-between px-3 text-sm font-semibold text-slate-600 active:bg-slate-50"
      >
        <span className="flex items-center gap-1.5">
          <Info className="h-4 w-4" />
          What do these club abbreviations mean?
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <ul className="flex flex-col gap-1 border-t border-slate-100 p-2">
          {entries.map(([code, fullName]) => (
            <li key={code} className="flex items-baseline gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
              <span className="shrink-0 text-sm font-bold text-slate-700">{code}</span>
              <span className="text-sm text-slate-500">{fullName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
