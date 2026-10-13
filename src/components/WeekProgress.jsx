import { useEffect, useState } from 'react'
import FancyName from './FancyName.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { addDays, fmtDay, fmtMinutes, isoDate, startOfWeek } from '../lib/dates.js'
import { DEMO, demoSessions } from '../lib/demo.js' // DEMO
import LevelCard from './LevelCard.jsx'
import DayBars from './DayBars.jsx'

const WEEKS_BACK = 4 // matches how far back tasks are loaded

const weekLabel = (offset, start) =>
  offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${fmtDay(start)} – ${fmtDay(addDays(start, 6))}`

// Greeting + level + study time for any of the last few weeks, in one card.
export default function WeekProgress({ name, xp, tasks, version }) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [offset, setOffset] = useState(0) // 0 = this week, -1 = last week, ...

  useEffect(() => {
    const since = addDays(startOfWeek(), -7 * WEEKS_BACK)
    supabase
      .from('study_sessions')
      .select('minutes, created_at')
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString())
      .then(({ data }) => setSessions([...(data ?? []), ...(DEMO ? demoSessions() : [])])) // DEMO
  }, [user.id, version])

  const summary = off => {
    const start = addDays(startOfWeek(), off * 7)
    const keys = Array.from({ length: 7 }, (_, i) => isoDate(addDays(start, i)))
    const minutes = keys.map(k =>
      sessions.filter(s => isoDate(new Date(s.created_at)) === k).reduce((n, s) => n + s.minutes, 0))
    const count = sessions.filter(s => keys.includes(isoDate(new Date(s.created_at)))).length
    const weekTasks = tasks.filter(t => keys.includes(t.day))
    return {
      off, start, minutes, count,
      total: minutes.reduce((a, b) => a + b, 0),
      tasksDone: weekTasks.filter(t => t.done).length,
      tasksAll: weekTasks.length,
    }
  }

  const current = summary(offset)
  const todayIdx = offset === 0 ? (new Date().getDay() + 6) % 7 : -1

  return (
    <section className="card week-card">
      <div className="progress-head wk-head">
        <h1>Hey{name ? <>, <FancyName name={name} /></> : ''}</h1>
        <LevelCard xp={xp} compact />
      </div>

      <div className="row between wk-nav">
        <h2>Study time · {weekLabel(offset, current.start)}</h2>
        <div className="row">
          <button className="secondary" aria-label="Previous week" disabled={offset <= -WEEKS_BACK}
            onClick={() => setOffset(o => o - 1)}>‹</button>
          <button className="secondary" disabled={offset === 0} onClick={() => setOffset(0)}>This week</button>
          <button className="secondary" aria-label="Next week" disabled={offset >= 0}
            onClick={() => setOffset(o => o + 1)}>›</button>
        </div>
      </div>

      <div className="stats">
        <div><strong>{fmtMinutes(current.total)}</strong><span>studied</span></div>
        <div><strong>{current.count}</strong><span>focus sessions</span></div>
        <div><strong>{current.tasksDone} / {current.tasksAll}</strong><span>tasks done</span></div>
      </div>

      <DayBars minutes={current.minutes} start={current.start} highlight={todayIdx} />

    </section>
  )
}
