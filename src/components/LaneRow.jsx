import { Star } from 'lucide-react'
import { formatClubs, formatNames } from '../lib/format'

const FINISH_STYLES = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-800',
  3: 'bg-orange-300 text-orange-950',
}

function ordinal(n) {
  const num = parseInt(n, 10)
  if (!Number.isInteger(num)) return n
  const mod100 = num % 100
  if (mod100 >= 11 && mod100 <= 13) return `${num}th`
  switch (num % 10) {
    case 1:
      return `${num}st`
    case 2:
      return `${num}nd`
    case 3:
      return `${num}rd`
    default:
      return `${num}th`
  }
}

export function LaneRow({ lane, showResults }) {
  const finishNum = parseInt(lane.finish, 10)
  const finishBadge = FINISH_STYLES[finishNum] ?? 'bg-slate-100 text-slate-600'

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${
        lane.matched ? 'border-sky-400 bg-sky-50' : 'border-transparent bg-slate-50'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
        {lane.laneNumber || '–'}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {lane.matched && <Star className="h-4 w-4 shrink-0 fill-sky-500 text-sky-500" />}
          <p className={`truncate text-base font-semibold ${lane.matched ? 'text-sky-900' : 'text-slate-900'}`}>
            {formatNames(lane.names) || 'TBD'}
          </p>
        </div>
        {lane.clubs.length > 0 && (
          <p className="truncate text-sm font-medium text-slate-500">{formatClubs(lane.clubs)}</p>
        )}
      </div>

      {showResults && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          {lane.finish ? (
            <span className={`rounded-lg px-2 py-0.5 text-sm font-bold ${finishBadge}`}>{ordinal(lane.finish)}</span>
          ) : (
            <span className="text-sm font-medium text-slate-400">–</span>
          )}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            {lane.time && <span>{lane.time}</span>}
            {lane.points && <span className="rounded bg-slate-200 px-1.5 py-0.5">{lane.points} pts</span>}
          </div>
        </div>
      )}
    </li>
  )
}
