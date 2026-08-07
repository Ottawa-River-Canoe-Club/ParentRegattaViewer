import { LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRegattaList } from '../hooks/useRegattaList'
import { useAllowedAdmins } from '../hooks/useAllowedAdmins'
import { AdminSignIn } from '../components/AdminSignIn'
import { AdminUnauthorized } from '../components/AdminUnauthorized'
import { AdminRegattaTable } from '../components/AdminRegattaTable'
import { AdminRegattaForm } from '../components/AdminRegattaForm'
import { AdminAllowedEmails } from '../components/AdminAllowedEmails'

export function AdminPortal() {
  const { user, isSignedIn, isAdmin, isLoading, signInWithGoogle, signOut } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-slate-100 text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <p className="font-semibold">Checking your account…</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return <AdminSignIn onSignIn={signInWithGoogle} />
  }

  if (!isAdmin) {
    return <AdminUnauthorized email={user.email} onSignOut={signOut} />
  }

  return <AdminPortalContent userEmail={user.email} onSignOut={signOut} />
}

function AdminPortalContent({ userEmail, onSignOut }) {
  const { regattas, isLoading: regattasLoading, refresh: refreshRegattas } = useRegattaList()
  const { emails, isLoading: emailsLoading, refresh: refreshEmails } = useAllowedAdmins()

  return (
    <div className="min-h-svh bg-slate-100 pb-10">
      <div className="bg-sky-800 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-200">RegattaParent</p>
            <h1 className="truncate text-lg font-bold leading-tight">Admin Portal</h1>
            <p className="truncate text-xs font-medium text-sky-200">{userEmail}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <main className="mx-auto flex max-w-xl flex-col gap-4 p-3">
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">Regattas</h2>
          {regattasLoading ? (
            <p className="text-sm font-medium text-slate-400">Loading…</p>
          ) : (
            <AdminRegattaTable regattas={regattas} onChanged={refreshRegattas} />
          )}
        </section>

        <AdminRegattaForm onAdded={refreshRegattas} />

        <AdminAllowedEmails emails={emails} isLoading={emailsLoading} onAdded={refreshEmails} />
      </main>
    </div>
  )
}
