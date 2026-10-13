import { hms, mmss } from '../lib/pomodoro.jsx'

const HOUR = 3600000

// Draws the timer in whichever style you picked, for both timers:
//   Pomodoro: pass `left` and `total`; the picture empties (or fills) as the round goes.
//   Count up: pass `countUp` and `elapsedMs`; there is no end, so the picture runs once round per hour
//   while the digits show the whole day's total.
// Every style reads the same three things: how far along (0 to 1), the text, and whether it is a break.
export default function TimerFace({ styleId, left = 0, total = 0, mode = 'focus', running = false, small = false, countUp = false, elapsedMs = 0 }) {
  const done = countUp
    ? ((elapsedMs % HOUR) / HOUR)
    : (total > 0 ? Math.min(1, Math.max(0, 1 - left / total)) : 0)           // 0 → 1 as the round (or the hour) goes
  const remaining = 1 - done
  // Pomodoro pictures drain as time passes. In count-up they build up instead, because nothing is running out.
  const level = countUp ? done : remaining
  const text = countUp ? hms(elapsedMs) : mmss(left)
  const cls = 'timer-face ' + styleId + (small ? ' small' : '') + (running ? ' running' : '') + (mode === 'break' ? ' break' : '') + (countUp ? ' countup-face' : '')
  const label = countUp ? `${text} counted today` : `${text} left`

  if (styleId === 'bar') {
    return (
      <div className={cls} role="timer" aria-label={label}>
        <div className="tf-time">{text}</div>
        <div className="tf-bar"><div style={{ width: `${done * 100}%` }} /></div>
        <div className="tf-pct">{countUp ? 'this hour' : `${Math.round(done * 100)}%`}</div>
      </div>
    )
  }

  if (styleId === 'digital') {
    return (
      <div className={cls} role="timer" aria-label={label}>
        <div className="tf-lcd">
          <span className="tf-ghost" aria-hidden="true">{countUp ? '8:88:88' : '88:88'}</span>
          <span className="tf-lit">{text}</span>
        </div>
      </div>
    )
  }

  if (styleId === 'ring') {
    const R = 92, C = 2 * Math.PI * R
    return (
      <div className={cls} role="timer" aria-label={label}>
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle cx="110" cy="110" r={R} className="tf-track" />
          <circle cx="110" cy="110" r={R} className="tf-arc" strokeDasharray={C} strokeDashoffset={countUp ? C * (1 - done) : C * done}
            transform="rotate(-90 110 110)" />
        </svg>
        <div className="tf-center">{text}</div>
      </div>
    )
  }

  if (styleId === 'analog') {
    // A "time timer": the coloured wedge is the time left (or, counting up, the part of the hour that has passed).
    const cx = 110, cy = 110, r = 88
    const frac = countUp ? done : remaining
    const ang = frac * 2 * Math.PI
    const x = cx + r * Math.sin(ang), y = cy - r * Math.cos(ang)
    const big = frac > .5 ? 1 : 0
    const wedge = frac >= .999
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - .01} ${cy - r} Z`
      : frac <= .001 ? '' : `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${big} 1 ${x} ${y} Z`
    const ticks = Array.from({ length: 60 }, (_, i) => {
      const a = (i / 60) * 2 * Math.PI, long = i % 5 === 0
      const r1 = r + 8, r2 = r + (long ? 17 : 12)
      return <line key={i} x1={cx + r1 * Math.sin(a)} y1={cy - r1 * Math.cos(a)} x2={cx + r2 * Math.sin(a)} y2={cy - r2 * Math.cos(a)}
        className={long ? 'tf-tick long' : 'tf-tick'} />
    })
    const hx = cx + (r - 6) * Math.sin(ang), hy = cy - (r - 6) * Math.cos(ang)
    return (
      <div className={cls} role="timer" aria-label={label}>
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle cx={cx} cy={cy} r={r + 20} className="tf-face" />
          {ticks}
          <circle cx={cx} cy={cy} r={r} className="tf-dial" />
          {wedge && <path d={wedge} className="tf-wedge" />}
          <line x1={cx} y1={cy} x2={hx} y2={hy} className="tf-hand" />
          <circle cx={cx} cy={cy} r="5" className="tf-pin" />
        </svg>
        <div className="tf-under">{text}</div>
      </div>
    )
  }

  if (styleId === 'flip') {
    const Card = ({ d }) => <span className="tf-card"><span className="tf-digit">{d}</span></span>
    return (
      <div className={cls} role="timer" aria-label={label}>
        {[...text].map((ch, i) => (ch === ':' ? <span key={i} className="tf-colon">:</span> : <Card key={i + ch} d={ch} />))}
      </div>
    )
  }

  if (styleId === 'hourglass') {
    // top bulb empties, bottom bulb fills, a thin stream falls while it runs
    const top = remaining, bottom = done
    return (
      <div className={cls} role="timer" aria-label={label}>
        <svg viewBox="0 0 160 220" aria-hidden="true">
          <defs>
            <clipPath id="tf-top"><path d="M30 18 H130 C130 70 96 92 80 110 C64 92 30 70 30 18 Z" /></clipPath>
            <clipPath id="tf-bot"><path d="M80 110 C96 128 130 150 130 202 H30 C30 150 64 128 80 110 Z" /></clipPath>
          </defs>
          <rect x="22" y="8" width="116" height="10" rx="5" className="tf-cap" />
          <rect x="22" y="202" width="116" height="10" rx="5" className="tf-cap" />
          <g clipPath="url(#tf-top)"><rect x="20" y={18 + 92 * (1 - top)} width="120" height="100" className="tf-sand" /></g>
          <g clipPath="url(#tf-bot)"><rect x="20" y={202 - 92 * bottom} width="120" height="100" className="tf-sand" /></g>
          {running && remaining > 0 && <rect x="79" y="108" width="2" height={Math.max(0, 202 - 92 * bottom - 108)} className="tf-stream" />}
          <path d="M30 18 H130 C130 70 96 92 80 110 C96 128 130 150 130 202 H30 C30 150 64 128 80 110 C64 92 30 70 30 18 Z" className="tf-glass" />
        </svg>
        <div className="tf-under">{text}</div>
      </div>
    )
  }

  if (styleId === 'garden') {
    const stage = mode === 'break' ? '🍵'
      : done >= 1 ? '🌸' : done > .75 ? '🌳' : done > .5 ? '🪴' : done > .25 ? '🌿' : done > 0 ? '🌱' : '🌰'
    return (
      <div className={cls} role="timer" aria-label={label}>
        <div className="tf-plant" key={stage}>{stage}</div>
        <div className="tf-soil" aria-hidden="true" />
        <div className="tf-under">{text}</div>
      </div>
    )
  }

  // ---- the Desk Set and the Tech Set ------------------------------------------------------------------------------

  if (styleId === 'neon') {
    const R = 86, C = 2 * Math.PI * R
    return (
      <div className={cls} role="timer" aria-label={label}>
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle cx="110" cy="110" r={R + 12} className="tf-neon-outer" />
          <circle cx="110" cy="110" r={R} className="tf-neon-track" />
          <circle cx="110" cy="110" r={R} className="tf-neon-arc" strokeDasharray={C}
            strokeDashoffset={countUp ? C * (1 - done) : C * done} transform="rotate(-90 110 110)" />
        </svg>
        <div className="tf-center tf-neon-text">{text}</div>
      </div>
    )
  }

  if (styleId === 'candle') {
    // wax burns down as the round goes (or over the hour, counting up); the flame flickers while it runs
    const wax = 30 + 110 * remaining
    return (
      <div className={cls} role="timer" aria-label={label}>
        <svg viewBox="0 0 160 220" aria-hidden="true">
          <ellipse cx="80" cy="204" rx="52" ry="9" className="tf-candle-dish" />
          <rect x="52" y={200 - wax} width="56" height={wax} rx="6" className="tf-wax" />
          <rect x="52" y={200 - wax} width="56" height="9" rx="4" className="tf-wax-top" />
          <rect x="78.5" y={200 - wax - 14} width="3" height="14" rx="1.5" className="tf-wick" />
          <g className="tf-flame" transform={`translate(80 ${200 - wax - 16})`}>
            <path d="M0 -34 C14 -16 12 -2 0 4 C-12 -2 -14 -16 0 -34 Z" className="tf-flame-out" />
            <path d="M0 -20 C7 -10 6 -2 0 2 C-6 -2 -7 -10 0 -20 Z" className="tf-flame-in" />
          </g>
        </svg>
        <div className="tf-under">{text}</div>
      </div>
    )
  }

  if (styleId === 'rocket') {
    const pos = done * 100
    return (
      <div className={cls} role="timer" aria-label={label}>
        <div className="tf-time">{text}</div>
        <div className="tf-track-rocket" aria-hidden="true">
          <span className="tf-trail" style={{ width: `${pos}%` }} />
          <span className="tf-rocket" style={{ left: `${pos}%` }}>🚀</span>
          <span className="tf-goal">{countUp ? '⭐' : '🌙'}</span>
        </div>
        <div className="tf-pct">{countUp ? 'this hour' : `${Math.round(done * 100)}% of the way`}</div>
      </div>
    )
  }

  if (styleId === 'battery') {
    // drains while you count down; charges up while you count up
    const pct = Math.round(level * 100)
    const tone = countUp ? 'good' : level > .5 ? 'good' : level > .2 ? 'mid' : 'low'
    return (
      <div className={cls + ' tone-' + tone} role="timer" aria-label={label}>
        <div className="tf-batt" aria-hidden="true">
          <div className="tf-batt-body"><div className="tf-batt-fill" style={{ width: `${pct}%` }} /></div>
          <div className="tf-batt-cap" />
        </div>
        <div className="tf-time">{text}</div>
        <div className="tf-pct">{pct}%</div>
      </div>
    )
  }

  if (styleId === 'sunrise') {
    // the sun climbs over the horizon as the round goes
    const a = Math.PI * (1 - done)
    const cx = 110, cy = 130, r = 84
    const sx = cx + r * Math.cos(a), sy = cy - r * Math.sin(a)
    return (
      <div className={cls} role="timer" aria-label={label}>
        <svg viewBox="0 0 220 150" aria-hidden="true">
          <defs>
            <linearGradient id="tf-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="tf-sky-top" />
              <stop offset="1" className="tf-sky-bot" />
            </linearGradient>
            <clipPath id="tf-sky-clip"><rect x="6" y="6" width="208" height="124" rx="16" /></clipPath>
          </defs>
          <g clipPath="url(#tf-sky-clip)">
            <rect x="6" y="6" width="208" height="124" fill="url(#tf-sky)" />
            <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} className="tf-sun-path" />
            <circle cx={sx} cy={sy} r="15" className="tf-sun" />
            <rect x="6" y={cy} width="208" height="26" className="tf-ground" />
          </g>
        </svg>
        <div className="tf-under">{text}</div>
      </div>
    )
  }

  if (styleId === 'vinyl') {
    const arm = -28 + done * 34      // the needle moves in over the record as it plays
    return (
      <div className={cls} role="timer" aria-label={label}>
        <div className="tf-vinyl-wrap" aria-hidden="true">
          <div className="tf-record"><span className="tf-record-label" /></div>
          <div className="tf-arm" style={{ transform: `rotate(${arm}deg)` }} />
        </div>
        <div className="tf-under">{text}</div>
      </div>
    )
  }

  // plain: the default
  return <div className={cls + ' clock big'} role="timer" aria-label={label}>{text}</div>
}
