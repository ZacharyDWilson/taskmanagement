import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fmtDay, isoDate } from '../lib/dates.js'

// While a task is being dragged, a small tray of big drop targets pops up (one per day of the shown week, plus
// "To plan"), and the rest of the page dims. Dropping on the tray works exactly like dropping on a column, but you
// don't have to aim at a small column, which is what makes dragging hard on a phone.
export default function DragTray({ columns, tasks, move }) {
  const [active, setActive] = useState(false)
  const [over, setOver] = useState(null)

  useEffect(() => {
    const start = e => {
      if (e.target instanceof Element && e.target.closest('.task')) setActive(true)
    }
    const stop = () => { setActive(false); setOver(null) }
    document.addEventListener('dragstart', start)
    document.addEventListener('dragend', stop)
    document.addEventListener('drop', stop)
    return () => {
      document.removeEventListener('dragstart', start)
      document.removeEventListener('dragend', stop)
      document.removeEventListener('drop', stop)
    }
  }, [])

  if (!active) return null

  const todayKey = isoDate(new Date())
  const targets = [
    ...columns.map(c => {
      const keys = c.dates.map(isoDate)
      return {
        id: c.title, key: keys[0], keys,
        label: c.title.slice(0, 3) === 'Wee' ? 'Weekend' : c.title.slice(0, 3),
        sub: c.dates.length > 1 ? `${c.dates[0].getDate()}–${c.dates[1].getDate()}` : String(c.dates[0].getDate()),
        today: keys.includes(todayKey),
      }
    }),
    { id: 'plan', key: null, keys: [], label: 'To plan', sub: 'unschedule' },
  ]

  function drop(e, t) {
    e.preventDefault()
    e.stopPropagation()
    const task = tasks.find(x => x.id === e.dataTransfer.getData('text/task-id'))
    setActive(false); setOver(null)
    if (!task) return
    if (t.key === null) { if (task.day) move(task, null) }
    else if (!t.keys.includes(task.day)) move(task, t.key)
  }

  return createPortal(
    <>
      <div className="drag-dim" aria-hidden="true" />
      <div className="drag-tray" role="group" aria-label="Drop the task on a day">
        <div className="drag-tray-title">Drop on a day <small>{fmtDay(columns[0].dates[0])} – {fmtDay(columns[columns.length - 1].dates.at(-1))}</small></div>
        <div className="drag-tray-row">
          {targets.map(t => (
            <div key={t.id}
              className={'drag-target' + (t.today ? ' today' : '') + (over === t.id ? ' over' : '') + (t.key === null ? ' plan' : '')}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== t.id) setOver(t.id) }}
              onDragEnter={e => { e.preventDefault(); setOver(t.id) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(o => (o === t.id ? null : o)) }}
              onDrop={e => drop(e, t)}>
              <strong>{t.label}</strong>
              <small>{t.sub}</small>
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body,
  )
}
