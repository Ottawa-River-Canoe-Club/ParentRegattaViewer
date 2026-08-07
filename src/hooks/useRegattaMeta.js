import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

/** Fetches a single regatta row by id, for the /regatta/:id dashboard to
 * learn which sheet to pull the schedule/results CSVs from. */
export function useRegattaMeta(id) {
  const [regatta, setRegatta] = useState(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !id) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    supabase
      .from('regattas')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
        } else if (!data) {
          setError('Regatta not found')
        } else {
          setRegatta(data)
          setError(null)
        }
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return { regatta, isLoading, error }
}
