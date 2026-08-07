import { useState } from 'react'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

export function AdminSignIn({ onSignIn }) {
  const [error, setError] = useState(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleClick = async () => {
    setIsSigningIn(true)
    setError(null)
    const { error: signInError } = await onSignIn()
    if (signInError) setError(signInError.message)
    setIsSigningIn(false)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-100 px-6 text-center">
      <ShieldCheck className="h-10 w-10 text-sky-700" />
      <div>
        <h1 className="text-lg font-bold text-slate-800">Admin Portal</h1>
        <p className="mt-1 max-w-xs text-sm font-medium text-slate-500">
          Sign in with your club Google account to manage regattas.
        </p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isSigningIn}
        className="h-12 rounded-full bg-sky-700 px-6 text-sm font-bold text-white active:bg-sky-800 disabled:opacity-60"
      >
        {isSigningIn ? 'Redirecting…' : 'Sign in with Google'}
      </button>
      {error && (
        <p className="flex max-w-xs items-center gap-1.5 text-sm font-medium text-rose-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
