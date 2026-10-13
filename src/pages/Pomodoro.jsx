import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { usePomodoro, mmss } from '../lib/pomodoro.jsx'
import { fmtMinutes, startOfWeek } from '../lib/dates.js'
import Leaderboard from '../components/Leaderboard.jsx'

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || lo))

export default function Pomodoro() {
  const { user } = useAuth()
  const p = usePomodoro()
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    supabase
      .from('study_sessions')
      .select('id, minutes, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfWeek().toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => setSessions(data ?? []))
  }, [user.id, p.logged])

  const todayKey = new Date().toDateString()
  const today = sessions.filter(s => new Date(s.created_at).toDateString() === todayKey)
  const sum = list => list.reduce((n, s) => n + s.minutes, 0)

  return (
    <div className="two">
      <section className="card pomodoro center">
        <h1>Pomodoro</h1>
        <div className="tabs">
          <button className={p.mode === 'focus' ? 'active' : ''} onClick={() => p.switchMode('focus')}>Focus</button>
          <button className={p.mode === 'break' ? 'active' : ''} onClick={() => p.switchMode('break')}>Break</button>
        </div>
        <div className="clock big">{mmss(p.left)}</div>
        <div className="row">
          <button onClick={p.startPause}>{p.running ? 'Pause' : p.left < p.total ? 'Resume' : 'Start'}</button>
          <button className="secondary" onClick={() => p.switchMode(p.mode)}>Reset</button>
          {p.mode === 'focus' && p.elapsedMin >= 1 && (
            <button className="secondary" onClick={p.finishEarly}>Finish &amp; log {p.elapsedMin}m</button>
          )}
        </div>
        <div className="row small">
          <label>Focus <input type="number" min="1" max="120" value={p.focusMin} disabled={p.running}
            onChange={e => p.setFocusMin(clamp(e.target.value, 1, 120))} /> min</label>
          <label>Break <input type="number" min="1" max="60" value={p.breakMin} disabled={p.running}
            onChange={e => p.setBreakMin(clamp(e.target.value, 1, 60))} /> min</label>
        </div>
        {p.msg && <p className="muted">{p.msg}</p>}
      </section>

      <div className="col">
        <Leaderboard version={p.logged} />

        <section className="card fill">
          <h2>Your focus time</h2>
          <div className="stats">
            <div><strong>{fmtMinutes(sum(today))}</strong><span>today</span></div>
            <div><strong>{fmtMinutes(sum(sessions))}</strong><span>this week</span></div>
            <div><strong>{today.length}</strong><span>sessions today</span></div>
          </div>
          {today.length === 0 && <p className="muted">No sessions yet today. Start your first one!</p>}
          <ul className="list scroll">
            {today.map(s => (
              <li key={s.id}>
                <span>{new Date(s.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                <strong>{s.minutes} min</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
