import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { fmtMinutes, startOfWeek } from '../lib/dates.js'
import Avatar from './Avatar.jsx'
import { DEMO, demoLeaderboard } from '../lib/demo.js' // DEMO

export default function Leaderboard({ version }) {
  const { user } = useAuth()
  const [rows, setRows] = useState([])

  useEffect(() => {
    supabase
      .rpc('weekly_leaderboard', { since: startOfWeek().toISOString() })
      .then(({ data }) => {
        const real = data ?? []
        setRows(DEMO ? [...real, ...demoLeaderboard()].sort((a, b) => b.minutes - a.minutes) : real) // DEMO
      })
  }, [version])

  return (
    <section className="card fill">
      <h2>Study leaderboard</h2>
      {rows.length === 0 && <p className="muted">No focus time logged yet this week. Start a Pomodoro!</p>}
      <ol className="board scroll">
        {rows.map((r, i) => (
          <li key={r.user_id} className={r.user_id === user.id ? 'me' : ''}>
            <span className="rank">{i + 1}</span>
            <Avatar name={r.display_name} path={r.avatar_path} color={r.color} frame={r.frame} size={32} />
            <Link to={`/profile/${r.user_id}`}>{r.display_name}</Link>
            <span className="spacer" />
            <strong>{fmtMinutes(r.minutes)}</strong>
          </li>
        ))}
      </ol>
    </section>
  )
}
