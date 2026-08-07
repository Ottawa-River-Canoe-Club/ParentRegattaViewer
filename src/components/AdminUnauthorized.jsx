import { ShieldOff } from 'lucide-react'

export function AdminUnauthorized({ email, onSignOut }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-slate-100 px-6 text-center">
      <ShieldOff className="h-10 w-10 text-rose-400" />
      <h1 className="text-lg font-bold text-slate-800">Unauthorized</h1>
      <p className="max-w-xs text-sm font-medium text-slate-500">
        <span className="font-semibold text-slate-700">{email}</span> isn't set up as an admin. Ask a club manager to
        add your email in the Admin Portal, or sign in with a different account.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-2 h-11 rounded-full bg-slate-200 px-5 text-sm font-bold text-slate-700 active:bg-slate-300"
      >
        Sign out
      </button>
    </div>
  )
}
