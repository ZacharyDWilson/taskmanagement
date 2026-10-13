import { useState } from 'react'
import { isoDate } from '../lib/dates.js'
import { colorHex } from '../lib/colors.js'
import ColorPicker from './ColorPicker.jsx'

const fmtDue = task => {
  const d = new Date(task.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return task.due_time ? `${d}, ${task.due_time.slice(0, 5)}` : d
}

// One task row. Click the title for details; drag it to plan it onto a day (To Do page).
export function TaskItem({ task, onToggle, onRemove, onOpen, draggable = false }) {
  const overdue = task.due_date && !task.done && task.due_date < isoDate(new Date())
  return (
    <li
      className={'task' + (task.done ? ' done' : '') + (draggable ? ' draggable' : '')}
      style={{ borderLeftColor: colorHex(task.color) }}
      draggable={draggable}
      onDragStart={e => {
        e.dataTransfer.setData('text/task-id', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <input type="checkbox" checked={task.done} onChange={() => onToggle(task)} aria-label="Done" />
      <button type="button" className="task-main" onClick={() => onOpen?.(task)}>
        <span className="task-title">{task.title}</span>
        {(task.course || task.category || task.due_date) && (
          <span className="task-tags">
            {task.course && <span className="tag">{task.course}</span>}
            {task.category && <span className="tag alt">{task.category}</span>}
            {task.due_date && <span className={'tag due' + (overdue ? ' late' : '')}>Due {fmtDue(task)}</span>}
          </span>
        )}
      </button>
      <button className="link" aria-label="Delete task" onClick={() => onRemove(task)}>×</button>
    </li>
  )
}

// Tasks scheduled for today (used on the Overview page).
export default function TodayList({ tasks, add, toggle, remove, onOpen }) {
  const today = isoDate(new Date())
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('blue')
  const items = tasks.filter(t => t.day === today)

  function submit(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    add(t, today, color)
    setTitle('')
  }

  return (
    <section className="card fill">
      <h2>Today</h2>
      <form onSubmit={submit} className="stack">
        <div className="row">
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
            placeholder="What do you need to get done today?" />
          <button type="submit">Add</button>
        </div>
        <ColorPicker value={color} onChange={setColor} />
      </form>
      {items.length === 0 && <p className="muted">Nothing planned yet. Add your first task for today.</p>}
      <ul className="tasks scroll">
        {items.map(t => <TaskItem key={t.id} task={t} onToggle={toggle} onRemove={remove} onOpen={onOpen} />)}
      </ul>
    </section>
  )
}
