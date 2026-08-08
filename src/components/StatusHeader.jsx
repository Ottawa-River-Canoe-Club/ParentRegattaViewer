import { Link } from 'react-router'
import { ChevronLeft, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react'
import { formatRelativeTime } from '../lib/time'

export function StatusHeader({ title, lastUpdated, isOffline, isRefreshing, onRefresh }) {
  return (
    <div className="bg-sky-800 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/"
            aria-label="Back to all regattas"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-200">RegattaParent</p>
            <h1 className="truncate text-lg font-bold leading-tight">{title || 'Live Regatta Schedule'}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/admin"
            aria-label="Admin portal"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
          >
            <ShieldCheck className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:bg-white/20 disabled:opacity-60"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2 text-xs font-medium text-sky-200">
        {isOffline ? (
          <span className="flex items-center gap-1 text-amber-300">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — showing last saved data
          </span>
        ) : (
          <span>Updated {formatRelativeTime(lastUpdated) || '—'}</span>
        )}
      </div>
    </div>
  )
}
