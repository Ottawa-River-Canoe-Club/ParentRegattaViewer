import { useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { parseSheetId, parseGid } from '../lib/googleSheets'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The field arrives as whatever the form last had: an empty string
 * (untouched), a typed string, or — if a regatta with an existing value was
 * never touched in the edit modal — the raw number straight from Supabase.
 * Blank or non-numeric always becomes null (no override) rather than 0, so
 * an organizer clearing the field can't accidentally filter out Race 0. */
function parseStartRaceNumber(value) {
  if (value === '' || value == null) return null
  const n = typeof value === 'number' ? value : parseInt(value, 10)
  return Number.isInteger(n) ? n : null
}

/** Admin-only mutations. The RLS policies in supabase/migrations are the
 * real gate on these — this hook doesn't need to re-check is_admin() itself,
 * a non-admin's insert/update simply gets rejected by Postgres. */
export function useAdminActions() {
  const addRegatta = useCallback(async ({ name, startDate, endDate, scheduleUrl, resultsUrl, startRaceNumber }) => {
    const sheetId = parseSheetId(scheduleUrl)
    if (!sheetId) return { error: "Couldn't find a Sheet ID in that Schedule Sheet URL" }

    const { error } = await supabase.from('regattas').insert({
      name,
      start_date: startDate,
      end_date: endDate,
      sheet_url: sheetId,
      results_gid: parseGid(resultsUrl),
      start_race_number: parseStartRaceNumber(startRaceNumber),
      status: 'active',
    })
    return { error: error?.message ?? null }
  }, [])

  const toggleRegattaStatus = useCallback(async (regatta) => {
    const nextStatus = regatta.status === 'active' ? 'archived' : 'active'
    const { error } = await supabase.from('regattas').update({ status: nextStatus }).eq('id', regatta.id)
    return { error: error?.message ?? null }
  }, [])

  const updateRegatta = useCallback(async (id, { name, startDate, endDate, scheduleUrl, resultsUrl, startRaceNumber }) => {
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
        start_race_number: parseStartRaceNumber(startRaceNumber),
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
