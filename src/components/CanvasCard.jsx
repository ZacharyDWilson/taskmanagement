import { useMemo, useState } from 'react'
import { useCanvas, PROVIDERS } from '../lib/canvas.js'
import { addDays, fmtDay, isoDate, startOfWeek } from '../lib/dates.js'
import PickerModal from './PickerModal.jsx'

const fmtDue = a => {
  const d = new Date(a.allDay ? a.due + 'T00:00:00' : a.due)
  const date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return a.allDay ? date : `${date}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}
const dayKey = a => (a.allDay ? a.due : isoDate(new Date(a.due)))

const STEPS_BY = {
  brightspace: [
    ['Open Brightspace', 'Go to your school\'s Brightspace in a web browser and log in. Use a browser, not the phone app.'],
    ['Open the Calendar', 'Click "Calendar" in the top bar (or on your home page).'],
    ['Turn on the feed', 'Click the settings gear in the calendar, then "Enable Calendar Feeds" if it is off. Some schools hide this: if you cannot find it, ask your school\'s IT help.'],
    ['Copy the link', 'Click "Subscribe" and copy the link it shows. It usually has .ics in it.'],
    ['Paste it here', 'Paste the link into the box below and press Connect.'],
  ],
  other: [
    ['Find your calendar\'s subscribe link', 'Most school calendars (Brightspace, Blackboard, Moodle, Google) can give you a private "iCal" or ".ics" subscription link. Look for Subscribe, Export or Calendar Feed.'],
    ['Copy the link', 'It starts with https:// or webcal://.'],
    ['Paste it here', 'Paste the link into the box below and press Connect.'],
  ],
}
const STEPS = [
  ['Open Canvas', 'Go to your school\'s Canvas in a web browser and log in (for Gordon that is gordon.instructure.com). Use a browser, not the phone app.'],
  ['Click "Calendar"', 'It is in the menu down the left side.'],
  ['Find "Calendar Feed"', 'Look at the right-hand side, near the bottom of the calendar page, and click "Calendar Feed".'],
  ['Copy the link', 'A box appears with a long link that ends in .ics. Select it and copy it.'],
  ['Paste it here', 'Paste the link into the box below and press Connect.'],
]

function ConnectDialog({ canvas, onClose }) {
  const [which, setWhich] = useState(canvas.provider || 'canvas')
  const [url, setUrl] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    const problem = await canvas.save(url, which)
    setBusy(false)
    if (problem) setMsg(problem)
    else onClose()
  }
  return (
    <PickerModal title="Connect your school calendar" onClose={onClose}
      hint="Your assignments will show up here so you can add them to your week with one click.">
      <div className="seg" role="tablist" aria-label="Where are your classes?">
        {Object.entries(PROVIDERS).map(([id, p]) => (
          <button key={id} type="button" role="tab" aria-selected={which === id}
            className={'seg-btn' + (which === id ? ' on' : '')} onClick={() => { setWhich(id); setMsg('') }}>{p.name}</button>
        ))}
      </div>
      <ol className="canvas-steps">
        {(which === 'canvas' ? STEPS : STEPS_BY[which]).map(([title, text], i) => (
          <li key={title}><span className="num">{i + 1}</span><div><strong>{title}</strong><p className="muted small">{text}</p></div></li>
        ))}
      </ol>
      <form className="stack" onSubmit={submit}>
        <input value={url} onChange={e => { setUrl(e.target.value); setMsg('') }} placeholder={which === 'canvas' ? 'https://…/feeds/calendars/user_….ics' : 'https://…/feed.ics?token=…  or  webcal://…'}
          autoComplete="off" spellCheck="false" required />
        <div className="row">
          <button type="submit" disabled={busy}>{busy ? 'Connecting…' : 'Connect'}</button>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
        </div>
        {msg && <p className="warn">{msg}</p>}
      </form>
      <p className="muted small">
        🔒 This link is private: only you can see it, and LOCK IN only ever reads your due dates. It can't change or
        submit anything. If you ever want to stop, press Disconnect and, in your school's calendar, a new link replaces the old one.
      </p>
    </PickerModal>
  )
}

// Canvas assignments due in one week (this week or next), each with an "Add" button. Nothing from Canvas reaches the
// To Do list until someone presses Add.
export default function CanvasCard({ tasks = [], onAdd }) {
  const canvas = useCanvas()
  const [connect, setConnect] = useState(false)
  const added = useMemo(() => new Set(tasks.map(t => t.canvas_uid).filter(Boolean)), [tasks])
  const [weekOffset, setWeekOffset] = useState(0)          // 0 = this week, 1 = next week
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7))
  const from = isoDate(weekStart)
  const to = isoDate(addDays(weekStart, 6))
  const upcoming = canvas.assignments
    .filter(a => { const k = dayKey(a); return k >= from && k <= to })
    .sort((a, b) => dayKey(a).localeCompare(dayKey(b)) || String(a.title).localeCompare(String(b.title)))

  function add(a) {
    const key = dayKey(a)
    onAdd?.(a.title, key, 'blue', {                       // planned on the day it is due
      course: a.course, category: 'Homework', due_date: key,
      due_time: a.allDay ? null : new Date(a.due).toTimeString().slice(0, 5),
      notes: a.url ? `From Canvas: ${a.url}` : 'From Canvas', canvas_uid: a.uid,
    })
  }

  return (
    <section className="card fill canvas-card">
      <h2>{canvas.connected ? `${canvas.providerName} assignments` : 'Assignments'}</h2>

      {canvas.connected === null && <p className="muted">Checking…</p>}

      {canvas.connected === false && (
        <div className="stack">
          <p className="muted">Connect your Canvas or Brightspace calendar so due dates show up here and can be added to your week in one click.</p>
          <button type="button" onClick={() => setConnect(true)}>Connect a calendar</button>
          {canvas.error && <p className="warn">{canvas.error}</p>}
        </div>
      )}

      {canvas.connected && (
        <>
          <div className="canvas-week" role="tablist" aria-label="Which week">
            {[['This week', 0], ['Next week', 1]].map(([label, n]) => (
              <button key={n} type="button" role="tab" aria-selected={weekOffset === n}
                className={'seg-btn' + (weekOffset === n ? ' on' : '')} onClick={() => setWeekOffset(n)}>{label}</button>
            ))}
            <small className="muted">{fmtDay(weekStart)} – {fmtDay(addDays(weekStart, 6))}</small>
          </div>
          {upcoming.length === 0 && (
            <p className="muted">Nothing due {weekOffset === 0 ? 'this week' : 'next week'} in Canvas. Nice.</p>
          )}
          <ul className="list scroll canvas-list">
            {upcoming.map(a => {
              const isAdded = added.has(a.uid)
              return (
                <li key={a.uid}>
                  <div className="canvas-info">
                    <strong>{a.title}</strong>
                    <small className="muted">{[a.course, fmtDue(a)].filter(Boolean).join(' · ')}</small>
                  </div>
                  {isAdded
                    ? <span className="owned small">✓ Added</span>
                    : <button type="button" className="secondary" onClick={() => add(a)}>Add</button>}
                </li>
              )
            })}
          </ul>
          <div className="row between">
            <button type="button" className="link" onClick={canvas.refresh} disabled={canvas.loading}>{canvas.loading ? 'Refreshing…' : 'Refresh'}</button>
            <span>
              <button type="button" className="link" onClick={() => setConnect(true)}>Change link</button>
              <button type="button" className="link" onClick={() => { if (confirm(`Disconnect ${canvas.providerName}?`)) canvas.disconnect() }}>Disconnect</button>
            </span>
          </div>
          {canvas.error && <p className="warn">{canvas.error}</p>}
        </>
      )}

      {connect && <ConnectDialog canvas={canvas} onClose={() => setConnect(false)} />}
    </section>
  )
}
