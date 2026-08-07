import { SearchX } from 'lucide-react'

export function EmptyState({ title, message }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center">
      <SearchX className="h-8 w-8 text-slate-300" />
      <p className="text-base font-bold text-slate-600">{title}</p>
      {message && <p className="text-sm font-medium text-slate-400">{message}</p>}
    </div>
  )
}
