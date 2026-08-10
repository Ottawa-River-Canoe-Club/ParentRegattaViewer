import { useState } from 'react'
import { Link } from 'react-router'
import { Archive, ArchiveRestore, ExternalLink, AlertTriangle } from 'lucide-react'
import { useAdminActions } from '../hooks/useAdminActions'
import { formatDateRange } from '../lib/time'

function RegattaRow({ regatta, onChanged }) {
  const { toggleRegattaStatus } = useAdminActions()
  const [isToggling, setIsToggling] = useState(false)
  const [error, setError] = useState(null)
  const isActive = regatta.status === 'active'

  const handleToggle = async () => {
    setIsToggling(true)
    setError(null)
    const { error: toggleError } = await toggleRegattaStatus(regatta)
    setIsToggling(false)
    if (toggleError) {
      setError(toggleError)
      return
    }
    onChanged?.()
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{regatta.name}</p>
          <p className="text-sm font-medium text-slate-500">
            {formatDateRange(regatta.start_date ?? regatta.date, regatta.end_date ?? regatta.date)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isActive ? 'Active' : 'Archived'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to={`/regatta/${regatta.id}`}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 text-sm font-semibold text-slate-600 active:bg-slate-200"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Link>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 text-sm font-semibold text-slate-600 active:bg-slate-200 disabled:opacity-60"
        >
          {isActive ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
          {isActive ? 'Archive' : 'Restore'}
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </li>
  )
}

export function AdminRegattaTable({ regattas, onChanged }) {
  if (regattas.length === 0) {
    return <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-400">No regattas yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {regattas.map((regatta) => (
        <RegattaRow key={regatta.id} regatta={regatta} onChanged={onChanged} />
      ))}
    </ul>
  )
}
