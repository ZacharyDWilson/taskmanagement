import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAchievements } from '../lib/achievements.jsx'
import { useShop } from '../lib/shop.jsx'
import { useToast } from '../lib/toast.jsx'
import { THEMES } from '../lib/theme.jsx'

const TIERS = [['all', 'All'], ['bronze', 'Bronze'], ['silver', 'Silver'], ['gold', 'Gold']]

// How much progress is shown for each stat, in words people use.
const UNIT = {
  focus_minutes: v => `${Math.floor(v / 60)}h ${v % 60}m`,
  weekly_minutes_best: v => `${Math.floor(v / 60)}h ${v % 60}m`,
  longest_session: v => `${v} min`,
  streak_days: v => `${v} day${v === 1 ? '' : 's'}`,
}
const fmt = (stat, v) => (UNIT[stat] ? UNIT[stat](v) : String(v))

export default function Achievements() {
  const { catalog, earned, stats, loaded, pin } = useAchievements()
  const { items } = useShop()
  const toast = useToast()
  const [tier, setTier] = useState('all')
  const [show, setShow] = useState('all')   // all | earned | todo

  const itemName = useMemo(() => {
    const m = new Map(items.map(i => [i.id, i.name]))
    for (const t of THEMES) if (!m.has(t.id)) m.set(t.id, t.name)
    return m
  }, [items])

  const list = catalog.filter(a => (tier === 'all' || a.tier === tier)
    && (show === 'all' || (show === 'earned') === earned.has(a.id)))
  const done = catalog.filter(a => earned.has(a.id)).length
  const coins = [...earned.values()].reduce((n, r) => n + (r.coins_paid ?? 0), 0)
  const pinned = [...earned.values()].filter(r => r.pinned).map(r => r.achievement_id)

  async function togglePin(id) {
    const next = pinned.includes(id) ? pinned.filter(x => x !== id) : [...pinned, id]
    if (next.length > 3) return toast('You can pin up to 3 badges. Unpin one first.', 'info', { silent: true })
    const err = await pin(next)
    if (err) toast(err)
  }

  return (
    <div className="achievements">
      <header className="card ach-head">
        <div>
          <h1>Achievements</h1>
          <p className="muted">Reach a goal to earn a badge for your profile, plus coins and a few styles you can't buy.</p>
        </div>
        <div className="ach-summary" aria-label="Your progress">
          <strong>{done}<small> / {catalog.length}</small></strong>
          <span className="muted small">badges · 🪙 {coins.toLocaleString()} earned</span>
        </div>
      </header>

      <div className="ach-filters">
        <div className="seg" role="tablist" aria-label="Show">
          {[['all', 'All'], ['earned', 'Earned'], ['todo', 'To earn']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={show === id}
              className={'seg-btn' + (show === id ? ' on' : '')} onClick={() => setShow(id)}>{label}</button>
          ))}
        </div>
        <div className="seg" role="tablist" aria-label="Tier">
          {TIERS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tier === id}
              className={'seg-btn' + (tier === id ? ' on' : '')} onClick={() => setTier(id)}>{label}</button>
          ))}
        </div>
      </div>

      {!loaded && <p className="muted">Loading…</p>}
      {loaded && list.length === 0 && <p className="muted">Nothing here yet. Try another filter.</p>}

      <div className="ach-grid">
        {list.map(a => {
          const row = earned.get(a.id)
          const value = Math.min(a.goal, stats[a.stat] ?? 0)
          const pct = Math.round((value / a.goal) * 100)
          return (
            <article key={a.id} className={'card ach-card tier-' + a.tier + (row ? ' earned' : '')}>
              <span className="ach-medal" aria-hidden="true">{a.icon}</span>
              <div className="ach-body">
                <h3>{a.name} <small className="ach-tier">{a.tier}</small></h3>
                <p className="muted small">{a.description}</p>
                {row ? (
                  <p className="ach-done small">✓ Earned {new Date(row.earned_at).toLocaleDateString()}</p>
                ) : (
                  <div className="ach-progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
                    <span style={{ width: pct + '%' }} />
                    <small>{fmt(a.stat, value)} / {fmt(a.stat, a.goal)}</small>
                  </div>
                )}
                <div className="ach-rewards">
                  {a.reward_coins > 0 && <span className="reward-chip">🪙 {a.reward_coins}</span>}
                  {a.reward_item && <span className="reward-chip exclusive">✦ {itemName.get(a.reward_item) ?? 'Exclusive style'}</span>}
                </div>
              </div>
              {row && (
                <button type="button" className={'secondary ach-pin' + (row.pinned ? ' on' : '')}
                  onClick={() => togglePin(a.id)} aria-pressed={!!row.pinned}
                  title={row.pinned ? 'Shown first on your profile' : 'Show this first on your profile'}>
                  {row.pinned ? '📌 Pinned' : '📍 Pin'}
                </button>
              )}
            </article>
          )
        })}
      </div>
      <p className="muted small"><Link to="/profile">Back to your profile</Link></p>
    </div>
  )
}
