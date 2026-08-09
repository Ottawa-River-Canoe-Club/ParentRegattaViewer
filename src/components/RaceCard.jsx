import { CircleCheck, Clock, Timer } from 'lucide-react'
import { LaneRow } from './LaneRow'
import { formatRaceTime } from '../lib/time'
import { toDisplayCase } from '../lib/format'

const STATUS = {
  results: { label: 'Finished', icon: CircleCheck, classes: 'bg-emerald-100 text-emerald-800' },
  drawn: { label: 'Awaiting Results', icon: Timer, classes: 'bg-amber-100 text-amber-800' },
  pending: { label: 'Not Yet Drawn', icon: Clock, classes: 'bg-slate-100 text-slate-600' },
}

function sortLanes(lanes) {
  return [...lanes].sort((a, b) => {
    const na = parseInt(a.laneNumber, 10)
    const nb = parseInt(b.laneNumber, 10)
    const va = Number.isInteger(na) ? na : Infinity
    const vb = Number.isInteger(nb) ? nb : Infinity
    return va - vb
  })
}

export function RaceCard({ race }) {
  const statusKey = race.hasResults ? 'results' : race.hasDraw ? 'drawn' : 'pending'
  const status = STATUS[statusKey]
  const StatusIcon = status.icon
  const lanes = sortLanes(race.lanes)

  return (
    <div
      id={`race-${race.raceNumber}`}
      className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${
        race.matched ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-200'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-sky-700">
            {race.time && <span>{formatRaceTime(race.time)}</span>}
            <span className="text-slate-300">•</span>
            <span>Race {race.raceNumber}</span>
          </div>
          <h3 className="truncate text-lg font-bold text-slate-900">{toDisplayCase(race.event)}</h3>
          <p className="text-sm font-medium text-slate-500">
            {race.heat}
            {race.distance ? ` · ${race.distance}` : ''}
          </p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${status.classes}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      {lanes.length > 0 ? (
        <ul className="flex flex-col gap-1 md:gap-1.5">
          {lanes.map((lane, idx) => (
            <LaneRow key={`${lane.laneNumber}-${idx}`} lane={lane} showResults={race.hasResults} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-400">
          Lane draw not yet posted.
        </p>
      )}
    </div>
  )
}
