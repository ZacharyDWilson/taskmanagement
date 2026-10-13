import { useCallback, useState } from 'react'

// Ways to see the timer. Plain is free; the rest are bought with coins in the Shop (item id "timer-<id>").
export const TIMER_STYLES = [
  { id: 'plain',     name: 'Plain',        blurb: 'Just the numbers.' },
  { id: 'bar',       name: 'Progress bar', blurb: 'A bar that fills as you go.' },
  { id: 'digital',   name: 'Digital',      blurb: 'A glowing LCD display.' },
  { id: 'ring',      name: 'Ring',         blurb: 'A circle that closes.' },
  { id: 'analog',    name: 'Analog',       blurb: 'A dial with a shrinking wedge.' },
  { id: 'flip',      name: 'Flip clock',   blurb: 'Cards that flip each second.' },
  { id: 'hourglass', name: 'Hourglass',    blurb: 'Sand falling grain by grain.' },
  { id: 'garden',    name: 'Garden',       blurb: 'A seed that grows while you focus.' },
  // the Tech Set and the Desk Set (also sold as bundles)
  { id: 'neon',      name: 'Neon',         blurb: 'A glowing sign that closes its loop.' },
  { id: 'battery',   name: 'Battery',      blurb: 'Drains as you go, or charges while you count up.' },
  { id: 'rocket',    name: 'Rocket',       blurb: 'A rocket flying to the moon.' },
  { id: 'candle',    name: 'Candle',       blurb: 'Burns down while you focus.' },
  { id: 'vinyl',     name: 'Vinyl',        blurb: 'A record that plays while you work.' },
  { id: 'sunrise',   name: 'Sunrise',      blurb: 'The sun climbs over the hills.' },
]
export const timerItemId = id => `timer-${id}`

const KEY = 'lock-in-timer-style'
const read = () => { try { return localStorage.getItem(KEY) || 'plain' } catch { return 'plain' } }

// `owned` is the set of shop item ids you own. `unlockAll` is for the admin dev build.
export function useTimerStyle(owned, unlockAll = false) {
  const [id, setId] = useState(read)
  const unlocked = s => s.id === 'plain' || unlockAll || owned.has(timerItemId(s.id))
  const current = TIMER_STYLES.find(s => s.id === id && unlocked(s)) ?? TIMER_STYLES[0]
  const choose = useCallback(next => {
    setId(next)
    try { localStorage.setItem(KEY, next) } catch { /* private mode: fine */ }
  }, [])
  return { current, choose, unlocked }
}
