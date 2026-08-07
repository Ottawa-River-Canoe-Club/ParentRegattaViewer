import { useState } from 'react'
import { UserPlus, AlertTriangle, Mail } from 'lucide-react'
import { useAdminActions } from '../hooks/useAdminActions'

export function AdminAllowedEmails({ emails, isLoading, onAdded }) {
  const { addAllowedAdmin } = useAdminActions()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const { error: submitError } = await addAllowedAdmin(email)
    setIsSubmitting(false)
    if (submitError) {
      setError(submitError)
      return
    }
    setEmail('')
    onAdded?.()
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
      <h2 className="text-base font-bold text-slate-900">Allowed Admins</h2>
      <p className="text-sm font-medium text-slate-500">
        @orcc.ca accounts are always admins. Add other emails here to grant them access too.
      </p>

      {!isLoading && emails.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {emails.map((row) => (
            <li key={row.email} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate font-medium text-slate-700">{row.email}</span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="parent@example.com"
          className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-base focus:border-sky-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          aria-label="Add admin email"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white active:bg-sky-800 disabled:opacity-60"
        >
          <UserPlus className="h-5 w-5" />
        </button>
      </form>

      {error && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
