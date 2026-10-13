import { Link } from 'react-router-dom'
import { isoDate } from '../lib/dates.js'
import { colorHex } from '../lib/colors.js'

const fmtTime = t =>
  new Date(`1970-01-01T${t}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// Read-only summary of what's on for today: tasks planned for today plus anything due today.
// Adding, editing and checking things off all happen on the To Do page.
export default function DueToday({ tasks }) {
  const today = isoDate(new Date())
  const items = tasks
    .filter(t => t.day === today || t.due_date === today)
    .sort((a, b) =>
      Number(a.done) - Number(b.done) ||
      String(a.due_time ?? '99').localeCompare(String(b.due_time ?? '99')) ||
      String(a.created_at).localeCompare(String(b.created_at)))

  const left = items.filter(t => !t.done).length
  const heading = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <section className="card fill">
      <h2>Due today <small>{heading}</small></h2>

      {items.length > 0 && (
        <p className="muted small due-summary">
          {left === 0 ? 'All done for today. Nice work!' : `${left} left`}
          {' · '}{items.length - left} done
        </p>
      )}
      {items.length === 0 && <p className="muted">Nothing due today.</p>}

      <ul className="due-list scroll">
        {items.map(t => (
          <li key={t.id} className={'due-item' + (t.done ? ' done' : '')}>
            <span className="due-dot" style={{ background: colorHex(t.color) }} aria-hidden="true" />
            <div className="due-body">
              <span className="due-title">{t.title}</span>
              <span className="task-tags">
                {t.course && <span className="tag">{t.course}</span>}
                {t.category && <span className="tag alt">{t.category}</span>}
                {t.due_date === today
                  ? <span className="tag due">Due {t.due_time ? fmtTime(t.due_time) : 'today'}</span>
                  : <span className="tag due">Planned for today</span>}
              </span>
            </div>
            <span className="due-status">{t.done ? '✓ Done' : ''}</span>
          </li>
        ))}
      </ul>

      <Link className="due-link" to="/todo">Plan or change tasks on the To Do page →</Link>
    </section>
  )
}
