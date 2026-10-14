// Due-date reminders: what to say and when. (The component that shows them is DueReminders.jsx.)
// Per task that is not done and has a due date:
//   - the day before: "Due tomorrow"
//   - the day itself: "Due today" (with the time when there is one)
//   - with a due time: "Due in about N minutes" within the last hour, "Due in N minutes" within the last 10, "Due now"
//   - after the due time/date passed: "Overdue" (once a day, for up to a week)
// Each reminder is shown once (it is remembered on this device), so nothing repeats.
const KEY = 'lock-in-reminders'
const SEEN = 'lock-in-reminders-seen'

export const remindersOn = () => { try { return localStorage.getItem(KEY) !== '0' } catch { return true } }
export const setRemindersOn = on => { try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ } }

const pad = n => String(n).padStart(2, '0')
export const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const clock = t => new Date(`1970-01-01T${t}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export function readSeen() {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN) || '{}')
    const cutoff = Date.now() - 4 * 86400000
    return Object.fromEntries(Object.entries(all).filter(([, t]) => t > cutoff))
  } catch { return {} }
}
export function writeSeen(seen) { try { localStorage.setItem(SEEN, JSON.stringify(seen)) } catch { /* ignore */ } }

// -> [{ key, text, kind }] for reminders that are due right now and not shown yet
export function dueReminders(tasks, now = new Date(), seen = {}) {
  const today = isoOf(now), tomorrow = isoOf(addDays(now, 1)), weekAgo = isoOf(addDays(now, -7))
  const out = []
  for (const t of tasks) {
    if (t.done || !t.due_date) continue
    const title = t.title
    const at = t.due_time ? new Date(`${t.due_date}T${t.due_time}`) : null
    const mins = at ? Math.round((at - now) / 60000) : null
    const add = (kind, text) => {
      const daily = kind === 'today' || kind === 'tomorrow' || kind === 'overdue'
      const key = `${t.id}:${kind}:${daily ? today : 'x'}`
      if (!seen[key]) out.push({ key, text, kind })
    }
    if (at && t.due_date === today && mins !== null) {
      if (mins > 60) add('today', `Due today at ${clock(t.due_time)}: ${title}`)
      else if (mins > 10) add('hour', `Due in about ${mins} minutes: ${title}`)
      else if (mins > 0) add('soon', `Due in ${mins} minute${mins === 1 ? '' : 's'}: ${title}`)
      else if (mins >= -30) add('now', `Due now: ${title}`)
      else add('overdue', `Overdue: ${title}`)
    } else if (t.due_date === today) {
      add('today', `Due today: ${title}`)
    } else if (t.due_date === tomorrow) {
      add('tomorrow', `Due tomorrow${at ? ` at ${clock(t.due_time)}` : ''}: ${title}`)
    } else if (t.due_date < today && t.due_date >= weekAgo) {
      add('overdue', `Overdue: ${title}`)
    }
  }
  return out
}
