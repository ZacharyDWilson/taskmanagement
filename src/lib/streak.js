import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { usePomodoro } from './pomodoro.jsx'
import { useShop } from './shop.jsx'

// The study streak (see supabase/037_study_streak.sql). The day is the viewer's own local date, sent along with the
// UTC offset so an evening session is not counted as "tomorrow".
const pad = n => String(n).padStart(2, '0')
export const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const utcOffsetMinutes = (d = new Date()) => -d.getTimezoneOffset()

// what claiming pays for a given streak length (matches claim_streak_bonus)
export const streakCoins = n => Math.min(n, 10) * 3 + (n === 14 ? 75 : n === 30 ? 250 : 0)

export function useStreak() {
  const { user } = useAuth()
  const timer = usePomodoro()
  const shop = useShop()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user || !supabase) return
    const { data, error } = await supabase.rpc('streak_status', { local_day: localDay(), offset_min: utcOffsetMinutes() })
    if (error) { setError(error.message); return }
    setError('')
    setStatus(data)
  }, [user?.id]) // eslint-disable-line

  // load on open, whenever a focus session is saved, and when the tab comes back into view
  useEffect(() => { load() }, [load, timer.logged])
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [load])

  async function claim() {
    setBusy(true); setError('')
    const { data, error } = await supabase.rpc('claim_streak_bonus', { local_day: localDay(), offset_min: utcOffsetMinutes() })
    setBusy(false)
    if (error) { setError(error.message); return null }
    await Promise.all([load(), shop.refresh?.()])
    return data
  }

  return { status, error, busy, claim, reload: load }
}
