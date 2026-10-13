import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Must match public.level_for_xp in supabase/003_levels.sql.
export const xpForLevel = n => 50 * n * (n - 1)
export const levelFromXp = xp => Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2)

export function useXp(userId, version = 0) {
  const [xp, setXp] = useState(null)
  useEffect(() => {
    supabase.rpc('user_xp', { uid: userId }).then(({ data }) => setXp(data ?? 0))
  }, [userId, version])
  return xp
}

export function useCosmetics() {
  const [items, setItems] = useState([])
  useEffect(() => {
    supabase.from('cosmetics').select('*').order('min_level')
      .then(({ data }) => setItems(data ?? []))
  }, [])
  return items
}
