import { useId } from 'react'
import { useStreak, streakCoins } from '../lib/streak.js'
import { useToast } from '../lib/toast.jsx'

// A flame (an SVG graphic) with the day count on top. The more days in a row, the bigger, brighter and hotter the
// glow, from a cold grey ember at 0 to a blazing white-hot flame at 30+.
function Flame({ days }) {
  const id = useId().replace(/:/g, '')
  const heat = Math.max(0, Math.min(1, days / 30))                 // 0..1
  const lit = days > 0
  const glow = lit ? 6 + heat * 26 : 0                             // px of glow
  const style = {
    '--glow': `${glow}px`,
    '--glow-alpha': lit ? (0.35 + heat * 0.6).toFixed(2) : 0,
    '--heat': heat,
  }
  return (
    <div className={'flame' + (lit ? ' lit' : '') + (days >= 14 ? ' hot' : '')} style={style}
      role="img" aria-label={days === 1 ? '1 day streak' : `${days} day streak`}>
      <svg viewBox="0 0 100 130" aria-hidden="true">
        <defs>
          <linearGradient id={`o${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={lit ? '#ff5a00' : '#6b7280'} />
            <stop offset=".55" stopColor={lit ? '#ff9a1f' : '#8b93a1'} />
            <stop offset="1" stopColor={lit ? '#ffd23f' : '#a8afbb'} />
          </linearGradient>
          <linearGradient id={`i${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={lit ? '#ffb02e' : '#9aa1ad'} />
            <stop offset="1" stopColor={lit ? '#fff3b0' : '#c3c8d1'} />
          </linearGradient>
        </defs>
        <path fill={`url(#o${id})`}
          d="M50 4c4 20 26 30 30 58 3 20-6 40-30 62C26 102 17 82 20 62c2-14 10-20 16-30 2 10 6 14 10 14C44 30 44 16 50 4z" />
        <path fill={`url(#i${id})`}
          d="M50 58c3 12 16 20 17 36 1 12-7 22-17 28-10-6-18-16-17-28 1-12 8-14 12-24 2 6 4 8 5 8-1-6-1-14 0-20z" />
      </svg>
      <span className="flame-num">{days}</span>
    </div>
  )
}

export default function StreakCard() {
  const { status, error, busy, claim } = useStreak()
  const toast = useToast()
  const s = status
  const streak = s?.streak ?? 0
  const week = s?.week ?? []
  const left = Math.max(0, 10 - (s?.today_minutes ?? 0))
  const canClaim = s?.today_done && !s?.claimed_today
  const nextCoins = streakCoins(s?.today_done ? streak : streak + 1)

  async function doClaim() {
    const r = await claim()
    if (r) toast(`🔥 ${r.streak}-day streak! +${r.amount} coins${r.milestone ? ' (milestone bonus!)' : ''}`, 'level')
  }

  return (
    <section className="card streak-card">
      <div className="streak-top">
        <Flame days={streak} />
        <div className="streak-text">
          <h2>{streak === 0 ? 'Start a streak' : `${streak}-day streak`}</h2>
          <p className="muted small">
            {s === null ? 'Loading…'
              : s.claimed_today ? 'Today is counted. Come back tomorrow to keep it going.'
              : s.today_done ? `You did it today! Claim +${streakCoins(streak)} coins.`
              : `Focus ${left} more minute${left === 1 ? '' : 's'} today to ${streak > 0 ? 'keep it going' : 'start one'} (+${nextCoins} coins).`}
          </p>
          {s && s.best > 0 && <small className="muted">Best streak: {s.best} day{s.best === 1 ? '' : 's'}</small>}
        </div>
      </div>

      <div className="streak-week" aria-label="Last 7 days">
        {week.map((d, i) => (
          <span key={d.day} className={'streak-dot' + (d.done ? ' done' : '') + (i === week.length - 1 ? ' today' : '')}
            title={`${d.day}: ${d.mins} min`} />
        ))}
      </div>

      <button type="button" className="streak-claim" disabled={!canClaim || busy} onClick={doClaim}>
        {s?.claimed_today ? '✓ Claimed today' : busy ? 'Claiming…' : canClaim ? `Claim +${streakCoins(streak)} coins` : '10 focus minutes to unlock'}
      </button>
      {error && <p className="warn small">{error}</p>}
      <details className="streak-how">
        <summary>How the streak works</summary>
        <p className="small muted">
          A day counts when you focus for at least 10 minutes. Each day in a row pays 3 coins more, up to 30 coins a day
          from day 10, with extra bonuses at 14 days (+75) and 30 days (+250). Miss one day in a week and your streak
          survives; miss two and it starts over.
        </p>
      </details>
    </section>
  )
}
