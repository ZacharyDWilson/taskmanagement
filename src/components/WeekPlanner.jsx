import { useState } from 'react'
import { usePhone } from '../lib/phone.js'
import { createPortal } from 'react-dom'
import { addDays, DAY_NAMES, fmtDay, isoDate, startOfWeek } from '../lib/dates.js'
import { classesFrom } from '../lib/tasks.js'
import { colorHex } from '../lib/colors.js'
import { TaskItem } from './TodayList.jsx'
import DragTray from './DragTray.jsx'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ALL = '__all__'      // class filter: every class
const NONE = '__none__'    // class filter: tasks with no class set

// A real month: every day is a drop target, shows its tasks, and opens as a day when you tap it.
function MonthGrid({ tasks, anchor, onOpenDay, onOpenTask, move }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const weeks = []
  for (let w = startOfWeek(first); w <= last; w = addDays(w, 7)) weeks.push(w)
  const todayKey = isoDate(new Date())
  const byDay = {}, dueBy = {}, workBy = {}
  for (const t of tasks) {
    if (t.day) (byDay[t.day] ??= []).push(t)
    if (t.due_date && !t.done) (dueBy[t.due_date] ??= []).push(t)               // the day it is due
    for (const k of t.plan_days ?? []) if (k !== t.day && !t.done) (workBy[k] ??= []).push(t)   // extra days to work on it
  }
  const [over, setOver] = useState('')

  function drop(e, key) {
    e.preventDefault()
    setOver('')
    const task = tasks.find(t => t.id === e.dataTransfer.getData('text/task-id'))
    if (task && task.day !== key) move(task, key)
  }

  return (
    <div className="month-grid" role="grid" aria-label={MONTHS[anchor.getMonth()] + ' ' + anchor.getFullYear()}>
      {DAY_NAMES.map(d => <div key={d} className="mg-dow" role="columnheader">{d}</div>)}
      {weeks.flatMap(w => Array.from({ length: 7 }, (_, i) => addDays(w, i))).map(d => {
        const key = isoDate(d)
        const list = byDay[key] ?? []
        const due = dueBy[key] ?? []
        const work = workBy[key] ?? []
        const open = list.filter(t => !t.done).length + due.length + work.length
        const shownRows = 4
        const extraRows = list.length + due.length + work.length - shownRows
        return (
          <div key={key} role="gridcell" tabIndex={0}
            className={'mg-cell' + (d.getMonth() !== anchor.getMonth() ? ' out' : '') + (key === todayKey ? ' today' : '') + (over === key ? ' over' : '')}
            onClick={() => onOpenDay(d)}
            onKeyDown={e => { if (e.key === 'Enter') onOpenDay(d) }}
            onDragOver={e => { e.preventDefault(); if (over !== key) setOver(key) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(o => (o === key ? '' : o)) }}
            onDrop={e => drop(e, key)}>
            <span className="mg-num">{d.getDate()}</span>
            <ul className="mg-tasks">
              {[
                ...due.map(t => ({ t, kind: 'due' })),
                ...list.map(t => ({ t, kind: 'plan' })),
                ...work.map(t => ({ t, kind: 'work' })),
              ].slice(0, shownRows).map(({ t, kind }) => (
                <li key={kind + t.id} className={'mg-task mg-' + kind + (t.done ? ' done' : '')}
                  style={kind === 'plan' ? { borderLeftColor: colorHex(t.color) } : undefined}
                  draggable={kind === 'plan'} title={(kind === 'due' ? 'Due: ' : kind === 'work' ? 'Work on: ' : '') + t.title}
                  onClick={e => { e.stopPropagation(); onOpenTask(t) }}
                  onDragStart={kind === 'plan' ? e => { e.stopPropagation(); e.dataTransfer.setData('text/task-id', t.id); e.dataTransfer.effectAllowed = 'move' } : undefined}>
                  {kind === 'due' && <b>Due</b>}{kind === 'work' && <b>Work</b>}
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
            {extraRows > 0 && <small className="mg-more">+{extraRows} more</small>}
            {(list.length > 0 || due.length > 0 || work.length > 0) && <i className="mg-count" aria-label={open + ' open'}>{open || '✓'}</i>}
          </div>
        )
      })}
    </div>
  )
}

// A small month for the bottom corner. Each day shows how many things are on it (red when something is due); tap a day to see it.
function MiniMonth({ tasks, onOpenDay }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const first = month
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const weeks = []
  for (let w = startOfWeek(first); w <= last; w = addDays(w, 7)) weeks.push(w)
  const todayKey = isoDate(new Date())
  const counts = {}
  for (const t of tasks) {
    if (t.done) continue
    if (t.due_date) { const c = (counts[t.due_date] ??= { due: 0, plan: 0 }); c.due++ }
    if (t.day && t.day !== t.due_date) { const c = (counts[t.day] ??= { due: 0, plan: 0 }); c.plan++ }
  }
  return (
    <div className="mini-month" aria-label="Month overview">
      <div className="mini-head">
        <button type="button" className="link" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
        <strong>{MONTHS[month.getMonth()].slice(0, 3)} {month.getFullYear()}</strong>
        <button type="button" className="link" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Next month">›</button>
      </div>
      <div className="mini-grid">
        {DAY_NAMES.map(d => <span key={d} className="mini-dow">{d[0]}</span>)}
        {weeks.flatMap(w => Array.from({ length: 7 }, (_, i) => addDays(w, i))).map(d => {
          const key = isoDate(d)
          const c = counts[key]
          const total = c ? c.due + c.plan : 0
          return (
            <button key={key} type="button"
              className={'mini-day' + (d.getMonth() !== month.getMonth() ? ' out' : '') + (key === todayKey ? ' today' : '') + (c?.due ? ' has-due' : total ? ' has-plan' : '')}
              onClick={() => onOpenDay(d)}
              title={total ? [c.due && c.due + ' due', c.plan && c.plan + ' planned'].filter(Boolean).join(', ') : 'Nothing yet'}>
              <span>{d.getDate()}</span>
              {total > 0 && <i>{total}</i>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// What is due soon, next to the small month.
function Upcoming({ tasks, onOpen }) {
  const todayKey = isoDate(new Date())
  const soon = tasks.filter(t => t.due_date && !t.done && t.due_date >= todayKey).sort((a, b) => a.due_date.localeCompare(b.due_date) || String(a.due_time ?? '').localeCompare(String(b.due_time ?? ''))).slice(0, 6)
  return (
    <div className="upcoming">
      <h3>Coming up</h3>
      {soon.length === 0 ? <p className="muted small">Nothing due soon. Set a due date on a task and it shows up here.</p> : (
        <ul>
          {soon.map(t => (
            <li key={t.id}>
              <button type="button" className="link" onClick={() => onOpen(t)}>
                <b>{new Date(t.due_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</b>
                <span>{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// One column of the planner: a single weekday, or Saturday + Sunday together as "Weekend".
function Column({ title, dates, tasks, toggle, remove, move, onOpen, onExpand, full }) {
  const [over, setOver] = useState(false)
  const keys = dates.map(isoDate)
  const isWeekend = dates.length > 1
  const items = tasks.filter(t => keys.includes(t.day))
  const dueItems = tasks.filter(t => t.due_date && keys.includes(t.due_date) && !t.done)
  const workItems = tasks.filter(t => !t.done && !keys.includes(t.day) && (t.plan_days ?? []).some(k => keys.includes(k)))
  const done = items.filter(t => t.done).length

  const dayLabel = t => (isWeekend ? (new Date(t.day + 'T00:00:00').getDay() === 6 ? 'Sat' : 'Sun') : undefined)

  function drop(e) {
    e.preventDefault()
    setOver(false)
    const task = tasks.find(t => t.id === e.dataTransfer.getData('text/task-id'))
    if (task && !keys.includes(task.day)) move(task, keys[0])
  }

  return (
    <div
      className={'day' + (keys.includes(isoDate(new Date())) ? ' today' : '') + (over ? ' over' : '')}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }}
      onDrop={drop}
    >
      <h3 className={onExpand ? 'day-head tappable' : 'day-head'} onClick={onExpand}
        role={onExpand ? 'button' : undefined} tabIndex={onExpand ? 0 : undefined}
        onKeyDown={onExpand ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand() } } : undefined}>
        {title}{' '}
        <small>{isWeekend ? `${fmtDay(dates[0])} – ${fmtDay(dates[1])}` : fmtDay(dates[0])}</small>
        {items.length > 0 && <small className="count">{done}/{items.length} done</small>}
      </h3>
      <ul className="tasks scroll">
        {items.length === 0 && dueItems.length === 0 && workItems.length === 0 && <li className="muted small">Drop a task here</li>}
        {dueItems.map(t => (
          <li key={'due' + t.id} className="day-extra due"><button type="button" className="link" onClick={() => onOpen(t)} title="Open this task"><b>Due</b> {t.title}{t.due_time ? ' · ' + t.due_time.slice(0, 5) : ''}</button></li>
        ))}
        {workItems.map(t => (
          <li key={'work' + t.id} className="day-extra work"><button type="button" className="link" onClick={() => onOpen(t)} title="Open this task"><b>Work</b> {t.title}</button></li>
        ))}
        {items.map(t => (
          <TaskItem key={t.id} task={t} onToggle={toggle} onRemove={remove} onOpen={onOpen}
            draggable label={dayLabel(t)} />
        ))}
      </ul>
    </div>
  )
}

// The planner: Day, Week or Month, with a filter to show one class or subject at a time.
export default function WeekPlanner({ tasks, toggle, remove, move, onOpen }) {
  const [mode, setMode] = useState('week')                 // 'day' | 'week' | 'month'
  const [popup, setPopup] = useState(null)                // a day opened as a pop-up (from either calendar)
  const [anchor, setAnchor] = useState(() => new Date())    // the day / week / month being looked at
  const [filter, setFilter] = useState(ALL)                 // class filter
  const phone = usePhone()
  const [big, setBig] = useState(null)                      // a day opened full screen (phones)

  const classes = classesFrom(tasks)
  const hasUnclassed = tasks.some(t => !t.course)
  const visible = tasks.filter(t => (filter === ALL ? true : filter === NONE ? !t.course : t.course === filter))

  const start = startOfWeek(anchor)
  const columns = [
    ...[0, 1, 2, 3, 4, 5, 6].map(i => ({ title: DAY_NAMES[i], dates: [addDays(start, i)] })),
  ]
  const weekKeys = new Set(columns.flatMap(c => c.dates.map(isoDate)))
  const weekTasks = visible.filter(t => weekKeys.has(t.day))
  const dayTasks = visible.filter(t => t.day === isoDate(anchor))
  const monthTasks = visible.filter(t => t.day && t.day.slice(0, 7) === isoDate(anchor).slice(0, 7))
  const shown = mode === 'day' ? dayTasks : mode === 'week' ? weekTasks : monthTasks
  const done = shown.filter(t => t.done).length

  const step = dir => setAnchor(a => (
    mode === 'day' ? addDays(a, dir)
      : mode === 'week' ? addDays(a, dir * 7)
        : new Date(a.getFullYear(), a.getMonth() + dir, 1)))
  const label = mode === 'day'
    ? anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    : mode === 'week'
      ? `${fmtDay(start)} – ${fmtDay(addDays(start, 6))}`
      : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`

  return (
    <section className="card fill planner">
      <div className="planner-head">
        <h2>
          Planner{' '}
          <small>{label} · {done}/{shown.length} done</small>
        </h2>
        <div className="planner-controls">
          <div className="seg" role="tablist" aria-label="Planner view">
            {['day', 'week', 'month'].map(m => (
              <button key={m} type="button" role="tab" aria-selected={mode === m}
                className={'seg-btn' + (mode === m ? ' on' : '')} onClick={() => setMode(m)}>
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="secondary" onClick={() => step(-1)} aria-label={'Previous ' + mode}>‹</button>
            <button className="secondary" onClick={() => setAnchor(new Date())}>Today</button>
            <button className="secondary" onClick={() => step(1)} aria-label={'Next ' + mode}>›</button>
          </div>
        </div>
      </div>

      <div className="planner-bar">
        {(classes.length > 0 || hasUnclassed) && (
          <label className="planner-select">
            <span>Class</span>
            <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Show tasks for one class or subject">
              <option value={ALL}>All classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
              {hasUnclassed && classes.length > 0 && <option value={NONE}>No class</option>}
            </select>
          </label>
        )}
      </div>

      <div className="cal-legend" aria-label="What the calendar marks mean">
        <span className="lg plan"><i /> Planned (drag to move)</span>
        <span className="lg due"><i /> Due date</span>
        <span className="lg work"><i /> Work day</span>
      </div>

      {mode !== 'month' && <DragTray columns={columns} tasks={tasks} move={move} />}

      {mode === 'week' && (
        <div className="week">
          {columns.map(c => (
            <Column key={c.title} {...c} tasks={visible} toggle={toggle} remove={remove}
              move={move} onOpen={onOpen} onExpand={phone ? () => setBig(c.title) : undefined} />
          ))}
        </div>
      )}

      {mode === 'day' && (
        <div className="week day-view">
          <Column title={anchor.toLocaleDateString(undefined, { weekday: 'long' })} dates={[anchor]} tasks={visible}
            toggle={toggle} remove={remove} move={move} onOpen={onOpen} />
        </div>
      )}

      {mode !== 'month' && (
        <div className="planner-foot">
          <MiniMonth tasks={visible} onOpenDay={d => setPopup(d)} />
          <Upcoming tasks={visible} onOpen={onOpen} />
        </div>
      )}

      {mode === 'month' && (
        <MonthGrid tasks={visible} anchor={anchor} move={move} onOpenTask={onOpen}
          onOpenDay={d => setPopup(d)} />
      )}
      {popup && createPortal(
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setPopup(null) }}>
          <div className="modal day-pop" role="dialog" aria-modal="true" aria-label="Day view">
            <div className="row between">
              <span className="row">
                <button type="button" className="secondary" onClick={() => setPopup(d => addDays(d, -1))} aria-label="Previous day">‹</button>
                <button type="button" className="secondary" onClick={() => setPopup(d => addDays(d, 1))} aria-label="Next day">›</button>
              </span>
              <h2>{popup.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              <button type="button" className="link" onClick={() => setPopup(null)} aria-label="Close">×</button>
            </div>
            <Column title={popup.toLocaleDateString(undefined, { weekday: 'long' })} dates={[popup]} tasks={visible}
              toggle={toggle} remove={remove} move={move} onOpen={t => { setPopup(null); onOpen(t) }} full />
          </div>
        </div>,
        document.body,
      )}
      {big && (() => {
        const c = columns.find(x => x.title === big)
        if (!c) return null
        return createPortal(
          <div className="day-full" role="dialog" aria-modal="true" aria-label={c.title}>
            <div className="day-full-bar">
              <button type="button" className="secondary" onClick={() => setBig(null)}>← Back</button>
              <span>{label}</span>
            </div>
            <Column {...c} tasks={visible} toggle={toggle} remove={remove} move={move}
              onOpen={t => { setBig(null); onOpen(t) }} full />
          </div>,
          document.body,
        )
      })()}
    </section>
  )
}
