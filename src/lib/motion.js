import { useEffect, useState } from 'react'

// "Calm mode": switches off every animation and transition (the dock bobbing, drifting scenes, glows) and the
// frosted-glass blur, which is what makes busy backgrounds stutter on older phones.
// It is a per-device choice, remembered in this browser, and it is applied before the first paint.
// Until someone picks, it starts ON for devices that ask for less motion (the system "reduce motion" setting,
// data saver, or a very low-memory phone) and OFF everywhere else.
const KEY = 'lock-in-reduce-motion'
function deviceWantsCalm() {
  try {
    const nav = navigator
    return !!(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || nav.connection?.saveData
      || (nav.deviceMemory && nav.deviceMemory <= 2))
  } catch { return false }
}
const read = () => {
  try {
    const v = localStorage.getItem(KEY)
    return v === null ? deviceWantsCalm() : v === '1'
  } catch { return deviceWantsCalm() }
}
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
