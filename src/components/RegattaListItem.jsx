import { Link } from 'react-router'
import { CalendarDays, ChevronRight, Archive } from 'lucide-react'
import { formatDate } from '../lib/time'

export function RegattaListItem({ regatta }) {
  return (
    <Link
      to={`/regatta/${regatta.id}`}
      className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-lg font-bold text-slate-900">{regatta.name}</h2>
          {regatta.status === 'archived' && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
              <Archive className="h-3 w-3" />
              Archived
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500">
          <CalendarDays className="h-4 w-4" />
          {formatDate(regatta.date)}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
    </Link>
  )
}
