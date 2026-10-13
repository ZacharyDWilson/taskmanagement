import { useState } from 'react'
import { addDays, DAY_NAMES, fmtDay, isoDate, startOfWeek } from '../lib/dates.js'
import { classesFrom } from '../lib/tasks.js'
import ColorPicker from './ColorPicker.jsx'
import ClassPicker from './ClassPicker.jsx'
import { TaskItem } from './TodayList.jsx'
import PickerModal from './PickerModal.jsx'
import DragTray from './DragTray.jsx'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// A month at a glance. Tap any week to open it in the planner.
function MonthPicker({ tasks, shownStart, onPick, onClose }) {
  const [month, setMonth] = useState(() => new Date(shownStart.getFullYear(), shownStart.getMonth(), 1))
  const first = startOfWeek(month)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const weeks = []
  for (let s = first; s <= lastDay; s = addDays(s, 7)) weeks.push(s)

  const perDay = {}
  for (const task of tasks) if (task.day) perDay[task.day] = (perDay[task.day] ?? 0) + 1
  const todayKey = isoDate(new Date())
  const shownKey = isoDate(shownStart)

  return (
    <PickerModal title="Pick a week" hint="Tap a week to plan it. Dots show how many tasks are on a day." onClose={onClose}>
      <div className="month">
        <div className="month-head">
          <button type="button" className="secondary" aria-label="Previous month"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
          <strong>{MONTHS[month.getMonth()]} {month.getFullYear()}</strong>
          <button type="button" className="secondary" aria-label="Next month"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
        </div>
        <div className="month-days" aria-hidden="true">{DAY_NAMES.map(d => <span key={d}>{d}</span>)}</div>
        {weeks.map(ws => {
          const key = isoDate(ws)
          return (
            <button key={key} type="button" className={'month-week' + (key === shownKey ? ' on' : '')}
              onClick={() => onPick(ws)} aria-label={'Week of ' + fmtDay(ws)}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(ws, i)
                const k = isoDate(d)
                const n = perDay[k] ?? 0
                return (
                  <span key={k} className={'month-day' + (d.getMonth() !== month.getMonth() ? ' out' : '') + (k === todayKey ? ' today' : '')}>
                    {d.getDate()}
                    <i className={n ? 'dot' : ''} title={n ? n + ' task' + (n === 1 ? '' : 's') : ''}>{n > 1 ? n : ''}</i>
                  </span>
                )
              })}
            </button>
          )
        })}
        <div className="row">
          <button type="button" className="secondary" onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) }}>This month</button>
        </div>
      </div>
    </PickerModal>
  )
}

// One column of the planner: a single weekday, or Saturday + Sunday together as "Weekend".
function Column({ title, dates, tasks, add, toggle, remove, move, onOpen, color, course }) {
  const [text, setText] = useState('')
  const [over, setOver] = useState(false)
  const keys = dates.map(isoDate)
  const isWeekend = dates.length > 1
  const items = tasks.filter(t => keys.includes(t.day))
  const done = items.filter(t => t.done).length

  const dayLabel = t => (isWeekend ? (new Date(t.day + 'T00:00:00').getDay() === 6 ? 'Sat' : 'Sun') : undefined)

  function submit(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    add(t, keys[0], color, { course: course.trim() }) // weekend quick-adds go to Saturday; change it in the details
    setText('')
  }

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
      <h3>
        {title}{' '}
        <small>{isWeekend ? `${fmtDay(dates[0])} – ${fmtDay(dates[1])}` : fmtDay(dates[0])}</small>
        {items.length > 0 && <small className="count">{done}/{items.length} done</small>}
      </h3>
      <ul className="tasks scroll">
        {items.length === 0 && <li className="muted small">Drop a task here</li>}
        {items.map(t => (
          <TaskItem key={t.id} task={t} onToggle={toggle} onRemove={remove} onOpen={onOpen}
            draggable label={dayLabel(t)} />
        ))}
      </ul>
      <form onSubmit={submit}>
        <input value={text} onChange={e => setText(e.target.value)} maxLength={120} placeholder={`+ Add to ${title}`} />
      </form>
    </div>
  )
}

export default function WeekPlanner({ tasks, add, toggle, remove, move, onOpen }) {
  const [offset, setOffset] = useState(0)
  const [monthOpen, setMonthOpen] = useState(false)
  const [color, setColor] = useState('purple')
  const [course, setCourse] = useState('')
  const start = addDays(startOfWeek(), offset * 7)

  const columns = [
    ...[0, 1, 2, 3, 4].map(i => ({ title: DAY_NAMES[i], dates: [addDays(start, i)] })),
    { title: 'Weekend', dates: [addDays(start, 5), addDays(start, 6)] },
  ]
  const keys = new Set(columns.flatMap(c => c.dates.map(isoDate)))
  const weekTasks = tasks.filter(t => keys.has(t.day))
  const weekDone = weekTasks.filter(t => t.done).length

  return (
    <section className="card fill planner">
      {monthOpen && (
        <MonthPicker tasks={tasks} shownStart={start}
          onPick={ws => { setOffset(Math.round((ws - startOfWeek()) / WEEK_MS)); setMonthOpen(false) }}
          onClose={() => setMonthOpen(false)} />
      )}
      <div className="planner-head">
        <h2>
          Week planner{' '}
          <small>{fmtDay(start)} – {fmtDay(addDays(start, 6))} · {weekDone}/{weekTasks.length} done</small>
        </h2>
        <div className="row">
          <button className="secondary" onClick={() => setOffset(o => Math.max(-52, o - 1))} aria-label="Previous week">‹</button>
          <button className="secondary" onClick={() => setOffset(0)}>This week</button>
          <button className="secondary" onClick={() => setMonthOpen(true)}>Month</button>
          <button className="secondary" onClick={() => setOffset(o => Math.min(104, o + 1))} aria-label="Next week">›</button>
        </div>
      </div>

      <div className="planner-tools">
        <span className="muted small">New tasks:</span>
        <ColorPicker value={color} onChange={setColor} />
        <ClassPicker compact value={course} onChange={setCourse} options={classesFrom(tasks)}
          placeholder="Class or subject (optional)" />
      </div>

      <DragTray columns={columns} tasks={tasks} move={move} />

      <div className="week">
        {columns.map(c => (
          <Column key={c.title} {...c} tasks={tasks} add={add} toggle={toggle} remove={remove}
            move={move} onOpen={onOpen} color={color} course={course} />
        ))}
      </div>
    </section>
  )
}
