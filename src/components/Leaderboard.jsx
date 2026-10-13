import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { fmtMinutes, startOfWeek } from '../lib/dates.js'
import { DEMO, demoLeaderboard, demoSessions } from '../lib/demo.js' // DEMO
import Avatar from './Avatar.jsx'
import MiniBadges from './MiniBadges.jsx'
import { useTopBadges } from '../lib/achievements.jsx'

// Weekly study ranking, with your own placement called out at the top.
export default function Leaderboard({ version }) {
  const { user } = useAuth()
  const [rows, setRows] = useState([])

  useEffect(() => {
    const since = startOfWeek()
    supabase.rpc('weekly_leaderboard', { since: since.toISOString() }).then(({ data }) => {
      let list = data ?? []
      if (DEMO) { // DEMO: add the filler friends, and count your own filler study time
        const mine = demoSessions()
          .filter(s => new Date(s.created_at) >= since)
          .reduce((n, s) => n + s.minutes, 0)
        const me = list.find(r => r.user_id === user.id)
        if (me) list = list.map(r => (r === me ? { ...r, minutes: r.minutes + mine } : r))
        else if (mine > 0) {
          list = [...list, {
            user_id: user.id, display_name: user.user_metadata?.display_name ?? 'You',
            avatar_path: null, color: 'blue', frame: 'frame-none', minutes: mine,
          }]
        }
        list = [...list, ...demoLeaderboard()].sort((a, b) => b.minutes - a.minutes)
      }
      setRows(list)
    })
  }, [version, user.id])

  const rank = rows.findIndex(r => r.user_id === user.id)
  const badges = useTopBadges(rows.map(r => r.user_id))

  return (
    <section className="card fill">
      <h2>Study leaderboard <small>this week</small></h2>
      {rank >= 0 ? (
        <p className="placement">
          You're <strong>#{rank + 1}</strong> of {rows.length} with <strong>{fmtMinutes(rows[rank].minutes)}</strong>
          {rank > 0 && <span className="muted"> · {fmtMinutes(rows[rank - 1].minutes - rows[rank].minutes)} behind #{rank}</span>}
        </p>
      ) : (
        <p className="placement muted">Finish a focus session to get on the board.</p>
      )}
      {rows.length === 0 && <p className="muted">No focus time logged yet this week. Start a Pomodoro!</p>}
      <ol className="board scroll">
        {rows.map((r, i) => (
          <li key={r.user_id} className={r.user_id === user.id ? 'me' : ''}>
            <span className="rank">{i + 1}</span>
            <Avatar name={r.display_name} path={r.avatar_path} color={r.color} frame={r.frame} size={34} />
            <Link to={`/profile/${r.user_id}`}>{r.display_name}{r.user_id === user.id ? ' (you)' : ''}</Link>
            <MiniBadges userId={r.user_id} list={badges.get(r.user_id)} />
            <span className="spacer" />
            <strong>{fmtMinutes(r.minutes)}</strong>
          </li>
        ))}
      </ol>
    </section>
  )
}
