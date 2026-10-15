import { useEffect, useMemo, useState } from 'react'
import Coin from '../components/Coin.jsx'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { badgeIcon } from '../lib/badgeIcon.js'
import { useAuth } from '../lib/auth.jsx'
import { useAchievements } from '../lib/achievements.jsx'
import { useShop } from '../lib/shop.jsx'
import { useToast } from '../lib/toast.jsx'
import { THEMES } from '../lib/theme.jsx'
import FancyName from '../components/FancyName.jsx'
import ShareButton from '../components/ShareButton.jsx'

const TIERS = [['all', 'All'], ['bronze', 'Bronze'], ['silver', 'Silver'], ['gold', 'Gold']]

// How much progress is shown for each stat, in words people use.
const UNIT = {
  focus_minutes: v => `${Math.floor(v / 60)}h ${v % 60}m`,
  weekly_minutes_best: v => `${Math.floor(v / 60)}h ${v % 60}m`,
  longest_session: v => `${v} min`,
  streak_days: v => `${v} day${v === 1 ? '' : 's'}`,
}
const fmt = (stat, v) => (UNIT[stat] ? UNIT[stat](v) : String(v))

// Your own achievements (with progress and pinning) at /achievements, or anyone's earned badges at /achievements/:id.
export default function Achievements() {
  const { id } = useParams()
  const { user } = useAuth()
  const mine = !id || id === user.id
  const own = useAchievements()
  const { items } = useShop()
  const toast = useToast()
  const [tier, setTier] = useState('all')
  const [show, setShow] = useState('all')   // all | earned | todo (your own page only)

  // someone else's page: their earned rows and their name
  const [other, setOther] = useState({ rows: null, name: '' })
  useEffect(() => {
    if (mine) return
    let live = true
    Promise.all([
      supabase.from('user_achievements').select('*').eq('user_id', id),
      supabase.from('profiles').select('display_name').eq('id', id).maybeSingle(),
    ]).then(([a, p]) => { if (live) setOther({ rows: a.data ?? [], name: p.data?.display_name ?? 'Someone' }) })
    return () => { live = false }
  }, [id, mine])

  const { catalog, loaded, pin, stats } = own
  const earned = useMemo(
    () => (mine ? own.earned : new Map((other.rows ?? []).map(r => [r.achievement_id, r]))),
    [mine, own.earned, other.rows],
  )
  const ready = mine ? loaded : loaded && other.rows !== null

  const itemName = useMemo(() => {
    const m = new Map(items.map(i => [i.id, i.name]))
    for (const t of THEMES) if (!m.has(t.id)) m.set(t.id, t.name)
    return m
  }, [items])

  const list = catalog.filter(a => (tier === 'all' || a.tier === tier)
    && (!mine ? earned.has(a.id) : show === 'all' || (show === 'earned') === earned.has(a.id)))
  const done = catalog.filter(a => earned.has(a.id)).length
  const coins = [...earned.values()].reduce((n, r) => n + (r.coins_paid ?? 0), 0)
  const pinned = [...earned.values()].filter(r => r.pinned).map(r => r.achievement_id)

  async function togglePin(aid) {
    const next = pinned.includes(aid) ? pinned.filter(x => x !== aid) : [...pinned, aid]
    if (next.length > 3) return toast('You can pin up to 3 badges. Unpin one first.', 'info', { silent: true })
    const err = await pin(next)
    if (err) toast(err)
  }

  return (
    <div className="achievements">
      <header className="card ach-head">
        <div>
          <h1>{mine ? 'Achievements' : <><FancyName name={other.name} />'s achievements</>}</h1>
          <p className="muted">
            {mine
              ? "Reach a goal to earn a badge for your profile, plus coins and a few styles you can't buy."
              : 'Badges they have earned. Everyone in the group can see these.'}
          </p>
        </div>
        <div className="ach-summary" aria-label="Progress">
          <strong>{done}<small> / {catalog.length}</small></strong>
          <span className="muted small">badges{mine ? <> · <Coin /> {coins.toLocaleString()} earned</> : ''}</span>
        </div>
      </header>

      <div className="ach-filters">
        {mine && (
          <div className="seg" role="tablist" aria-label="Show">
            {[['all', 'All'], ['earned', 'Earned'], ['todo', 'To earn']].map(([sid, label]) => (
              <button key={sid} type="button" role="tab" aria-selected={show === sid}
                className={'seg-btn' + (show === sid ? ' on' : '')} onClick={() => setShow(sid)}>{label}</button>
            ))}
          </div>
        )}
        <div className="seg" role="tablist" aria-label="Tier">
          {TIERS.map(([tid, label]) => (
            <button key={tid} type="button" role="tab" aria-selected={tier === tid}
              className={'seg-btn' + (tier === tid ? ' on' : '')} onClick={() => setTier(tid)}>{label}</button>
          ))}
        </div>
      </div>

      {!ready && <p className="muted">Loading…</p>}
      {ready && list.length === 0 && (
        <p className="muted">{mine ? 'Nothing here yet. Try another filter.' : 'No badges earned yet.'}</p>
      )}

      <div className="ach-grid">
        {list.map(a => {
          const row = earned.get(a.id)
          const value = Math.min(a.goal, stats[a.stat] ?? 0)
          const pct = Math.round((value / a.goal) * 100)
          return (
            <article key={a.id} className={'card ach-card tier-' + a.tier + (row ? ' earned' : '')}>
              <span className="ach-medal" aria-hidden="true">{badgeIcon(a.icon)}</span>
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
                  {a.reward_coins > 0 && <span className="reward-chip"><Coin /> {a.reward_coins}</span>}
                  {a.reward_item && <span className="reward-chip exclusive">✦ {itemName.get(a.reward_item) ?? 'Exclusive style'}</span>}
                </div>
              </div>
              {mine && row && (
                <div className="ach-actions">
                <ShareButton card="achievement" refId={a.id} preview={`${badgeIcon(a.icon)} Badge unlocked: ${a.name}`} className="secondary ach-share" title="Post this badge to the feed">📣 Share</ShareButton>
                <button type="button" className={'secondary ach-pin' + (row.pinned ? ' on' : '')}
                  onClick={() => togglePin(a.id)} aria-pressed={!!row.pinned}
                  title={row.pinned ? 'Shown first on your profile' : 'Show this first on your profile'}>
                  {row.pinned ? '📌 Pinned' : '📍 Pin'}
                </button>
                </div>
              )}
            </article>
          )
        })}
      </div>
      <p className="muted small">
        {mine ? <Link to="/profile">Back to your profile</Link> : <Link to={`/profile/${id}`}>Back to their profile</Link>}
      </p>
    </div>
  )
}
