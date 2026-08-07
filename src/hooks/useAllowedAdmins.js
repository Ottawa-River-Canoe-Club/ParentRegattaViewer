import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

/** Lists the allowed_admins table for the Admin Portal. Only ever succeeds
 * for an actual admin — RLS denies this select to everyone else. */
export function useAllowedAdmins() {
  const [emails, setEmails] = useState([])
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return
    setIsLoading(true)
    const { data, error: fetchError } = await supabase
      .from('allowed_admins')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEmails(data ?? [])
      setError(null)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { emails, isLoading, error, refresh }
}
