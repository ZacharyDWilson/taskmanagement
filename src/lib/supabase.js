import { createClient } from '@supabase/supabase-js'
import { fakeSupabase } from './fakeSupabase.js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const fake = import.meta.env.VITE_FAKE_BACKEND === 'true'
export const isConfigured = fake || Boolean(url && anonKey)

// The anon key is safe to ship in the browser; row-level security in
// supabase/schema.sql is what actually protects the data.
export const supabase = fake ? fakeSupabase : isConfigured ? createClient(url, anonKey) : null

// Dev-only handle for debugging in the browser console. Not included in production builds.
if (import.meta.env.DEV && supabase) window.__supabase = supabase
