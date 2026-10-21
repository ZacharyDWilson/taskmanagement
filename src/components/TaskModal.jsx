import { useEffect, useState } from 'react'
import { CATEGORIES } from '../lib/tasks.js'
import ColorPicker from './ColorPicker.jsx'
import { addDays, CAL_DAY_NAMES, isoDate, startOfCalWeek } from '../lib/dates.js'

const parseDay = k => new Date(k + 'T00:00:00')
const shortDay = k => parseDay(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

const CAT_ICON = { Homework: '📝', Exam: '🎯', Project: '🛠️', Reading: '📖', Study: '🧠', Work: '💼', Personal: '🌱', Other: '✨' }
const CAT_COLOR = { Homework: '#3b82f6', Exam: '#ef4444', Project: '#a855f7', Reading: '#14b8a6', Study: '#f59e0b', Work: '#64748b', Personal: '#22c55e', Other: '#ec4899' }
const todayKey = isoDate(new Date())
// Detail pop-up: what it's for, when it's due, the requirements, and any extra info.
export default function TaskModal({ task, courses, onSave, onDelete, onClose }) {
  const [d, setD] = useState({
    title: task.title,
    course: task.course ?? '',
    category: task.category ?? '',
    work: [...new Set([task.day, ...(task.plan_days ?? [])].filter(Boolean))].sort(),   // every day you will work on it (the first one is stored as its main day)
    notes: { ...(task.plan_notes ?? {}) },   // what you will do on each work day, by date
    due_date: task.due_date ?? '',
    due_time: task.due_time ? task.due_time.slice(0, 5) : '',
    criteria: task.criteria ?? '',
    notes: task.notes ?? '',
    color: task.color,
    done: task.done,
  })
  const set = patch => setD(prev => ({ ...prev, ...patch }))
  const [workPick, setWorkPick] = useState('')
  const toggleWork = k => set({ work: d.work.includes(k) ? d.work.filter(x => x !== k) : [...d.work, k].sort().slice(0, 32) })
  const addWork = () => { if (workPick && !d.work.includes(workPick)) set({ work: [...d.work, workPick].sort().slice(0, 32) }); setWorkPick('') }
  // "every day until it is due": from today (or the first work day) up to the day before the deadline
  const fillUntilDue = () => {
    if (!d.due_date) return
    const from = parseDay(d.work[0] && d.work[0] > todayKey ? d.work[0] : todayKey)
    const to = parseDay(d.due_date)
    const days = []
    for (let x = from; x < to && days.length < 31; x = addDays(x, 1)) days.push(isoDate(x))
    set({ work: [...new Set([...d.work, ...days])].sort().slice(0, 32) })
  }
  // the grid of days shown for picking: from today (or the earliest chosen day) to two weeks out or the last chosen day
  const marks = [d.due_date, ...d.work].filter(Boolean).sort()
  const gridFrom = parseDay([todayKey, ...marks].sort()[0])
  const gridTo = parseDay([isoDate(addDays(new Date(), 13)), ...marks].sort().slice(-1)[0])
  const gridWeeks = []
  for (let w = startOfCalWeek(gridFrom); w <= gridTo && gridWeeks.length < 8; w = addDays(w, 7)) gridWeeks.push(w)
  // how this task will look on the calendar, in order
  const timeline = [
    ...d.work.filter(k => k !== d.due_date).map(k => ({ k, kind: 'work' })),
    ...(d.due_date ? [{ k: d.due_date, kind: 'due' }] : []),
  ].sort((a, b) => a.k.localeCompare(b.k) || (a.kind === 'due' ? 1 : -1))

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function save(e) {
    e.preventDefault()
    // the first work day is stored as the task's main day, the rest as extra days. Untouched work days are left exactly as they were.
    const before = [...new Set([task.day, ...(task.plan_days ?? [])].filter(Boolean))].sort()
    const touched = JSON.stringify(before) !== JSON.stringify(d.work)
    const cleanNotes = Object.fromEntries(d.work.map(k => [k, (d.notes[k] ?? '').trim()]).filter(([, v]) => v))   // only for days that are still work days
    const sortedObj = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]))
    const notesChanged = sortedObj(cleanNotes) !== sortedObj(task.plan_notes ?? {})
    onSave({
      ...(touched ? { day: d.work[0] ?? null, plan_days: d.work.slice(1) } : {}),
      ...(notesChanged ? { plan_notes: cleanNotes } : {}),   // only sent when changed, so saving still works before the database has the column   // plan_days is only sent when changed, so saving still works before the database has the column
      title: d.title.trim() || task.title,
      course: d.course.trim(),
      category: d.category,
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

        {/* Everything about WHEN lives here: the days you will work on it, and the deadline. */}
        <fieldset className="sched-set">
          <legend>Schedule</legend>
          <div className="sched-key" aria-label="The two kinds of day">
            <span><b className="sk sk-work">WORK</b> a day you will work on it (pick as many as you like)</span>
            <span><b className="sk sk-due">DUE</b> the deadline</span>
          </div>

          <div className="sched-now">
            <strong>On your calendar</strong>
            {timeline.length === 0
              ? <span className="muted small">Nothing yet. Tap the days you will work on this, and set a due date.</span>
              : <span className="sched-chips">{timeline.map(x => (
                <span key={x.kind + x.k} className={'sk-chip sk-' + x.kind}><b>{x.kind === 'work' ? 'WORK' : 'DUE'}</b>{shortDay(x.k)}{x.kind === 'due' && d.due_time ? ' · ' + d.due_time : ''}</span>
              ))}</span>}
          </div>

          <div className="sched-block">
            <h4><b className="sk sk-work">WORK</b> Work days <strong className={'pick-summary' + (d.work.length ? ' set' : '')}>{d.work.length ? d.work.length + (d.work.length === 1 ? ' day' : ' days') : 'None yet'}</strong></h4>
            <p className="muted small">Tap each day you will work on this. Doing half one day and half another? Pick both. It shows on all of them.</p>
            <div className="wd-grid" role="group" aria-label="Pick work days">
              {CAL_DAY_NAMES.map(n => <span key={n} className="wd-dow">{n}</span>)}
              {gridWeeks.flatMap(w => Array.from({ length: 7 }, (_, i) => addDays(w, i))).map(date => {
                const key = isoDate(date)
                const isDue = key === d.due_date, isWork = d.work.includes(key)
                const outside = date < gridFrom || date > gridTo
                return (
                  <button key={key} type="button" disabled={outside && !isWork}
                    className={'wd-day' + (isDue ? ' sk-due' : '') + (isWork ? ' sk-work' : '') + (key === todayKey ? ' today' : '') + (key < todayKey ? ' past' : '') + (outside ? ' outside' : '')}
                    aria-pressed={isWork} onClick={() => toggleWork(key)}
                    title={isWork ? 'Work day. Tap to remove.' : isDue ? 'Due day. Tap to also work on it that day.' : 'Tap to work on it this day'}>
                    <span className="wd-n">{date.getDate()}</span>
                    <span className="wd-l">{isWork && isDue ? 'WORK·DUE' : isDue ? 'DUE' : isWork ? 'WORK' : ''}</span>
                  </button>
                )
              })}
            </div>
            {d.work.length > 0 && (
              <div className="wd-notes">
                <h5>What will you do each day? <small className="muted">(optional)</small></h5>
                {d.work.map(k => (
                  <label key={k} className="wd-note">
                    <span className="wd-note-day"><b className="sk sk-work">WORK</b>{shortDay(k)}</span>
                    <input value={d.notes[k] ?? ''} maxLength={140} placeholder="e.g. Read chapters 1 to 3 and take notes"
                      onChange={e => set({ notes: { ...d.notes, [k]: e.target.value } })} />
                  </label>
                ))}
              </div>
            )}
            <div className="row wd-actions">
              <button type="button" className="secondary" onClick={fillUntilDue} disabled={!d.due_date}
                title={d.due_date ? 'Mark every day from today (or your first work day) until the day before it is due' : 'Set a due date first'}>Every day until it is due</button>
              <button type="button" className="secondary" onClick={() => set({ work: [] })} disabled={d.work.length === 0}>Clear work days</button>
            </div>
            <div className="row wd-add">
              <label className="inline-date">A day further out
                <input type="date" value={workPick} onChange={e => setWorkPick(e.target.value)} />
              </label>
              <button type="button" className="secondary" onClick={addWork} disabled={!workPick}>Add as work day</button>
            </div>
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
