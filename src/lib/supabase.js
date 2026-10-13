import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

// The anon key is safe to ship in the browser; row-level security in
// supabase/schema.sql is what actually protects the data.
export const supabase = isConfigured ? createClient(url, anonKey) : null
