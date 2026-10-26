import Coin from './Coin.jsx'
import { xpForLevel } from '../lib/levels.js'

// "How XP and coins work": one place that says what earns what, with the daily limits, and where you stand now.
// It lives at the top of the Shop. The numbers match the database (supabase/003_levels, 008, 035, 037, 039, 041).

const XP = [
  { icon: '⏱️', big: '1 XP', what: 'every minute you focus', note: 'On the Study page, Pomodoro or count up.' },
  { icon: '✅', big: '10 XP', what: 'every task you finish', note: 'The first 10 tasks each day.' },
  { icon: '🎉', big: '+5 XP', what: 'per task on a fully finished day', note: 'Plan 3 or more tasks ahead and finish them all.' },
  { icon: '📣', big: '25 XP', what: 'every post you share', note: 'The first 3 posts each day.' },
  { icon: '👍', big: '2 XP', what: 'when a friend reacts to your post', note: 'No limit.' },
]

const COINS = [
  { icon: 'coin', big: '1 per 5 XP', what: 'every bit of XP turns into coins', note: 'Automatic. 60 focus minutes is 12 coins.' },
  { icon: '⭐', big: '25 × level', what: 'a bonus each time you level up', note: 'Reaching level 5 pays 125 coins.' },
  { icon: '🔥', big: '3 per day', what: 'streak bonus, when you press Claim', note: 'Study 10+ minutes. Grows to 30 a day, plus 75 at 14 days and 250 at 30.' },
  { icon: '🏆', big: '150 / 100 / 50', what: 'weekly leaderboard prizes', note: 'Top 3 each week. It resets on Sunday.' },
  { icon: '✨', big: 'Double', what: 'coins on your next focus session', note: 'After you post. Once a day.' },
  { icon: '🏅', big: 'Varies', what: 'achievements pay coins', note: 'See the Achievements page.' },
]

const LEVELS = [2, 5, 10, 15, 20]

export default function XpCoinGuide({ xp, level, balance }) {
  const open = true
  const next = xpForLevel(level + 1)
  const base = xpForLevel(level)
  const pct = xp == null ? 0 : Math.round(Math.min(1, Math.max(0, (xp - base) / Math.max(1, next - base))) * 100)

  return (
    <section className="card xcg" aria-label="How XP and coins work">
      <div className="xcg-head">
        <div>
          <h2>How XP and coins work</h2>
          <p className="muted small">Do things in LOCK IN, earn XP, and it turns into levels and coins. Spend the coins in the Shop.</p>
        </div>
      </div>

      {open && (
        <>
          <ol className="xcg-flow" aria-label="The steps">
            <li><b>1</b><span>Study, finish tasks, post</span></li>
            <li className="arrow" aria-hidden="true">→</li>
            <li><b>2</b><span>You earn <strong>XP</strong></span></li>
            <li className="arrow" aria-hidden="true">→</li>
            <li><b>3</b><span>XP gives <strong>levels</strong> and <strong>coins</strong></span></li>
            <li className="arrow" aria-hidden="true">→</li>
            <li><b>4</b><span>Spend coins in the <strong>Shop</strong></span></li>
          </ol>

          <div className="xcg-you">
            <div><small>Your level</small><strong>{level}</strong></div>
            <div className="xcg-bar"><span>{xp == null ? '…' : `${(xp - base).toLocaleString()} / ${(next - base).toLocaleString()} XP to level ${level + 1}`}</span><i style={{ width: pct + '%' }} /></div>
            <div><small>Coins</small><strong><Coin /> {balance.toLocaleString()}</strong></div>
          </div>

          <div className="xcg-cols">
            <div>
              <h3>Earn XP</h3>
              <ul className="xcg-list">
                {XP.map(r => (
                  <li key={r.what}>
                    <span className="xcg-ico" aria-hidden="true">{r.icon}</span>
                    <span className="xcg-big">{r.big}</span>
                    <span className="xcg-txt"><b>{r.what}</b><small>{r.note}</small></span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Earn coins</h3>
              <ul className="xcg-list">
                {COINS.map(r => (
                  <li key={r.what}>
                    <span className="xcg-ico" aria-hidden="true">{r.icon === 'coin' ? <Coin size="1.3em" /> : r.icon}</span>
                    <span className="xcg-big">{r.big}</span>
                    <span className="xcg-txt"><b>{r.what}</b><small>{r.note}</small></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="xcg-foot">
            <p><strong>Levels need more XP as you go:</strong> {LEVELS.map(n => `level ${n} at ${xpForLevel(n).toLocaleString()} XP`).join(', ')}.</p>
            <p><strong>Spending coins never lowers your level.</strong> Your XP stays, and it keeps counting.</p>
          </div>
        </>
      )}
    </section>
  )
}
