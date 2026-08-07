import { Link } from 'react-router'
import { CompassIcon } from 'lucide-react'

export function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-slate-100 px-6 text-center">
      <CompassIcon className="h-10 w-10 text-slate-400" />
      <h1 className="text-lg font-bold text-slate-800">Page not found</h1>
      <Link to="/" className="mt-2 h-11 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-bold text-white">
        Back to Regattas
      </Link>
    </div>
  )
}
