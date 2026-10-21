const pad = n => String(n).padStart(2, '0')

// Local-time YYYY-MM-DD (not UTC), so "today" matches the user's clock.
export const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

// Weeks start on Monday.
export function startOfWeek(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return addDays(x, -((x.getDay() + 6) % 7))
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// The calendar views (planner, month, work-day picker) start their weeks on Sunday. Study stats and leaderboards still use the Monday week above.
export const CAL_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function startOfCalWeek(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return addDays(x, -x.getDay())
}

export function fmtMinutes(m) {
  const h = Math.floor(m / 60)
  const r = m % 60
  return h ? `${h}h ${r}m` : `${r}m`
}

export function fmtDay(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
