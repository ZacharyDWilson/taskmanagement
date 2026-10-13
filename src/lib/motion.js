import { useEffect, useState } from 'react'

// "Calm mode": switches off every animation and transition (the dock bobbing, drifting scenes, glows).
// It is a per-device choice, remembered in this browser, and it is applied before the first paint.
const KEY = 'lock-in-reduce-motion'
const read = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }
const apply = on => { document.documentElement.dataset.motion = on ? 'reduced' : 'full' }

apply(read())

export function setReducedMotion(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
  apply(on)
  window.dispatchEvent(new Event('lock-in:motion'))
}

export function useReducedMotion() {
  const [on, setOn] = useState(read)
  useEffect(() => {
    const sync = () => setOn(read())
    window.addEventListener('lock-in:motion', sync)
    return () => window.removeEventListener('lock-in:motion', sync)
  }, [])
  return [on, setReducedMotion]
}
