import { mmss } from '../lib/pomodoro.jsx'

// Draws the timer in whichever style you picked. All styles read the same three things:
// how much time is left, how long the round is, and whether it is a focus or break round.
export default function TimerFace({ styleId, left, total, mode, running, small = false }) {
  const done = total > 0 ? Math.min(1, Math.max(0, 1 - left / total)) : 0   // 0 → 1 as the round goes
  const remaining = 1 - done
  const text = mmss(left)
  const cls = 'timer-face ' + styleId + (small ? ' small' : '') + (running ? ' running' : '') + (mode === 'break' ? ' break' : '')
  const label = `${text} left`

  if (styleId === 'bar') {
    return (
      <div className={cls} role="timer" aria-label={label}>
        <div className="tf-time">{text}</div>
        <div className="tf-bar"><div style={{ width: `${done * 100}%` }} /></div>
        <div className="tf-pct">{Math.round(done * 100)}%</div>
      </div>
    )
  }

  if (styleId === 'digital') {
    return (
      <div className={cls} role="timer" aria-label={label}>
        <div className="tf-lcd">
          <span className="tf-ghost" aria-hidden="true">88:88</span>
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
          <circle cx="110" cy="110" r={R} className="tf-arc" strokeDasharray={C} strokeDashoffset={C * done}
            transform="rotate(-90 110 110)" />
        </svg>
        <div className="tf-center">{text}</div>
      </div>
    )
  }

  if (styleId === 'analog') {
    // A "time timer": the coloured wedge is the time left, sweeping away clockwise from 12 o'clock.
    const cx = 110, cy = 110, r = 88
    const ang = remaining * 2 * Math.PI
    const x = cx + r * Math.sin(ang), y = cy - r * Math.cos(ang)
    const big = remaining > .5 ? 1 : 0
    const wedge = remaining >= .999
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - .01} ${cy - r} Z`
      : remaining <= .001 ? '' : `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${big} 1 ${x} ${y} Z`
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
    const [m1, m2, , s1, s2] = text
    const Card = ({ d }) => <span key={d} className="tf-card"><span className="tf-digit">{d}</span></span>
    return (
      <div className={cls} role="timer" aria-label={label}>
        <Card d={m1} /><Card d={m2} /><span className="tf-colon">:</span><Card d={s1} /><Card d={s2} />
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

  // plain: the default
  return <div className={cls + ' clock big'} role="timer" aria-label={label}>{text}</div>
}
