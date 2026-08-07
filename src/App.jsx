import { Routes, Route } from 'react-router'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { SetupRequired } from './components/SetupRequired'
import { PublicDirectory } from './pages/PublicDirectory'
import { RegattaDashboard } from './pages/RegattaDashboard'
import { AdminPortal } from './pages/AdminPortal'
import { NotFound } from './pages/NotFound'

export default function App() {
  if (!isSupabaseConfigured) return <SetupRequired />

  return (
    <Routes>
      <Route path="/" element={<PublicDirectory />} />
      <Route path="/regatta/:id" element={<RegattaDashboard />} />
      <Route path="/admin" element={<AdminPortal />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
