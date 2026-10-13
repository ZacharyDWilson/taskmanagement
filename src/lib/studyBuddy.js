import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './auth.jsx'
import { DEMO, demoQueue, isDemoId } from './demo.js' // DEMO

// Gordon's library room booking (Jenks Library, "Schedule Jenks").
export const BOOKING_URL = 'https://schedulejenks.gordon.edu/'
const STALE_MS = 3 * 60 * 60 * 1000 // hide people who've been waiting 3+ hours

export const ROLE_LABEL = { have_room: 'Has a study room', need_room: 'Needs a room' }

const pad = n => String(n).padStart(2, '0')
export const fmtTime = iso => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
export const toTimeValue = iso => (iso ? `${pad(new Date(iso).getHours())}:${pad(new Date(iso).getMinutes())}` : '')

// "15:30" becomes today at 3:30 PM (or tomorrow if that time is already well past).
export function untilFrom(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (d.getTime() < Date.now() - 60 * 60 * 1000) d.setDate(d.getDate() + 1)
  return d.toISOString()
}

export function roomStatus(row) {
  if (!row || row.role !== 'have_room' || !row.room_until) return null
  return new Date(row.room_until) < new Date() ? 'Room time has ended' : `Room until ${fmtTime(row.room_until)}`
}

// Everything about studying together: who is open, whether you are matched, and the actions.
export function useStudyBuddy() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [demoPartner, setDemoPartner] = useState(null) // DEMO: pretend-match with a filler person
  const demoRows = useMemo(() => (DEMO ? demoQueue() : []), []) // DEMO

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('study_queue')
      .select('*, profiles!study_queue_user_id_fkey(display_name, avatar_path, color, frame)')
      .order('joined_at')
    if (error) setError(error.message)
    else setRows(data)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 8000)
    return () => clearInterval(id)
  }, [load])

  const act = useCallback(async promise => {
    setError('')
    const { error } = await promise
    if (error) setError(error.message)
    load()
  }, [load])

  const me = rows.find(r => r.user_id === user.id) ?? null
  const partner = (me && demoPartner) // DEMO: was only the second branch
    || (me?.matched_with ? rows.find(r => r.user_id === me.matched_with) : null) || null
  const open = [...demoRows, ...rows] // DEMO: was `rows`
    .filter(r => r.user_id !== user.id && !r.matched_with && r.user_id !== demoPartner?.user_id
      && Date.now() - new Date(r.joined_at) < STALE_MS)

  const join = useCallback(({ role, room, until, note }) => {
    const hosting = role === 'have_room'
    return act(supabase.from('study_queue').insert({
      user_id: user.id, role,
      room: hosting ? room.trim() : '',
      room_until: hosting ? untilFrom(until) : null,
      note: note.trim(),
    }))
  }, [act, user.id])

  const saveRoom = useCallback((room, until) =>
    act(supabase.from('study_queue')
      .update({ room: room.trim(), room_until: untilFrom(until) })
      .eq('user_id', user.id)), [act, user.id])

  const bookedRoom = useCallback((room, until) =>
    act(supabase.from('study_queue')
      .update({ role: 'have_room', room: room.trim(), room_until: untilFrom(until) })
      .eq('user_id', user.id)), [act, user.id])

  const pick = useCallback(row => (isDemoId(row.user_id) // DEMO
    ? setDemoPartner(row)
    : act(supabase.rpc('match_study_buddy', { other: row.user_id }))), [act])

  const leave = useCallback(() => { setDemoPartner(null); return act(supabase.rpc('leave_study_queue')) }, [act])
  const endMatch = useCallback(() => (demoPartner ? setDemoPartner(null) : act(supabase.rpc('unmatch_study_buddy'))),
    [act, demoPartner])

  return { me, partner, open, error, join, saveRoom, bookedRoom, pick, leave, endMatch }
}
