import { useState } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { useAdminActions } from '../hooks/useAdminActions'

const EMPTY_FORM = { name: '', date: '', scheduleUrl: '', resultsUrl: '' }

export function AdminRegattaForm({ onAdded }) {
  const { addRegatta } = useAdminActions()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

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

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-slate-600">Date</span>
        <input
          type="date"
          required
          value={form.date}
          onChange={setField('date')}
          className="h-11 rounded-xl border-2 border-slate-200 px-3 text-base focus:border-sky-600 focus:outline-none"
        />
      </label>

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
