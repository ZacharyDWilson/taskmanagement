import { isoDate } from '../lib/dates.js'
import { colorHex } from '../lib/colors.js'

const fmtDue = task => {
  const d = new Date(task.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return task.due_time ? `${d}, ${task.due_time.slice(0, 5)}` : d
}

// One task row, used in the To Do lists. Click the title for details; drag it to plan it onto a day.
// `label` is an optional extra tag (used for Sat/Sun inside the combined Weekend column).
export function TaskItem({ task, onToggle, onRemove, onOpen, draggable = false, label }) {
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
        {(label || task.course || task.category || task.due_date) && (
          <span className="task-tags">
            {label && <span className="tag day-tag">{label}</span>}
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
