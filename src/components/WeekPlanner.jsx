import { useState } from 'react'
import { addDays, DAY_NAMES, fmtDay, isoDate, startOfWeek } from '../lib/dates.js'
import { classesFrom } from '../lib/tasks.js'
import { colorHex } from '../lib/colors.js'
import ColorPicker from './ColorPicker.jsx'
import ClassPicker from './ClassPicker.jsx'
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
  const byDay = {}
  for (const t of tasks) if (t.day) (byDay[t.day] ??= []).push(t)
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
        const open = list.filter(t => !t.done).length
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
              {list.slice(0, 3).map(t => (
                <li key={t.id} className={'mg-task' + (t.done ? ' done' : '')} style={{ borderLeftColor: colorHex(t.color) }}
                  draggable title={t.title}
                  onClick={e => { e.stopPropagation(); onOpenTask(t) }}
                  onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('text/task-id', t.id); e.dataTransfer.effectAllowed = 'move' }}>
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
            {list.length > 3 && <small className="mg-more">+{list.length - 3} more</small>}
            {list.length > 0 && <i className="mg-count" aria-label={open + ' open'}>{open || '✓'}</i>}
          </div>
        )
      })}
    </div>
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

// The planner: Day, Week or Month, with a filter to show one class or subject at a time.
export default function WeekPlanner({ tasks, add, toggle, remove, move, onOpen }) {
  const [mode, setMode] = useState('week')                 // 'day' | 'week' | 'month'
  const [anchor, setAnchor] = useState(() => new Date())    // the day / week / month being looked at
  const [filter, setFilter] = useState(ALL)                 // class filter
  const [color, setColor] = useState('purple')
  const [course, setCourse] = useState('')

  const classes = classesFrom(tasks)
  const hasUnclassed = tasks.some(t => !t.course)
  const visible = tasks.filter(t => (filter === ALL ? true : filter === NONE ? !t.course : t.course === filter))
  const newCourse = course || (filter !== ALL && filter !== NONE ? filter : '')

  const start = startOfWeek(anchor)
  const columns = [
    ...[0, 1, 2, 3, 4].map(i => ({ title: DAY_NAMES[i], dates: [addDays(start, i)] })),
    { title: 'Weekend', dates: [addDays(start, 5), addDays(start, 6)] },
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

      {(classes.length > 0 || hasUnclassed) && (
        <div className="planner-filter" role="group" aria-label="Filter by class or subject">
          <span className="muted small">Show:</span>
          <button type="button" className={'chip' + (filter === ALL ? ' on' : '')} onClick={() => setFilter(ALL)}>All classes</button>
          {classes.map(c => (
            <button key={c} type="button" className={'chip' + (filter === c ? ' on' : '')}
              onClick={() => setFilter(f => (f === c ? ALL : c))}>{c}</button>
          ))}
          {hasUnclassed && classes.length > 0 && (
            <button type="button" className={'chip' + (filter === NONE ? ' on' : '')}
              onClick={() => setFilter(f => (f === NONE ? ALL : NONE))}>No class</button>
          )}
        </div>
      )}

      {mode !== 'month' && (
      <div className="planner-tools">
        <span className="muted small">New tasks:</span>
        <ColorPicker value={color} onChange={setColor} />
        <ClassPicker compact value={course} onChange={setCourse} options={classes}
          placeholder={filter !== ALL && filter !== NONE ? 'Class: ' + filter : 'Class or subject (optional)'} />
      </div>
      )}

      {mode !== 'month' && <DragTray columns={columns} tasks={tasks} move={move} />}

      {mode === 'week' && (
        <div className="week">
          {columns.map(c => (
            <Column key={c.title} {...c} tasks={visible} add={add} toggle={toggle} remove={remove}
              move={move} onOpen={onOpen} color={color} course={newCourse} />
          ))}
        </div>
      )}

      {mode === 'day' && (
        <div className="week day-view">
          <Column title={anchor.toLocaleDateString(undefined, { weekday: 'long' })} dates={[anchor]} tasks={visible}
            add={add} toggle={toggle} remove={remove} move={move} onOpen={onOpen} color={color} course={newCourse} />
        </div>
      )}

      {mode === 'month' && (
        <MonthGrid tasks={visible} anchor={anchor} move={move} onOpenTask={onOpen}
          onOpenDay={d => { setAnchor(d); setMode('day') }} />
      )}
    </section>
  )
}
