import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { addDays, DAY_NAMES, fmtMinutes, isoDate, startOfWeek } from '../lib/dates.js'
import { DEMO, demoSessions } from '../lib/demo.js' // DEMO

export default function WeekStats({ tasks, version }) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    supabase
      .from('study_sessions')
      .select('minutes, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfWeek().toISOString())
      .then(({ data }) => setSessions([...(data ?? []), ...(DEMO ? demoSessions() : [])])) // DEMO
  }, [user.id, version])

  const week = startOfWeek()
  const perDay = DAY_NAMES.map((_, i) => {
    const key = isoDate(addDays(week, i))
    return sessions
      .filter(s => isoDate(new Date(s.created_at)) === key)
      .reduce((sum, s) => sum + s.minutes, 0)
  })
  const total = perDay.reduce((a, b) => a + b, 0)
  const max = Math.max(...perDay, 30)
  const today = (new Date().getDay() + 6) % 7

  const weekKeys = new Set(DAY_NAMES.map((_, i) => isoDate(addDays(week, i))))
  const weekTasks = tasks.filter(t => weekKeys.has(t.day))
  const doneCount = weekTasks.filter(t => t.done).length

  return (
    <section className="card">
      <h2>This week</h2>
      <div className="stats">
        <div><strong>{fmtMinutes(total)}</strong><span>studied</span></div>
        <div><strong>{sessions.length}</strong><span>sessions</span></div>
        <div><strong>{doneCount}/{weekTasks.length}</strong><span>tasks done</span></div>
      </div>
      <div className="bars">
        {perDay.map((m, i) => (
          <div key={i} className={'bar' + (i === today ? ' today' : '')} title={fmtMinutes(m)}>
            <div className="fill" style={{ height: `${(m / max) * 100}%` }} />
            <span>{DAY_NAMES[i]}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
