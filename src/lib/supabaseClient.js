import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Every route needs Supabase (directory, dashboard, and admin all read from
// it), so when it's not configured yet we still export a client-shaped stub
// rather than throwing at import time — callers check isSupabaseConfigured
// and show a setup screen instead of a blank crash.
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
