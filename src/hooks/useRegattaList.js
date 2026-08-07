import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

/** Fetches every regatta (both active and archived — filtering between the
 * two is a client-side toggle, not a separate query) for the public
 * directory and the admin table. */
export function useRegattaList() {
  const [regattas, setRegattas] = useState([])
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setIsLoading(true)
    const { data, error: fetchError } = await supabase.from('regattas').select('*').order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setRegattas(data ?? [])
      setError(null)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { regattas, isLoading, error, refresh }
}
