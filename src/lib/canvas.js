import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { DEMO } from './demo.js'

// Whether a Canvas feed is connected, and the assignments from it.
// The feed link is stored privately (table canvas_feeds); the server function reads it and returns the list.
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const demoAssignments = () => [ // DEMO: filler so the card can be seen without a real Canvas link
  { uid: 'demo-canvas-1', title: 'Problem Set 6', course: 'MAT 212', due: day(1), allDay: true, url: '', description: '' },
  { uid: 'demo-canvas-2', title: 'Lab report: titration', course: 'CHE 121', due: day(2), allDay: true, url: '', description: '' },
  { uid: 'demo-canvas-3', title: 'Reading response 4', course: 'ENG 101', due: day(4), allDay: true, url: '', description: '' },
  { uid: 'demo-canvas-4', title: 'Discussion post', course: 'HIS 110', due: day(6), allDay: true, url: '', description: '' },
]

// Calendar links come in a few shapes (Canvas, Brightspace, others), so the check is deliberately relaxed: an https
// address (webcal:// is turned into https://) that looks like a calendar. Returns the cleaned link, or '' if it isn't one.
export function cleanFeed(v) {
  let s = (v ?? '').trim().replace(/^webcal:\/\//i, 'https://').replace(/^http:\/\//i, 'https://')
  if (/\s/.test(s) || s.length > 1000) return ''
  try {
    const u = new URL(s)
    if (u.protocol !== 'https:' || !u.hostname.includes('.')) return ''
    if (!/(\.ics$|ical|calendar|feed)/i.test(u.pathname)) return ''
    return s
  } catch { return '' }
}
export const looksLikeFeed = v => cleanFeed(v) !== ''

export const PROVIDERS = {
  canvas: { name: 'Canvas' },
  brightspace: { name: 'Brightspace' },
  other: { name: 'Calendar' },
}

export function useCanvas() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(null)       // null = still checking
  const [assignments, setAssignments] = useState([])
  const [provider, setProvider] = useState('canvas')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || !supabase) return
    if (DEMO) { setConnected(true); setAssignments(demoAssignments()); return } // DEMO
    setLoading(true); setError('')
    const { data, error } = await supabase.functions.invoke('canvas-feed')
    setLoading(false)
    if (error) {
      setConnected(prev => prev ?? false)
      return setError(/not found|404|Failed to send/i.test(error.message)
        ? 'Canvas isn\'t switched on for this site yet (the server function is not deployed).'
        : error.message)
    }
    if (data?.error) setError(data.error)
    setConnected(!!data?.connected)
    if (data?.provider) setProvider(data.provider)
    setAssignments(data?.assignments ?? [])
  }, [user?.id]) // eslint-disable-line

  useEffect(() => { refresh() }, [refresh])

  const save = useCallback(async (url, which = 'canvas') => {
    const clean = cleanFeed(url)
    if (!clean) return 'That does not look like a calendar link. It should start with https:// (or webcal://) and be the calendar subscription link from your school.'
    const row = { user_id: user.id, url: clean, provider: which, updated_at: new Date().toISOString() }
    let { error } = await supabase.from('canvas_feeds').upsert(row)
    if (error && /provider/i.test(error.message)) {            // the database has not been updated yet: save it the old way
      const { provider: _unused, ...plain } = row
      ;({ error } = await supabase.from('canvas_feeds').upsert(plain))
    }
    if (error) return error.message
    setProvider(which)
    await refresh()
    return ''
  }, [user?.id, refresh])

  const disconnect = useCallback(async () => {
    await supabase.from('canvas_feeds').delete().eq('user_id', user.id)
    setConnected(false); setAssignments([])
  }, [user?.id])

  return { connected, assignments, provider, providerName: PROVIDERS[provider]?.name ?? 'Calendar', error, loading, refresh, save, disconnect }
}
