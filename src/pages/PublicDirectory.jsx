import { useMemo, useState } from 'react'
import { Sailboat, RefreshCw, AlertTriangle, Archive } from 'lucide-react'
import { useRegattaList } from '../hooks/useRegattaList'
import { RegattaListItem } from '../components/RegattaListItem'
import { EmptyState } from '../components/EmptyState'

export function PublicDirectory() {
  const { regattas, isLoading, error, refresh } = useRegattaList()
  const [showArchived, setShowArchived] = useState(false)

  const visibleRegattas = useMemo(
    () => regattas.filter((r) => showArchived || r.status === 'active'),
    [regattas, showArchived],
  )
  const archivedCount = useMemo(() => regattas.filter((r) => r.status === 'archived').length, [regattas])

  return (
    <div className="min-h-svh bg-slate-100 pb-10">
      <div className="bg-sky-800 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <Sailboat className="h-8 w-8" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-200">RegattaParent</p>
            <h1 className="text-xl font-bold leading-tight">Regattas</h1>
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-xl flex-col gap-3 p-3">
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="font-semibold">Loading regattas…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
            <p className="font-bold text-rose-700">Couldn't load regattas</p>
            <p className="text-sm font-medium text-rose-500">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-2 h-11 rounded-full bg-rose-600 px-5 text-sm font-bold text-white active:bg-rose-700"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && visibleRegattas.length === 0 && (
          <EmptyState title="No regattas yet" message="Check back once one has been added." />
        )}

        {!isLoading &&
          !error &&
          visibleRegattas.map((regatta) => <RegattaListItem key={regatta.id} regatta={regatta} />)}

        {!isLoading && !error && archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="mt-2 flex items-center justify-center gap-1.5 self-center text-sm font-semibold text-slate-400 underline-offset-2 active:underline"
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? 'Hide archived regattas' : `Show archived regattas (${archivedCount})`}
          </button>
        )}
      </main>
    </div>
  )
}
