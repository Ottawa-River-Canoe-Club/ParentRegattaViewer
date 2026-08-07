import { Search, X } from 'lucide-react'

export function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search athlete name…"
        aria-label="Search athlete name"
        className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-12 text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
