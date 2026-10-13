import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'

const KEY = 'lock-in-dismissed-announcements'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] } }

// The newest announcement from the admin, as a banner you can dismiss. Dismissed ones stay dismissed on this device.
export default function Announcements() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [gone, setGone] = useState(read)

  useEffect(() => {
    if (!user || !supabase) return
    let live = true
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => {
        if (!live) return
        const now = Date.now()
        setList((data ?? []).filter(a => !a.expires_at || new Date(a.expires_at).getTime() > now))
      })
    return () => { live = false }
  }, [user?.id])

  const shown = list.filter(a => !gone.includes(a.id))
  if (shown.length === 0) return null
  const dismiss = id => {
    const next = [...gone, id].slice(-50)
    setGone(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }
  return (
    <div className="announcements" role="region" aria-label="Announcements">
      {shown.slice(0, 2).map(a => (
        <div key={a.id} className="announcement card">
          <span aria-hidden="true">📣</span>
          <div className="announcement-body">
            <strong>{a.title}</strong>
            {a.body && <p className="small">{a.body}</p>}
          </div>
          <button type="button" className="link" onClick={() => dismiss(a.id)} aria-label="Dismiss announcement">×</button>
        </div>
      ))}
    </div>
  )
}
