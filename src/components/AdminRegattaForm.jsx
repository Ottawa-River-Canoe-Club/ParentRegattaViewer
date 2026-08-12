import { useEffect, useState } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { useAdminActions } from '../hooks/useAdminActions'

const EMPTY_FORM = { name: '', startDate: '', endDate: '', scheduleUrl: '', resultsUrl: '' }
export const DRAFT_KEY = 'regattaparent:draft:add-regatta:v1'

const isBlankForm = (form) => Object.values(form).every((value) => !value)

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return EMPTY_FORM
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_FORM
    return { ...EMPTY_FORM, ...parsed }
  } catch {
    return EMPTY_FORM
  }
}

export function AdminRegattaForm({ onAdded }) {
  const { addRegatta } = useAdminActions()
  const [form, setForm] = useState(loadDraft)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Persist as-you-type so backgrounding the tab (e.g. to go copy a Sheet
  // URL) can't lose progress — mobile browsers reclaim memory from
  // background tabs and reload them from scratch on return. A blank form
  // is treated as "no draft" so resetting to EMPTY_FORM after a successful
  // submit clears storage through this same effect, rather than a separate
  // clear call racing this one.
  useEffect(() => {
    try {
      if (isBlankForm(form)) {
        localStorage.removeItem(DRAFT_KEY)
      } else {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
      }
    } catch {
      // Best-effort only — private browsing / quota limits shouldn't break the app.
    }
  }, [form])

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // Most regattas are still one day — follow the start date into the end
  // date automatically until the admin deliberately sets a different one,
  // so a single-day event never requires entering the same date twice.
  const handleStartDateChange = (e) => {
    const value = e.target.value
    setForm((f) => ({
      ...f,
      startDate: value,
      endDate: !f.endDate || f.endDate === f.startDate ? value : f.endDate,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const { error: submitError } = await addRegatta(form)
    setIsSubmitting(false)
    if (submitError) {
      setError(submitError)
      return
    }
    setForm(EMPTY_FORM)
    onAdded?.()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
      <h2 className="text-base font-bold text-slate-900">Add New Regatta</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-slate-600">Name</span>
        <input
          type="text"
          required
          value={form.name}
          onChange={setField('name')}
          placeholder="EOD U12 & U14 Championships"
          className="h-11 rounded-xl border-2 border-slate-200 px-3 text-base focus:border-sky-600 focus:outline-none"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-slate-600">Start Date</span>
          <input
            type="date"
            required
            value={form.startDate}
            onChange={handleStartDateChange}
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-base focus:border-sky-600 focus:outline-none"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-slate-600">End Date</span>
          <input
            type="date"
            required
            min={form.startDate || undefined}
            value={form.endDate}
            onChange={setField('endDate')}
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-base focus:border-sky-600 focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-slate-600">Schedule Sheet URL</span>
        <input
          type="text"
          required
          value={form.scheduleUrl}
          onChange={setField('scheduleUrl')}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          className="h-11 rounded-xl border-2 border-slate-200 px-3 text-base focus:border-sky-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-slate-600">Results Tab URL</span>
        <input
          type="text"
          required
          value={form.resultsUrl}
          onChange={setField('resultsUrl')}
          placeholder="https://docs.google.com/spreadsheets/d/...#gid=..."
          className="h-11 rounded-xl border-2 border-slate-200 px-3 text-base focus:border-sky-600 focus:outline-none"
        />
        <span className="text-xs font-medium text-slate-400">
          Paste the URL from your browser's address bar while viewing the draw/results tab.
        </span>
      </label>

      {error && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-sky-700 text-sm font-bold text-white active:bg-sky-800 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        {isSubmitting ? 'Adding…' : 'Add Regatta'}
      </button>
    </form>
  )
}
