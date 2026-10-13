import { useState } from 'react'
import { addDays, DAY_NAMES, fmtDay, isoDate, startOfWeek } from '../lib/dates.js'
import ColorPicker from './ColorPicker.jsx'
import { TaskItem } from './TodayList.jsx'

function DayColumn({ date, tasks, add, toggle, remove, move, onOpen, color }) {
  const [title, setTitle] = useState('')
  const [over, setOver] = useState(false)
  const key = isoDate(date)
  const isToday = key === isoDate(new Date())
  const items = tasks.filter(t => t.day === key)
  const done = items.filter(t => t.done).length

  function submit(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    add(t, key, color)
    setTitle('')
  }

  function drop(e) {
    e.preventDefault()
    setOver(false)
    const task = tasks.find(t => t.id === e.dataTransfer.getData('text/task-id'))
    if (task && task.day !== key) move(task, key)
  }

  return (
    <div
      className={'day' + (isToday ? ' today' : '') + (over ? ' over' : '')}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }}
      onDrop={drop}
    >
      <h3>
        {DAY_NAMES[(date.getDay() + 6) % 7]} <small>{fmtDay(date)}</small>
        {items.length > 0 && <small className="count">{done}/{items.length}</small>}
      </h3>
      <ul className="tasks scroll">
        {items.map(t => (
          <TaskItem key={t.id} task={t} onToggle={toggle} onRemove={remove} onOpen={onOpen} draggable />
        ))}
      </ul>
      <form onSubmit={submit}>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="+ add" />
      </form>
    </div>
  )
}

export default function WeekPlanner({ tasks, add, toggle, remove, move, onOpen }) {
  const [offset, setOffset] = useState(0)
  const [color, setColor] = useState('purple')
  const start = addDays(startOfWeek(), offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  const keys = new Set(days.map(isoDate))
  const weekTasks = tasks.filter(t => keys.has(t.day))
  const weekDone = weekTasks.filter(t => t.done).length

  return (
    <section className="card fill planner">
      <div className="row between">
        <h2>
          Week planner{' '}
          <small className="muted">{fmtDay(days[0])} – {fmtDay(days[6])} · {weekDone}/{weekTasks.length} done</small>
        </h2>
        <div className="row">
          <span className="muted small">New task color:</span>
          <ColorPicker value={color} onChange={setColor} />
          <button className="secondary" onClick={() => setOffset(o => Math.max(-4, o - 1))} aria-label="Previous week">‹</button>
          <button className="secondary" onClick={() => setOffset(0)}>This week</button>
          <button className="secondary" onClick={() => setOffset(o => Math.min(12, o + 1))} aria-label="Next week">›</button>
        </div>
      </div>
      <div className="week">
        {days.map(d => (
          <DayColumn key={isoDate(d)} date={d} tasks={tasks} add={add} toggle={toggle} remove={remove}
            move={move} onOpen={onOpen} color={color} />
        ))}
      </div>
    </section>
  )
}
