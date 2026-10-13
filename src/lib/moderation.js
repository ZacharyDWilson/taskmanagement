import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'

// Whether you are currently muted or banned from posting and commenting, and why.
// Returns { status: 'muted' | 'banned' | null, reason, until }.
export function useMyModeration(version = 0) {
  const { user } = useAuth()
  const [state, setState] = useState({ status: null, reason: '', until: null })
  useEffect(() => {
    if (!user || !supabase) return
    let live = true
    supabase.from('user_moderation').select('status, reason, until').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!live) return
        const active = data && (!data.until || new Date(data.until) > new Date())
        setState(active ? { status: data.status, reason: data.reason ?? '', until: data.until } : { status: null, reason: '', until: null })
      })
    return () => { live = false }
  }, [user?.id, version])
  return state
}

export const blockedText = m => {
  if (!m.status) return ''
  const until = m.until ? ` until ${new Date(m.until).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''
  return `You can't post or comment right now: you're ${m.status === 'banned' ? 'banned from posting and commenting' : 'muted'}${until}.${m.reason ? ' Reason: ' + m.reason : ''} You can still use the planner and the timers.`
}

// Is this person an admin? Decided by the database; the dashboard functions re-check on the server.
export function useIsAdmin() {
  const { user } = useAuth()
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    if (!user || !supabase) { setAdmin(false); return }
    let live = true
    supabase.rpc('is_admin').then(({ data }) => { if (live) setAdmin(data === true) })
    return () => { live = false }
  }, [user?.id])
  return admin
}
