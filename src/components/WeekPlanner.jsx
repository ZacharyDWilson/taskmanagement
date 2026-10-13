import { useState } from 'react'
import { addDays, DAY_NAMES, fmtDay, isoDate, startOfWeek } from '../lib/dates.js'
import { classesFrom } from '../lib/tasks.js'
import ColorPicker from './ColorPicker.jsx'
import ClassPicker from './ClassPicker.jsx'
import { TaskItem } from './TodayList.jsx'

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
      <div className="planner-head">
        <h2>
          Week planner{' '}
          <small>{fmtDay(start)} – {fmtDay(addDays(start, 6))} · {weekDone}/{weekTasks.length} done</small>
        </h2>
        <div className="row">
          <button className="secondary" onClick={() => setOffset(o => Math.max(-4, o - 1))} aria-label="Previous week">‹</button>
          <button className="secondary" onClick={() => setOffset(0)}>This week</button>
          <button className="secondary" onClick={() => setOffset(o => Math.min(12, o + 1))} aria-label="Next week">›</button>
        </div>
      </div>

      <div className="planner-tools">
        <span className="muted small">New tasks:</span>
        <ColorPicker value={color} onChange={setColor} />
        <ClassPicker compact value={course} onChange={setCourse} options={classesFrom(tasks)}
          placeholder="Class or subject (optional)" />
      </div>

      <div className="week">
        {columns.map(c => (
          <Column key={c.title} {...c} tasks={tasks} add={add} toggle={toggle} remove={remove}
            move={move} onOpen={onOpen} color={color} course={course} />
        ))}
      </div>
    </section>
  )
}
