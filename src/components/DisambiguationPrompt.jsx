import { Users } from 'lucide-react'

export function DisambiguationPrompt({ candidates, onSelect }) {
  // Nothing typed yet, or nothing matched — no one worth offering to add.
  if (candidates.length === 0) return null

  return (
    // Bounded to a fraction of the viewport with its own scroll: a query that
    // matches many same-named athletes used to grow this box tall enough to
    // push the race cards below entirely off-screen with no way to reach them.
    <div
      className="max-h-[40vh] overflow-y-auto overscroll-contain rounded-2xl border-2 border-amber-300 bg-amber-50"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-amber-50 px-3 pb-2 pt-3 text-sm font-semibold text-amber-900">
        <Users className="h-4 w-4" />
        {candidates.length > 1 ? 'Multiple athletes match — tap to add' : 'Athlete found — tap to add'}
      </div>
      <div className="flex flex-col gap-2 px-3 pb-3">
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className="w-full rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-left text-sm font-semibold text-amber-900 active:bg-amber-100"
          >
            {c.name} {c.club ? `(${c.club})` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
