import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAchievements } from '../lib/achievements.jsx'

// A row of earned badges on a profile: the ones you pinned first, then the most recent. Works for anyone's profile.
export default function BadgeStrip({ userId, mine = false, max = 6 }) {
  const { catalog, loaded } = useAchievements()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let live = true
    supabase.from('user_achievements').select('achievement_id, earned_at, pinned').eq('user_id', userId)
      .then(({ data }) => { if (live) setRows(data ?? []) })
    return () => { live = false }
  }, [userId, catalog.length])

  if (!loaded || rows === null) return null
  const byId = new Map(catalog.map(a => [a.id, a]))
  const shown = [...rows]
    .filter(r => byId.has(r.achievement_id))
    .sort((a, b) => (b.pinned - a.pinned) || String(b.earned_at).localeCompare(String(a.earned_at)))
    .slice(0, max)

  if (shown.length === 0) {
    return mine ? (
      <p className="badge-empty muted small">No badges yet. <Link to="/achievements">See what you can earn</Link>.</p>
    ) : null
  }
  return (
    <div className="badge-strip" aria-label="Badges">
      {shown.map(r => {
        const a = byId.get(r.achievement_id)
        return (
          <span key={a.id} className={'badge tier-' + a.tier} title={`${a.name}: ${a.description}`}>
            <span aria-hidden="true">{a.icon}</span>
          </span>
        )
      })}
      <Link to={mine ? '/achievements' : `/achievements/${userId}`} className="badge-more small">All achievements ›</Link>
    </div>
  )
}
