import { useState } from 'react'
import { classesFrom } from '../lib/tasks.js'
import ColorPicker from './ColorPicker.jsx'
import ClassPicker from './ClassPicker.jsx'
import { TaskItem } from './TodayList.jsx'

// The "To plan" list: tasks with no day yet. Drag them onto a day in the week planner.
// Dropping a scheduled task back here unschedules it.
export default function Inbox({ tasks, add, toggle, remove, move, onOpen }) {
  const [title, setTitle] = useState('')
  const [course, setCourse] = useState('')
  const [color, setColor] = useState('blue')
  const [over, setOver] = useState(false)

  const items = tasks.filter(t => !t.day)

  function submit(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    add(t, null, color, { course: course.trim() })
    setTitle('')
  }

  function drop(e) {
    e.preventDefault()
    setOver(false)
    const task = tasks.find(t => t.id === e.dataTransfer.getData('text/task-id'))
    if (task && task.day) move(task, null)
  }

  return (
    <section
      className={'card fill' + (over ? ' over' : '')}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }}
      onDrop={drop}
    >
      <h2>To plan</h2>
      <form onSubmit={submit} className="stack">
        <div className="row">
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
            placeholder="Add something you need to do…" />
          <button type="submit">Add</button>
        </div>
        <ClassPicker value={course} onChange={setCourse} options={classesFrom(tasks)} />
        <ColorPicker value={color} onChange={setColor} />
      </form>
      <p className="muted small">Drag tasks onto a day →. Click one for details.</p>
      {items.length === 0 && <p className="muted">Everything is planned. Nice!</p>}
      <ul className="tasks scroll">
        {items.map(t => (
          <TaskItem key={t.id} task={t} onToggle={toggle} onRemove={remove} onOpen={onOpen} draggable />
        ))}
      </ul>
    </section>
  )
}
