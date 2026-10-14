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

// A pop-up with every assignment in one week, grouped by day, each with an Add button (and "Add all").
function AssignmentsDialog({ title, range, list, added, onAdd, onClose }) {
  const [where, setWhere] = useState('due')    // 'Add all' goes to: 'due' = each on its due date, 'plan' = the To plan list
  const days = []
  for (const a of list) {
    const k = dayKey(a)
    const last = days[days.length - 1]
    if (last && last.key === k) last.items.push(a)
    else days.push({ key: k, items: [a] })
  }
  const todo = list.filter(a => !added.has(a.uid))
  return (
    <PickerModal title={title} hint={range} onClose={onClose}>
      <div className="row between">
        <span className="muted small">{list.length} found · {list.length - todo.length} already on your To Do</span>
        <span className="canvas-addall">
          <select value={where} onChange={e => setWhere(e.target.value)} aria-label="Where Add all puts them">
            <option value="due">On their due dates</option>
            <option value="plan">To plan (unplanned)</option>
          </select>
          <button type="button" disabled={todo.length === 0} onClick={() => todo.forEach(a => onAdd(a, where))}>
            {todo.length === 0 ? 'All added' : `Add all (${todo.length})`}
          </button>
        </span>
      </div>
      <div className="canvas-days">
        {days.map(d => (
          <section key={d.key}>
            <h3>{new Date(d.key + 'T00:00:00').toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
            <ul className="list canvas-list">
              {d.items.map(a => (
                <li key={a.uid}>
                  <div className="canvas-info">
                    <strong>{a.title}</strong>
                    <small className="muted">{[a.course, a.allDay ? 'all day' : new Date(a.due).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })].filter(Boolean).join(' · ')}</small>
                  </div>
                  {added.has(a.uid)
                    ? <span className="owned small">✓ Added</span>
                    : (
                      <span className="canvas-add-btns">
                        <button type="button" className="secondary" onClick={() => onAdd(a, 'due')} title="Put it on the day it is due">On due date</button>
                        <button type="button" className="secondary" onClick={() => onAdd(a, 'plan')} title="Put it in the To plan list to schedule later">To plan</button>
                      </span>
                    )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PickerModal>
  )
}

// Canvas / Brightspace assignments, shown as a short summary for this week and next week ("Found 4 assignments" and
// an Open button). Nothing reaches the To Do list until someone presses Add.
export default function CanvasCard({ tasks = [], onAdd }) {
  const canvas = useCanvas()
  const [connect, setConnect] = useState(false)
  const [openWeek, setOpenWeek] = useState(null)           // 0 = this week, 1 = next week, null = closed
  const [menu, setMenu] = useState(false)                  // the small ... menu (refresh, change link, disconnect)
  const added = useMemo(() => new Set(tasks.map(t => t.canvas_uid).filter(Boolean)), [tasks])

  const weeks = [0, 1].map(offset => {
    const start = startOfWeek(addDays(new Date(), offset * 7))
    const from = isoDate(start)
    const to = isoDate(addDays(start, 6))
    const list = canvas.assignments
      .filter(a => { const k = dayKey(a); return k >= from && k <= to })
      .sort((a, b) => dayKey(a).localeCompare(dayKey(b)) || String(a.title).localeCompare(String(b.title)))
    return { offset, label: offset === 0 ? 'This week' : 'Next week', range: `${fmtDay(start)} – ${fmtDay(addDays(start, 6))}`, list }
  })

  function add(a, where = 'due') {
    const key = dayKey(a)
    // 'due': planned on the day it is due. 'plan': goes to the To plan list (no day), still remembering its due date.
    onAdd?.(a.title, where === 'plan' ? null : key, 'blue', {
      course: a.course, category: 'Homework', due_date: key,
      due_time: a.allDay ? null : new Date(a.due).toTimeString().slice(0, 5),
      notes: a.url ? `From Canvas: ${a.url}` : 'From Canvas', canvas_uid: a.uid,
    })
  }

  const open = openWeek === null ? null : weeks[openWeek]

  return (
    <section className="card canvas-card">
      <div className="row between canvas-head">
        <h2>{canvas.connected ? `${canvas.providerName} assignments` : 'Assignments'}</h2>
        {canvas.connected && (
          <div className="canvas-menu">
            <button type="button" className="secondary canvas-menu-btn" aria-label="More options" aria-expanded={menu}
              onClick={() => setMenu(m => !m)}>⋯</button>
            {menu && (
              <div className="canvas-menu-pop" role="menu" onMouseLeave={() => setMenu(false)}>
                <button type="button" role="menuitem" disabled={canvas.loading} onClick={() => { setMenu(false); canvas.refresh() }}>{canvas.loading ? 'Refreshing…' : 'Refresh'}</button>
                <button type="button" role="menuitem" onClick={() => { setMenu(false); setConnect(true) }}>Change link</button>
                <button type="button" role="menuitem" onClick={() => { setMenu(false); if (confirm(`Disconnect ${canvas.providerName}?`)) canvas.disconnect() }}>Disconnect</button>
              </div>
            )}
          </div>
        )}
      </div>

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
          <div className="found-list">
            {weeks.map(w => {
              const waiting = w.list.filter(a => !added.has(a.uid)).length
              return (
                <div key={w.offset} className={'found-row' + (w.list.length === 0 ? ' empty' : '')}>
                  <span className="found-count" aria-hidden="true">{w.list.length}</span>
                  <div className="found-text">
                    <strong>
                      {w.list.length === 0
                        ? 'Nothing due'
                        : `Found ${w.list.length} assignment${w.list.length === 1 ? '' : 's'}`}
                    </strong>
                    <small className="muted" title={w.range}>
                      {w.label}
                      {w.list.length > 0 && (waiting === 0 ? ' · all added' : ` · ${waiting} to add`)}
                    </small>
                  </div>
                  {w.list.length > 0 && <button type="button" className="found-open" onClick={() => setOpenWeek(w.offset)}>Open</button>}
                </div>
              )
            })}
          </div>
          {canvas.error && <p className="warn">{canvas.error}</p>}
        </>
      )}

      {open && (
        <AssignmentsDialog title={`${open.label}: assignments`} range={open.range} list={open.list} added={added}
          onAdd={add} onClose={() => setOpenWeek(null)} />
      )}
      {connect && <ConnectDialog canvas={canvas} onClose={() => setConnect(false)} />}
    </section>
  )
}
