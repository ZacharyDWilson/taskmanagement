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

export const looksLikeFeed = v => /^https:\/\/[^\s]+\/feeds\/calendars\/[^\s]+\.ics$/i.test((v ?? '').trim())

export function useCanvas() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(null)       // null = still checking
  const [assignments, setAssignments] = useState([])
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
    setAssignments(data?.assignments ?? [])
  }, [user?.id]) // eslint-disable-line

  useEffect(() => { refresh() }, [refresh])

  const save = useCallback(async url => {
    const clean = url.trim()
    if (!looksLikeFeed(clean)) return 'That does not look like a Canvas calendar feed link. It should start with https:// and end in .ics.'
    const { error } = await supabase.from('canvas_feeds').upsert({ user_id: user.id, url: clean, updated_at: new Date().toISOString() })
    if (error) return error.message
    await refresh()
    return ''
  }, [user?.id, refresh])

  const disconnect = useCallback(async () => {
    await supabase.from('canvas_feeds').delete().eq('user_id', user.id)
    setConnected(false); setAssignments([])
  }, [user?.id])

  return { connected, assignments, error, loading, refresh, save, disconnect }
}
