import { useEffect, useState } from 'react'
import { CATEGORIES } from '../lib/tasks.js'
import ColorPicker from './ColorPicker.jsx'
import { addDays, DAY_NAMES, isoDate, startOfWeek } from '../lib/dates.js'

const parseDay = k => new Date(k + 'T00:00:00')
const shortDay = k => parseDay(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

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
    plan_days: [...(task.plan_days ?? [])].sort(),
    due_date: task.due_date ?? '',
    due_time: task.due_time ? task.due_time.slice(0, 5) : '',
    criteria: task.criteria ?? '',
    notes: task.notes ?? '',
    color: task.color,
    done: task.done,
  })
  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const [workPick, setWorkPick] = useState('')
  const toggleWork = k => {
    if (k === d.day || k === d.due_date) return
    set({ plan_days: d.plan_days.includes(k) ? d.plan_days.filter(x => x !== k) : [...d.plan_days, k].sort().slice(0, 31) })
  }
  const addWork = () => { if (workPick && workPick !== d.day && workPick !== d.due_date && !d.plan_days.includes(workPick)) set({ plan_days: [...d.plan_days, workPick].sort().slice(0, 31) }); setWorkPick('') }
  // "every day until it is due": from the plan day (or today) up to the day before the deadline
  const fillUntilDue = () => {
    if (!d.due_date) return
    const from = parseDay(d.day && d.day > todayKey ? d.day : todayKey)
    const to = parseDay(d.due_date)
    const days = []
    for (let x = from; x < to && days.length < 31; x = addDays(x, 1)) { const k = isoDate(x); if (k !== d.day) days.push(k) }
    set({ plan_days: [...new Set([...d.plan_days, ...days])].sort().slice(0, 31) })
  }
  // the grid of days shown for picking work days: from today (or the earliest chosen day) to two weeks out or the last chosen day
  const marks = [d.day, d.due_date, ...d.plan_days].filter(Boolean).sort()
  const gridFrom = parseDay([todayKey, ...marks].sort()[0])
  const gridTo = parseDay([isoDate(addDays(new Date(), 13)), ...marks].sort().slice(-1)[0])
  const gridWeeks = []
  for (let w = startOfWeek(gridFrom); w <= gridTo && gridWeeks.length < 8; w = addDays(w, 7)) gridWeeks.push(w)
  // how this task will look on the calendar, in order
  const timeline = [
    ...(d.day ? [{ k: d.day, kind: 'plan' }] : []),
    ...d.plan_days.filter(k => k !== d.day && k !== d.due_date).map(k => ({ k, kind: 'work' })),
    ...(d.due_date ? [{ k: d.due_date, kind: 'due' }] : []),
  ].sort((a, b) => a.k.localeCompare(b.k) || (a.kind === 'due' ? 1 : -1))

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function save(e) {
    e.preventDefault()
    const sameWork = JSON.stringify(d.plan_days) === JSON.stringify([...(task.plan_days ?? [])].sort())
    onSave({
      ...(sameWork ? {} : { plan_days: d.plan_days }),   // only sent when changed, so saving still works before the database has the column
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

        {/* Everything about WHEN lives here, with the three kinds of day shown the way they look on the calendar. */}
        <fieldset className="sched-set">
          <legend>Schedule</legend>
          <div className="sched-key" aria-label="The three kinds of day">
            <span><b className="sk sk-plan">PLAN</b> the day you will do it</span>
            <span><b className="sk sk-work">WORK</b> extra days to chip away at it</span>
            <span><b className="sk sk-due">DUE</b> the deadline</span>
          </div>

          <div className="sched-now">
            <strong>On your calendar</strong>
            {timeline.length === 0
              ? <span className="muted small">Nothing yet. Pick a plan day, a due date or some work days below.</span>
              : <span className="sched-chips">{timeline.map(x => (
                <span key={x.kind + x.k} className={'sk-chip sk-' + x.kind}><b>{x.kind === 'plan' ? 'PLAN' : x.kind === 'work' ? 'WORK' : 'DUE'}</b>{shortDay(x.k)}{x.kind === 'due' && d.due_time ? ' · ' + d.due_time : ''}</span>
              ))}</span>}
          </div>

          <div className="sched-block">
            <h4><b className="sk sk-plan">PLAN</b> Do it on <strong className={'pick-summary' + (d.day ? ' set' : '')}>{plannedText(d.day)}</strong></h4>
            <div className="pick-days" role="radiogroup" aria-label="Plan day">
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
            <label className="inline-date">Another date
              <input type="date" value={d.day} onChange={e => set({ day: e.target.value })} />
            </label>
          </div>

          <div className="sched-block">
            <h4><b className="sk sk-due">DUE</b> Deadline</h4>
            <div className="form-grid">
              <label>Due date
                <input type="date" value={d.due_date} onChange={e => set({ due_date: e.target.value })} />
              </label>
              <label>Due time
                <input type="time" value={d.due_time} disabled={!d.due_date} onChange={e => set({ due_time: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="sched-block">
            <h4><b className="sk sk-work">WORK</b> Work days <strong className={'pick-summary' + (d.plan_days.length ? ' set' : '')}>{d.plan_days.length ? d.plan_days.length + ' picked' : 'None'}</strong></h4>
            <p className="muted small">Tap days to mark them as work days. They are extra days to work on this, on top of the plan day. Striped = picked.</p>
            <div className="wd-grid" role="group" aria-label="Pick work days">
              {DAY_NAMES.map(n => <span key={n} className="wd-dow">{n}</span>)}
              {gridWeeks.flatMap(w => Array.from({ length: 7 }, (_, i) => addDays(w, i))).map(date => {
                const key = isoDate(date)
                const isPlan = key === d.day, isDue = key === d.due_date, isWork = d.plan_days.includes(key)
                const outside = date < gridFrom || date > gridTo
                const locked = isPlan || isDue
                return (
                  <button key={key} type="button" disabled={outside && !isWork}
                    className={'wd-day' + (isPlan ? ' sk-plan' : '') + (isDue ? ' sk-due' : '') + (isWork ? ' sk-work' : '') + (key === todayKey ? ' today' : '') + (key < todayKey ? ' past' : '') + (outside ? ' outside' : '')}
                    aria-pressed={isWork} onClick={() => toggleWork(key)}
                    title={isPlan && isDue ? 'Plan day and due day' : isPlan ? 'This is the plan day. Change it above.' : isDue ? 'This is the due day. Change it above.' : isWork ? 'Work day. Tap to remove.' : 'Tap to make this a work day'}>
                    <span className="wd-n">{date.getDate()}</span>
                    <span className="wd-l">{isPlan && isDue ? 'PLAN·DUE' : isPlan ? 'PLAN' : isDue ? 'DUE' : isWork ? 'WORK' : ''}</span>
                    {locked ? null : null}
                  </button>
                )
              })}
            </div>
            <div className="row wd-actions">
              <button type="button" className="secondary" onClick={fillUntilDue} disabled={!d.due_date}
                title={d.due_date ? 'Mark every day from the plan day (or today) until the day before it is due' : 'Set a due date first'}>Every day until it is due</button>
              <button type="button" className="secondary" onClick={() => set({ plan_days: [] })} disabled={d.plan_days.length === 0}>Clear work days</button>
            </div>
            <div className="row wd-add">
              <label className="inline-date">A day further out
                <input type="date" value={workPick} onChange={e => setWorkPick(e.target.value)} />
              </label>
              <button type="button" className="secondary" onClick={addWork} disabled={!workPick}>Add as work day</button>
            </div>
          </div>
        </fieldset>

        <label>Class / subject
          <input value={d.course} maxLength={60} list="modal-courses" placeholder="e.g. Biology 101"
            onChange={e => set({ course: e.target.value })} />
          <datalist id="modal-courses">{courses.map(c => <option key={c} value={c} />)}</datalist>
        </label>

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
