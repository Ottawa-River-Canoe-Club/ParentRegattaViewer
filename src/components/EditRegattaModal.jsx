import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAdminActions } from '../hooks/useAdminActions'
import { buildEditUrl } from '../lib/googleSheets'
import { Modal } from './Modal'

function formFromRegatta(regatta) {
  return {
    name: regatta.name,
    startDate: regatta.start_date ?? regatta.date ?? '',
    endDate: regatta.end_date ?? regatta.date ?? '',
    scheduleUrl: buildEditUrl(regatta.sheet_url),
    resultsUrl: buildEditUrl(regatta.sheet_url, regatta.results_gid),
  }
}

// A separate component from AdminRegattaForm rather than a shared dual-mode
// form — the two only share a field shape, and entangling this modal's
// pre-fill/update path with the already-tested inline "add" flow would cost
// more in complexity than the small duplication saves.
export function EditRegattaModal({ regatta, onSaved, onClose }) {
  const { updateRegatta } = useAdminActions()
  const [form, setForm] = useState(() => formFromRegatta(regatta))
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

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
    setIsSaving(true)
    setError(null)
    const { error: submitError } = await updateRegatta(regatta.id, form)
    setIsSaving(false)
    if (submitError) {
      setError(submitError)
      return
    }
    onSaved?.()
  }

  return (
    <Modal title="Edit Regatta" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-slate-600">Name</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={setField('name')}
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
            className="h-11 rounded-xl border-2 border-slate-200 px-3 text-base focus:border-sky-600 focus:outline-none"
          />
        </label>

        {error && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 flex-1 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 active:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-11 flex-1 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white active:bg-sky-800 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
