import { Clock } from 'lucide-react'
import { toDisplayCase } from '../lib/format'

export function BreakDivider({ label }) {
  return (
    <div className="flex items-center gap-3 px-1 py-1">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        {toDisplayCase(label)}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}
