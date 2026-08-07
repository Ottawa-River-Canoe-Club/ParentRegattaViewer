import { DatabaseZap } from 'lucide-react'

export function SetupRequired() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-slate-100 px-6 text-center">
      <DatabaseZap className="h-10 w-10 text-slate-400" />
      <h1 className="text-lg font-bold text-slate-800">Supabase isn't configured yet</h1>
      <p className="max-w-sm text-sm font-medium text-slate-500">
        Copy <code className="rounded bg-slate-200 px-1.5 py-0.5">.env.example</code> to{' '}
        <code className="rounded bg-slate-200 px-1.5 py-0.5">.env</code> and fill in your Supabase project's URL and
        anon key, then restart the dev server. See the README for the full setup steps.
      </p>
    </div>
  )
}
