import { addDays, DAY_NAMES, fmtMinutes } from '../lib/dates.js'

// Seven labelled bars (Mon..Sun) showing study minutes per day, with the amount above each bar.
export default function DayBars({ minutes, start, highlight = -1 }) {
  const max = Math.max(...minutes, 60)
  return (
    <div className="daybars">
      {minutes.map((m, i) => (
        <div key={i} className={'daybar' + (i === highlight ? ' today' : '')}>
          <span className="daybar-value">{m ? fmtMinutes(m) : '–'}</span>
          <div className="daybar-track">
            <div className="daybar-fill" style={{ height: `${(m / max) * 100}%` }} />
          </div>
          <span className="daybar-day">{DAY_NAMES[i]}</span>
          <small className="daybar-date">{addDays(start, i).getDate()}</small>
        </div>
      ))}
    </div>
  )
}
