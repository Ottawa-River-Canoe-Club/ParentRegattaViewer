import { useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { parseSheetId, parseGid } from '../lib/googleSheets'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Admin-only mutations. The RLS policies in supabase/migrations are the
 * real gate on these — this hook doesn't need to re-check is_admin() itself,
 * a non-admin's insert/update simply gets rejected by Postgres. */
export function useAdminActions() {
  const addRegatta = useCallback(async ({ name, startDate, endDate, scheduleUrl, resultsUrl }) => {
    const sheetId = parseSheetId(scheduleUrl)
    if (!sheetId) return { error: "Couldn't find a Sheet ID in that Schedule Sheet URL" }

    const { error } = await supabase.from('regattas').insert({
      name,
      start_date: startDate,
      end_date: endDate,
      sheet_url: sheetId,
      results_gid: parseGid(resultsUrl),
      status: 'active',
    })
    return { error: error?.message ?? null }
  }, [])

  const toggleRegattaStatus = useCallback(async (regatta) => {
    const nextStatus = regatta.status === 'active' ? 'archived' : 'active'
    const { error } = await supabase.from('regattas').update({ status: nextStatus }).eq('id', regatta.id)
    return { error: error?.message ?? null }
  }, [])

  const updateRegatta = useCallback(async (id, { name, startDate, endDate, scheduleUrl, resultsUrl }) => {
    const sheetId = parseSheetId(scheduleUrl)
    if (!sheetId) return { error: "Couldn't find a Sheet ID in that Schedule Sheet URL" }

    const { error } = await supabase
      .from('regattas')
      .update({
        name,
        start_date: startDate,
        end_date: endDate,
        sheet_url: sheetId,
        results_gid: parseGid(resultsUrl),
      })
      .eq('id', id)
    return { error: error?.message ?? null }
  }, [])

  const deleteRegatta = useCallback(async (id) => {
    const { error } = await supabase.from('regattas').delete().eq('id', id)
    return { error: error?.message ?? null }
  }, [])

  const addAllowedAdmin = useCallback(async (email) => {
    const trimmed = (email ?? '').trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) return { error: 'Enter a valid email address' }

    const { error } = await supabase.from('allowed_admins').insert({ email: trimmed })
    return { error: error?.message ?? null }
  }, [])

  return { addRegatta, toggleRegattaStatus, updateRegatta, deleteRegatta, addAllowedAdmin }
}
