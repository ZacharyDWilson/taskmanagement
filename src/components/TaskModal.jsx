import { useEffect, useState } from 'react'
import { CATEGORIES } from '../lib/tasks.js'
import ColorPicker from './ColorPicker.jsx'
import { addDays, DAY_NAMES, isoDate, startOfWeek } from '../lib/dates.js'

const CAT_ICON = { Homework: '📝', Exam: '🎯', Project: '🛠️', Reading: '📖', Study: '🧠', Work: '💼', Personal: '🌱', Other: '✨' }
const CAT_COLOR = { Homework: '#3b82f6', Exam: '#ef4444', Project: '#a855f7', Reading: '#14b8a6', Study: '#f59e0b', Work: '#64748b', Personal: '#22c55e', Other: '#ec4899' }
const todayKey = isoDate(new Date())
// "Tuesday, Oct 13" (or "Today" / "Tomorrow") for the summary beside the day picker
function plannedText(day) {
  if (!day) return 'Not planned yet'
  const d = new Date(day + 'T00:00:00')
  const diff = Math.round((d - new Date(todayKey + 'T00:00:00')) / 86400000)
  const nice = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  return diff === 0 ? 'Today · ' + nice : diff === 1 ? 'Tomorrow · ' + nice : nice
}

// Detail pop-up: what it's for, when it's due, the requirements, and any extra info.
export default function TaskModal({ task, courses, onSave, onDelete, onClose }) {
  const [d, setD] = useState({
    title: task.title,
    course: task.course ?? '',
    category: task.category ?? '',
    day: task.day ?? '',
    due_date: task.due_date ?? '',
    due_time: task.due_time ? task.due_time.slice(0, 5) : '',
    criteria: task.criteria ?? '',
    notes: task.notes ?? '',
    color: task.color,
    done: task.done,
  })
  const set = patch => setD(prev => ({ ...prev, ...patch }))

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function save(e) {
    e.preventDefault()
    onSave({
      title: d.title.trim() || task.title,
      course: d.course.trim(),
      category: d.category,
      day: d.day || null,
      due_date: d.due_date || null,
      due_time: d.due_date && d.due_time ? d.due_time : null,
      criteria: d.criteria,
      notes: d.notes,
      color: d.color,
      done: d.done,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal" role="dialog" aria-modal="true" aria-label="Task details" onSubmit={save}>
        <div className="row between">
          <h2>Task details</h2>
          <button type="button" className="link" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label>Task
          <input value={d.title} maxLength={120} onChange={e => set({ title: e.target.value })} required />
        </label>

        {/* Tap to plan it, no dragging needed (works on phones). Radios, so the chosen day is always unmistakable. */}
        <fieldset className="pick-set">
          <legend>
            Plan it for
            <strong className={'pick-summary' + (d.day ? ' set' : '')}>{plannedText(d.day)}</strong>
          </legend>
          <div className="pick-days" role="radiogroup">
            <label className={'pick not' + (!d.day ? ' on' : '')}>
              <input type="radio" name="plan-day" checked={!d.day} onChange={() => set({ day: '' })} />
              <span><b>Not</b><i>planned</i></span>
            </label>
            {DAY_NAMES.map((name, i) => {
              const date = addDays(startOfWeek(), i)
              const key = isoDate(date)
              return (
                <label key={key} className={'pick' + (d.day === key ? ' on' : '') + (key === todayKey ? ' today' : '')}>
                  <input type="radio" name="plan-day" checked={d.day === key} onChange={() => set({ day: key })} />
                  <span><b>{name}</b><i>{date.getDate()}</i></span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="form-grid">
          <label>Class / subject
            <input value={d.course} maxLength={60} list="modal-courses" placeholder="e.g. Biology 101"
              onChange={e => set({ course: e.target.value })} />
            <datalist id="modal-courses">{courses.map(c => <option key={c} value={c} />)}</datalist>
          </label>
          <label>Planned for
            <input type="date" value={d.day} onChange={e => set({ day: e.target.value })} />
          </label>
          <label>Due date
            <input type="date" value={d.due_date} onChange={e => set({ due_date: e.target.value })} />
          </label>
          <label>Due time
            <input type="time" value={d.due_time} disabled={!d.due_date}
              onChange={e => set({ due_time: e.target.value })} />
          </label>
        </div>

        <fieldset className="pick-set">
          <legend>
            Category
            <strong className={'pick-summary' + (d.category ? ' set' : '')}>{d.category || 'None chosen'}</strong>
          </legend>
          <div className="pick-cats">
            {CATEGORIES.map(c => (
              <label key={c} className={'pick cat' + (d.category === c ? ' on' : '')} style={{ '--c': CAT_COLOR[c] }}>
                <input type="checkbox" checked={d.category === c} onChange={() => set({ category: d.category === c ? '' : c })} />
                <span><em aria-hidden="true">{CAT_ICON[c]}</em>{c}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>Criteria / requirements
          <textarea rows={3} maxLength={1000} value={d.criteria}
            placeholder="What does it need to include? Rubric, page count, format…"
            onChange={e => set({ criteria: e.target.value })} />
        </label>
        <label>Notes &amp; extra info
          <textarea rows={3} maxLength={1000} value={d.notes}
            placeholder="Links, reminders, anything else you need to remember"
            onChange={e => set({ notes: e.target.value })} />
        </label>

        <div className="row between">
          <span className="row"><span className="muted small">Color</span>
            <ColorPicker value={d.color} onChange={color => set({ color })} /></span>
          <label className="radio"><input type="checkbox" checked={d.done}
            onChange={e => set({ done: e.target.checked })} /> Done</label>
        </div>

        <div className="row between">
          <button type="button" className="secondary danger"
            onClick={() => { onDelete(); onClose() }}>Delete task</button>
          <span className="row">
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit">Save</button>
          </span>
        </div>
      </form>
    </div>
  )
}
