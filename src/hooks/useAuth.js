import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

/**
 * Wraps Supabase auth session state plus the is_admin() authorization check.
 * NOTE: isAdmin here is a UX convenience only — the actual access control
 * boundary is the RLS policies in supabase/migrations, which call the same
 * is_admin() function server-side and can't be bypassed from the client.
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    // Resolves session + admin status together so the UI never briefly
    // flashes "signed in but not admin" before the RPC check catches up.
    async function resolve(nextSession) {
      if (cancelled) return
      setSession(nextSession)
      if (nextSession) {
        const { data, error } = await supabase.rpc('is_admin')
        if (!cancelled) setIsAdmin(!error && data === true)
      } else {
        setIsAdmin(false)
      }
      if (!cancelled) setIsLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session))

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setIsLoading(true)
      resolve(nextSession)
    })

    return () => {
      cancelled = true
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin` },
    })
    return { error }
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return {
    user: session?.user ?? null,
    isSignedIn: Boolean(session),
    isAdmin,
    isLoading,
    signInWithGoogle,
    signOut,
  }
}
